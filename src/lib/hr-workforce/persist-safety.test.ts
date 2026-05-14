import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("persist-safety", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("blocks disk API on server when NODE_ENV is production", async () => {
    process.env = { ...env, NODE_ENV: "production", VERCEL_ENV: "preview" };
    const { isHrWorkforceDiskApiAllowedOnServer } = await import("./persist-safety");
    expect(isHrWorkforceDiskApiAllowedOnServer()).toBe(false);
  });

  it("blocks disk API on server on Vercel production", async () => {
    process.env = { ...env, NODE_ENV: "development", VERCEL_ENV: "production" };
    const { isHrWorkforceDiskApiAllowedOnServer } = await import("./persist-safety");
    expect(isHrWorkforceDiskApiAllowedOnServer()).toBe(false);
  });

  it("allows disk API on server in development", async () => {
    process.env = { ...env, NODE_ENV: "development", VERCEL_ENV: "development" };
    const { isHrWorkforceDiskApiAllowedOnServer } = await import("./persist-safety");
    expect(isHrWorkforceDiskApiAllowedOnServer()).toBe(true);
  });

  it("allows disk API on server in test when HR_WORKFORCE_DISK_SYNC=1", async () => {
    process.env = { ...env, NODE_ENV: "test", HR_WORKFORCE_DISK_SYNC: "1" };
    const { isHrWorkforceDiskApiAllowedOnServer } = await import("./persist-safety");
    expect(isHrWorkforceDiskApiAllowedOnServer()).toBe(true);
  });

  it("hybrid client mirror only in development bundle", async () => {
    process.env = { ...env, NODE_ENV: "development" };
    const { isHrWorkforceHybridDiskMirrorEnabledOnClient } = await import("./persist-safety");
    expect(isHrWorkforceHybridDiskMirrorEnabledOnClient()).toBe(true);
  });

  it("hybrid client mirror off in production bundle", async () => {
    process.env = { ...env, NODE_ENV: "production" };
    const { isHrWorkforceHybridDiskMirrorEnabledOnClient } = await import("./persist-safety");
    expect(isHrWorkforceHybridDiskMirrorEnabledOnClient()).toBe(false);
  });
});
