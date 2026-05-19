/**
 * Legacy flat /hr-workforce/* routes only render redirect stubs; no subnav.
 */
export default function HrWorkforceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
