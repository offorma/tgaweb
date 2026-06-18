// Empty layout for auth routes (login) — bypasses the admin shell
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
