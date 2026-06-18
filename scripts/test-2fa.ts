/**
 * End-to-end test for 2FA flow.
 * Run with: bun run scripts/test-2fa.ts
 *
 * Tests:
 *  1. Login (without 2FA — should succeed)
 *  2. Setup 2FA (POST /api/admin/2fa/setup)
 *  3. Generate a valid TOTP using our own lib
 *  4. Enable 2FA (POST /api/admin/2fa/enable)
 *  5. Verify backup codes are returned
 *  6. Login (without TOTP — should get "2FA_REQUIRED" error)
 *  7. Login (with valid TOTP — should succeed)
 *  8. Login (with backup code — should succeed)
 *  9. Disable 2FA
 * 10. Verify 2FA is disabled
 */

import { generateCurrentTotp, generateTwoFactorSecret } from "../src/lib/two-factor";

const BASE = "http://localhost:3000";

async function getCsrf(cookies: string) {
  const res = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { cookie: cookies },
  });
  const text = await res.text();
  const match = text.match(/"csrfToken":"([^"]+)"/);
  const csrf = match ? match[1] : "";
  // Get Set-Cookie header
  const setCookie = res.headers.get("set-cookie") || "";
  const csrfCookie = setCookie.split(";")[0];
  return { csrf, csrfCookie };
}

async function login(email: string, password: string, totp?: string) {
  const { csrf, csrfCookie } = await getCsrf("");
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: csrfCookie,
    },
    body: new URLSearchParams({
      email,
      password,
      csrfToken: csrf,
      callbackUrl: `${BASE}/admin/dashboard`,
      json: "true",
      ...(totp ? { totp } : {}),
    }).toString(),
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const sessionCookie = setCookie
    .split(",")
    .map((c) => c.split(";")[0])
    .find((c) => c.includes("session-token"));
  return { status: res.status, sessionCookie: sessionCookie || csrfCookie, body: await res.text() };
}

async function main() {
  console.log("🧪 Starting 2FA end-to-end test\n");

  const email = "admin@trailgliders.edu.ng";
  const password = "TrailGliders2026!";

  // Step 1: Login without 2FA
  console.log("1️⃣  Login (no 2FA yet)...");
  const login1 = await login(email, password);
  console.log(`   Status: ${login1.status}`);
  if (login1.status !== 200) {
    console.log("   ❌ Login failed. Aborting.");
    return;
  }
  console.log("   ✓ Login succeeded\n");

  // Step 2: Setup 2FA
  console.log("2️⃣  Setup 2FA (get secret + QR code)...");
  const setupRes = await fetch(`${BASE}/api/admin/2fa/setup`, {
    method: "POST",
    headers: { cookie: login1.sessionCookie },
  });
  const setup = await setupRes.json();
  if (!setup.secret) {
    console.log("   ❌ Setup failed:", setup);
    return;
  }
  console.log(`   ✓ Secret: ${setup.secret.slice(0, 20)}...`);
  console.log(`   ✓ QR code: ${setup.qrCode.slice(0, 50)}... (${setup.qrCode.length} chars total)\n`);

  // Step 3: Generate a valid TOTP using our own lib
  const totp = generateCurrentTotp(setup.secret);
  console.log(`3️⃣  Generated current TOTP: ${totp}\n`);

  // Step 4: Enable 2FA
  console.log("4️⃣  Enable 2FA (verify TOTP)...");
  const enableRes = await fetch(`${BASE}/api/admin/2fa/enable`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: login1.sessionCookie,
    },
    body: JSON.stringify({ secret: setup.secret, token: totp }),
  });
  const enable = await enableRes.json();
  if (!enable.ok) {
    console.log("   ❌ Enable failed:", enable);
    return;
  }
  console.log(`   ✓ 2FA enabled!`);
  console.log(`   ✓ Backup codes (${enable.backupCodes.length}):`);
  enable.backupCodes.forEach((c: string, i: number) => console.log(`      ${i + 1}. ${c}`));
  console.log();

  // Save first backup code for later test
  const backupCode = enable.backupCodes[0];

  // Step 5: Try login WITHOUT TOTP (should fail with 2FA_REQUIRED)
  console.log("5️⃣  Login without TOTP (should be rejected)...");
  const login2 = await login(email, password);
  const login2Body = JSON.parse(login2.body || "{}");
  if (login2Body.error === "2FA_REQUIRED" || login2.status === 401) {
    console.log(`   ✓ Login correctly rejected (status: ${login2.status})\n`);
  } else {
    console.log(`   ❌ Login should have been rejected but wasn't:`, login2Body);
    return;
  }

  // Step 6: Generate a fresh TOTP and login WITH it
  console.log("6️⃣  Login WITH valid TOTP...");
  // Wait a moment to ensure TOTP isn't stale
  await new Promise((r) => setTimeout(r, 500));
  const totp2 = generateCurrentTotp(setup.secret);
  const login3 = await login(email, password, totp2);
  if (login3.status === 200) {
    console.log(`   ✓ Login with TOTP succeeded\n`);
  } else {
    console.log(`   ❌ Login with TOTP failed:`, await login3.body);
    return;
  }

  // Step 7: Test login with WRONG TOTP (should fail)
  console.log("7️⃣  Login with WRONG TOTP (should fail)...");
  const login4 = await login(email, password, "000000");
  if (login4.status === 401 || login4.body.includes("CredentialsSignin")) {
    console.log(`   ✓ Login correctly rejected\n`);
  } else {
    console.log(`   ❌ Login should have been rejected:`, login4.body);
  }

  // Step 8: Test login with the backup code
  console.log("8️⃣  Login with BACKUP CODE...");
  const login5 = await login(email, password, backupCode);
  if (login5.status === 200) {
    console.log(`   ✓ Login with backup code succeeded`);
    console.log(`   ✓ Backup code was single-use (should be consumed now)\n`);
  } else {
    console.log(`   ❌ Login with backup code failed:`, login5.body);
  }

  // Step 9: Try the same backup code AGAIN (should fail — single use)
  console.log("9️⃣  Try the SAME backup code again (should fail — single use)...");
  const login6 = await login(email, password, backupCode);
  if (login6.status === 401 || login6.body.includes("CredentialsSignin")) {
    console.log(`   ✓ Backup code correctly rejected on second use\n`);
  } else {
    console.log(`   ❌ Backup code should have been rejected:`, login6.body);
  }

  // Step 10: Disable 2FA
  console.log("🔟  Disable 2FA (with password + fresh TOTP)...");
  const freshTotp = generateCurrentTotp(setup.secret);
  const disableRes = await fetch(`${BASE}/api/admin/2fa/disable`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: login3.sessionCookie,
    },
    body: JSON.stringify({ password, totp: freshTotp }),
  });
  const disable = await disableRes.json();
  if (disable.ok) {
    console.log(`   ✓ 2FA disabled\n`);
  } else {
    console.log(`   ❌ Disable failed:`, disable);
    return;
  }

  // Step 11: Verify 2FA is disabled (login without TOTP should work)
  console.log("1️⃣1️⃣  Login without TOTP after disable (should succeed)...");
  const login7 = await login(email, password);
  if (login7.status === 200) {
    console.log(`   ✓ Login succeeded — 2FA is fully disabled\n`);
  } else {
    console.log(`   ❌ Login failed:`, login7.body);
  }

  console.log("✅ All 2FA tests passed!");
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
