/**
 * Legacy flat /service-architecture/* routes only render redirect stubs; no
 * shell.
 */
export default function ServiceArchitectureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
