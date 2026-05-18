import type { EfpPlatformDebug } from "@/lib/persistence/platform-persistence-debug";

declare global {
  interface Window {
    __EFP_PLATFORM_DEBUG?: EfpPlatformDebug & {
      getSnapshot?: () => EfpPlatformDebug;
    };
  }
}

export {};
