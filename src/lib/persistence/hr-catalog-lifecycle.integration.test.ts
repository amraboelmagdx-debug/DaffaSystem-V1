import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const ORG = "00000000-0000-4000-8000-0000000000aa";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

describe("HR catalog persistence lifecycle (integration)", () => {
  beforeEach(() => {
    loadEnvLocal();
  });

  afterEach(() => {
    /* env restored by vitest worker isolation */
  });

  it("writes marker role to hr_workforce_catalog and reads it back", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data: row } = await supabase
      .from("hr_workforce_catalog")
      .select("payload")
      .eq("organization_id", ORG)
      .maybeSingle();

    const base =
      row?.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? structuredClone(row.payload as Record<string, unknown>)
        : {
            businessUnits: [{ id: "bu_1", name: "Main", isActive: true, createdAt: "", updatedAt: "" }],
            departments: [
              {
                id: "dept_1",
                businessUnitId: "bu_1",
                name: "Dept",
                isActive: true,
                createdAt: "",
                updatedAt: "",
              },
            ],
            teams: [],
            roles: [],
            hrGlobalSettings: {
              workingDaysPerWeek: 5,
              workingHoursPerDay: 8,
              weeksPerYear: 52,
              offDaysPerYear: 0,
              defaultCurrency: "USD",
            },
            ohManualByBusinessUnitId: {},
            importLogs: [],
            snapshots: [],
          };

    const marker = `EFP_VITEST_${Date.now()}`;
    const roles = Array.isArray(base.roles) ? [...base.roles] : [];
    roles.push({
      id: "__efp_vitest_role__",
      businessUnitId: "bu_1",
      departmentId: "dept_1",
      teamId: null,
      name: marker,
      employmentType: "full_time",
      employeeCount: 1,
      currency: "USD",
      avgMonthlySalary: 1,
      avgMonthlySocialInsurance: 0,
      annualMedicalInsurance: 0,
      annualEndOfServiceCost: 0,
      riskFactorPct: 0,
      isBillable: true,
      includeInOhAllocation: true,
      additionalCosts: [],
    });

    const testPayload = { ...base, roles };
    await supabase.from("hr_workforce_catalog").upsert(
      {
        organization_id: ORG,
        payload: testPayload,
        engine_version: "1",
        updated_by: "00000000-0000-4000-8000-000000000099",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );

    const { data: loaded } = await supabase
      .from("hr_workforce_catalog")
      .select("payload")
      .eq("organization_id", ORG)
      .single();

    const names = ((loaded?.payload as { roles?: { name?: string }[] })?.roles ?? []).map(
      (r) => r.name
    );
    expect(names).toContain(marker);

    const cleaned = {
      ...testPayload,
      roles: roles.filter((r) => (r as { id?: string }).id !== "__efp_vitest_role__"),
    };
    await supabase.from("hr_workforce_catalog").upsert(
      {
        organization_id: ORG,
        payload: row?.payload ?? cleaned,
        engine_version: "1",
        updated_by: "00000000-0000-4000-8000-000000000099",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );
  });
});
