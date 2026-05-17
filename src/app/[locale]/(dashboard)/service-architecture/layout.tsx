import { ServiceArchitectureShell } from "@/components/service-architecture/service-architecture-shell";

export default function ServiceArchitectureLayout({ children }: { children: React.ReactNode }) {
  return <ServiceArchitectureShell>{children}</ServiceArchitectureShell>;
}
