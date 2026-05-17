import { AppShell } from "@/components/layout/app-shell";
import { TenantPersistenceProvider } from "@/components/providers/tenant-persistence-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TenantPersistenceProvider>
      <AppShell>{children}</AppShell>
    </TenantPersistenceProvider>
  );
}
