import { describe, expect, it } from "vitest";
import { migratedHrGlobalSettings, migrateStoredDefaultCurrency } from "./hr-workforce-persist-migrate";

describe("hr-workforce-persist-migrate", () => {
  it("migrates USD default currency to SAR", () => {
    expect(migrateStoredDefaultCurrency("USD")).toBe("SAR");
    expect(migratedHrGlobalSettings({ defaultCurrency: "USD" }).defaultCurrency).toBe("SAR");
  });
});
