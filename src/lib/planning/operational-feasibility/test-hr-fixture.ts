import { newHrId } from "@/lib/hr-workforce/id";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import type { HrWorkforceSnapshot } from "@/types/operational-feasibility";

export function buildTestHrSnapshot(): HrWorkforceSnapshot {
  const buId = newHrId("bu");
  const deptId = newHrId("dept");
  const teamId = newHrId("team");

  const hrGlobalSettings = {
    workingDaysPerWeek: 5,
    workingHoursPerDay: 8,
    weeksPerYear: 52,
    offDaysPerYear: 10,
    defaultCurrency: "SAR",
    useTeamLevel: true,
  };

  const roles = [
    {
      id: newHrId("role"),
      name: "Senior Consultant",
      businessUnitId: buId,
      departmentId: deptId,
      teamId,
      operationalRoleType: "delivery" as const,
      employmentType: "full_time" as const,
      employeeCount: 6,
      currency: "SAR",
      avgMonthlySalary: 22_000,
      avgMonthlySocialInsurance: 2500,
      annualMedicalInsurance: 6000,
      annualEndOfServiceCost: 18_000,
      riskFactorPct: 0,
      isBillable: true,
      includeInOhAllocation: true,
      additionalCosts: [],
      archived: false,
    },
    {
      id: newHrId("role"),
      name: "Consultant",
      businessUnitId: buId,
      departmentId: deptId,
      teamId,
      operationalRoleType: "delivery" as const,
      employmentType: "full_time" as const,
      employeeCount: 10,
      currency: "SAR",
      avgMonthlySalary: 14_500,
      avgMonthlySocialInsurance: 1800,
      annualMedicalInsurance: 4800,
      annualEndOfServiceCost: 12_000,
      riskFactorPct: 0,
      isBillable: true,
      includeInOhAllocation: true,
      additionalCosts: [],
      archived: false,
    },
  ];

  return {
    roles,
    businessUnits: [
      {
        id: buId,
        name: "Test BU",
        isActive: true,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    ],
    departments: [
      {
        id: deptId,
        businessUnitId: buId,
        name: "Delivery",
        isActive: true,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    ],
    teams: [
      {
        id: teamId,
        departmentId: deptId,
        name: "Squad A",
        isActive: true,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    ],
    hrGlobalSettings,
    ohManualByBusinessUnitId: {
      [buId]: {
        ...DEFAULT_OH,
        utilizationRatePct: 80,
        billableFteSource: "from_roles",
        totalAnnualOverhead: 1_200_000,
      },
    },
  };
}

export function testHrBusinessUnitId(snap: HrWorkforceSnapshot): string {
  return snap.businessUnits[0]!.id;
}
