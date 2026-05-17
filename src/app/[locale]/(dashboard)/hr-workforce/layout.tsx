import { HrWorkforceSubnav } from "@/components/hr-workforce/hr-workforce-subnav";
import { HrWorkforcePersistBar } from "@/components/hr-workforce/hr-workforce-persist-bar";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";

export default function HrWorkforceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1440px] space-y-2 p-4 md:p-8">
      <HrWorkforceSubnav />
      <HrWorkforcePersistBar />
      <SampleDataPanel moduleId="hr-workforce" />
      {children}
    </div>
  );
}
