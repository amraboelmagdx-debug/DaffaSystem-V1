import { UnitContextProvider } from "@/components/operational-workspace/unit-context-provider";

type Props = {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
};

export default async function UnitLayout({ children, params }: Props) {
  const { companyId } = await params;
  return (
    <UnitContextProvider companyId={companyId}>{children}</UnitContextProvider>
  );
}
