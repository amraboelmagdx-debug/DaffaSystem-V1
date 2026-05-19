import { UnitContextBanner } from "@/components/operational-workspace/unit-context-banner";
import { UNIT_MODULE_CONTAINER_CLASS } from "@/config/unit-module-layout";

export default function UnitSalesPlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={UNIT_MODULE_CONTAINER_CLASS}>
      <UnitContextBanner showHoldingLink={false} />
      {children}
    </div>
  );
}
