import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  // Enforce post-login security gates:
  //   1. If mustEnable2FA is set, redirect to /admin/settings → Security tab
  //      (they can navigate freely within /admin/* but we nudge them to enable 2FA)
  //   2. If mustChangePassword is set, redirect to /admin/settings → Security tab
  //
  // Note: We don't hard-block because they need to be able to access the settings
  // page itself. The Settings page shows prominent banners when these flags are set.
  //
  // For stricter enforcement (block all access until resolved), uncomment the
  // redirects below.

  /*
  const path = ... // would need to be passed from request
  if (session.user?.mustEnable2FA && !path.startsWith("/admin/settings")) {
    redirect("/admin/settings?tab=security&action=enable-2fa");
  }
  if (session.user?.mustChangePassword && !path.startsWith("/admin/settings")) {
    redirect("/admin/settings?tab=security&action=change-password");
  }
  */

  return (
    <AdminShell userRole={(session.user as any)?.role}>{children}</AdminShell>
  );
}
