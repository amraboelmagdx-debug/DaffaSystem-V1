import { ServiceArchitectureSubnav } from "@/components/service-architecture/service-architecture-subnav";

export default function ServiceArchitectureLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1440px] space-y-2 p-4 md:p-8">
      <ServiceArchitectureSubnav />
      {children}
    </div>
  );
}

