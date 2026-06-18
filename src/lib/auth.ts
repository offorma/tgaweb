import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import {
  verifyPassword,
  recordFailedLogin,
  recordSuccessfulLogin,
  getLockoutRemaining,
  writeAuditLog,
} from "@/lib/auth-utils";
import {
  verifyTwoFactorToken,
  decryptTwoFactorSecret,
  decryptBackupCodes,
  verifyBackupCode,
  encryptBackupCodes,
} from "@/lib/two-factor";

export const authOptions: NextAuthOptions = {
  // Use JWT session strategy — works for stateless deployments
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // refresh token every hour
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: undefined,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "2FA Code", type: "text" }, // optional — required only when 2FA enabled
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const ip =
          req?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
          req?.headers?.get?.("x-real-ip")?.trim() ||
          "unknown";
        const userAgent = req?.headers?.get?.("user-agent") || "unknown";

        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          await writeAuditLog({
            action: "login.invalid-email",
            ip,
            userAgent,
            meta: email,
          });
          return null;
        }

        // Password length sanity check (prevent timing attacks on length)
        if (credentials.password.length < 8) {
          await writeAuditLog({
            action: "login.short-password",
            ip,
            userAgent,
            meta: email,
          });
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });

        // Always run a hash compare even if user not found — prevents user enumeration via timing
        const dummyHash =
          "$2a$12$abcdefghijklmnopqrstuuKlQ4T8NqL8/0sH0eT8NqL8/0sH0eT8NqL8/0sH0e";
        const passwordMatches = user
          ? await verifyPassword(credentials.password, user.passwordHash)
          : await verifyPassword(credentials.password, dummyHash);

        if (!user || !passwordMatches) {
          if (user) await recordFailedLogin(user.id);
          await writeAuditLog({
            action: "login.failed",
            userId: user?.id,
            ip,
            userAgent,
            meta: email,
          });
          return null;
        }

        // Check if account is active
        if (!user.isActive) {
          await writeAuditLog({
            action: "login.inactive",
            userId: user.id,
            ip,
            userAgent,
          });
          return null;
        }

        // Check lockout
        const lockRemaining = await getLockoutRemaining(user.id);
        if (lockRemaining > 0) {
          await writeAuditLog({
            action: "login.locked",
            userId: user.id,
            ip,
            userAgent,
            meta: `locked for ${lockRemaining}s`,
          });
          return null;
        }

        // Check security policy for 2FA enforcement
        // If the policy requires 2FA for this user's role AND they don't have it enabled,
        // set mustEnable2FA on them so the post-login interceptor redirects them to setup.
        const policy = await db.securityPolicy.findUnique({ where: { id: "singleton" } });
        const requires2FAByPolicy =
          (user.role === "ADMIN" && policy?.enforceTwoFactorForAdmins) ||
          (user.role === "EDITOR" && policy?.enforceTwoFactorForEditors);

        if (requires2FAByPolicy && !user.twoFactorEnabled) {
          // Flag them for forced 2FA setup
          await db.user.update({
            where: { id: user.id },
            data: { mustEnable2FA: true },
          });
          user.mustEnable2FA = true;
        }

        // ============ 2FA verification ============
        // If 2FA is enabled on the account, the user MUST provide a valid TOTP code
        // (6 digits) or a backup code (XXXX-XXXX format). If no code is provided,
        // we throw a special error that the client detects to show the 2FA form.
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const totp = (credentials.totp || "").trim();

          if (!totp) {
            // Signal to the client that 2FA is required
            const err: any = new Error("2FA_REQUIRED");
            err.code = "2FA_REQUIRED";
            throw err;
          }

          let verified = false;

          // Try as TOTP code first (6 digits)
          if (/^\d{6}$/.test(totp)) {
            try {
              const secret = decryptTwoFactorSecret(user.twoFactorSecret);
              if (verifyTwoFactorToken(totp, secret)) {
                verified = true;
              }
            } catch {
              // ignore decryption errors
            }
          }

          // Try as backup code (XXXX-XXXX format) if TOTP didn't match
          if (!verified && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(totp.toUpperCase())) {
            if (user.twoFactorBackupCodes) {
              try {
                const hashedCodes = decryptBackupCodes(user.twoFactorBackupCodes);
                const idx = verifyBackupCode(totp, hashedCodes);
                if (idx >= 0) {
                  // Remove the used backup code
                  const remaining = hashedCodes.filter((_, i) => i !== idx);
                  const reencrypted = encryptBackupCodes(remaining);
                  await db.user.update({
                    where: { id: user.id },
                    data: { twoFactorBackupCodes: reencrypted },
                  });
                  verified = true;
                  await writeAuditLog({
                    userId: user.id,
                    action: "login.2fa.backup-code-used",
                    ip,
                    userAgent,
                  });
                }
              } catch {
                // ignore
              }
            }
          }

          if (!verified) {
            await recordFailedLogin(user.id);
            await writeAuditLog({
              userId: user.id,
              action: "login.2fa.failed",
              ip,
              userAgent,
            });
            return null;
          }

          await writeAuditLog({
            userId: user.id,
            action: "login.2fa.success",
            ip,
            userAgent,
          });
        }

        await recordSuccessfulLogin(user.id);
        await writeAuditLog({
          action: "login.success",
          userId: user.id,
          ip,
          userAgent,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.mustEnable2FA = (user as any).mustEnable2FA;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).mustEnable2FA = token.mustEnable2FA;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      // Only allow admin users (any role) into /admin
      if (path.startsWith("/admin") && path !== "/admin/login") {
        return !!auth;
      }
      return true;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  // Use nested NextAuth route under /api/auth/[...nextauth]
  secret: process.env.NEXTAUTH_SECRET,
};
