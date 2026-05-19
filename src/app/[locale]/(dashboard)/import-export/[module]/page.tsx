import { notFound } from "next/navigation";
import { ImportModuleWizard } from "@/components/import-engine/import-module-wizard";

const KNOWN_MODULES = new Set([
  "hr-workforce",
  "service-architecture",
  "sales-plan",
  "incentives",
]);

export default async function ImportModulePage({
  params,
}: {
  params: Promise<{ module: string; locale: string }>;
}) {
  const { module: moduleId } = await params;
  if (!KNOWN_MODULES.has(moduleId)) {
    notFound();
  }
  return <ImportModuleWizard moduleId={moduleId} />;
}
