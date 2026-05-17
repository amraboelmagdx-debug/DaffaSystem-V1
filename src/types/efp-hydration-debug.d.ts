import type { EfpHrHydrationDebug } from "@/lib/persistence/hr-hydration-debug";

declare global {
  interface Window {
    __EFP_HR_HYDRATION_DEBUG?: EfpHrHydrationDebug & {
      getSnapshot?: () => EfpHrHydrationDebug;
    };
  }
}

export {};
