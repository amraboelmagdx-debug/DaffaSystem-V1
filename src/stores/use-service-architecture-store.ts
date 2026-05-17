import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { newServiceId } from "@/lib/service-architecture/id";
import { makeServiceArchitectureDemoSeed } from "@/lib/service-architecture/demo-seed";
import { validateTemplateTierFamilyConsistency } from "@/lib/service-architecture/validation";
import { createTenantScopedStorage } from "@/lib/persistence/tenant-storage";
import { SERVICE_ARCHITECTURE_BASE_KEY } from "@/lib/persistence/persist-keys";
import type {
  DeliveryPhase,
  ServiceDeliverable,
  ServiceFamily,
  ServiceRoleAllocation,
  ServiceTemplate,
  ServiceTemplateTier,
  ServiceTemplateTierPhase,
  ServiceTier,
} from "@/types/service-architecture";

function nowIso(): string {
  return new Date().toISOString();
}

function nextMeta() {
  const t = nowIso();
  return { lifecycle: "draft" as const, version: 1, createdAt: t, updatedAt: t };
}

type CatalogEntity =
  | ServiceFamily
  | ServiceTier
  | ServiceTemplate
  | ServiceTemplateTier
  | DeliveryPhase
  | ServiceTemplateTierPhase
  | ServiceDeliverable
  | ServiceRoleAllocation;

function bumpEntityMeta<T extends CatalogEntity>(entity: T): T {
  return {
    ...entity,
    version: Math.max(1, Number(entity.version || 1)),
    updatedAt: nowIso(),
  };
}

export interface ServiceArchitectureCatalogState {
  serviceFamilies: ServiceFamily[];
  serviceTiers: ServiceTier[];
  serviceTemplates: ServiceTemplate[];
  serviceTemplateTiers: ServiceTemplateTier[];
  deliveryPhases: DeliveryPhase[];
  serviceTemplateTierPhases: ServiceTemplateTierPhase[];
  serviceDeliverables: ServiceDeliverable[];
  serviceRoleAllocations: ServiceRoleAllocation[];
}

interface ServiceArchitectureState extends ServiceArchitectureCatalogState {
  addServiceFamily: (input: { name: string; code: string; description?: string }) => void;
  updateServiceFamily: (id: string, patch: Partial<ServiceFamily>) => void;

  addServiceTier: (input: { serviceFamilyId: string; name: string; code: string; description?: string }) => void;
  updateServiceTier: (id: string, patch: Partial<ServiceTier>) => void;

  addServiceTemplate: (input: {
    serviceFamilyId: string;
    businessUnitId: string;
    name: string;
    code: string;
    description?: string;
  }) => void;
  updateServiceTemplate: (id: string, patch: Partial<ServiceTemplate>) => void;

  addServiceTemplateTier: (input: { serviceTemplateId: string; serviceTierId: string }) => { ok: boolean; reason?: string };
  removeServiceTemplateTier: (id: string) => void;

  addDeliveryPhase: (input: { name: string; code: string; description?: string }) => void;
  updateDeliveryPhase: (id: string, patch: Partial<DeliveryPhase>) => void;

  addServiceTemplateTierPhase: (input: {
    serviceTemplateTierId: string;
    deliveryPhaseId: string;
    sortOrder: number;
  }) => void;
  updateServiceTemplateTierPhase: (id: string, patch: Partial<ServiceTemplateTierPhase>) => void;
  removeServiceTemplateTierPhase: (id: string) => void;

  addServiceDeliverable: (input: {
    serviceTemplateTierPhaseId: string;
    name: string;
    code: string;
    description?: string;
  }) => void;
  updateServiceDeliverable: (id: string, patch: Partial<ServiceDeliverable>) => void;
  removeServiceDeliverable: (id: string) => void;

  addServiceRoleAllocation: (input: {
    serviceTemplateTierPhaseId: string;
    jobRoleId: string;
    allocatedHours: number;
    notes?: string;
  }) => void;
  updateServiceRoleAllocation: (id: string, patch: Partial<ServiceRoleAllocation>) => void;
  removeServiceRoleAllocation: (id: string) => void;

  seedDemoCatalog: (input: { businessUnitId: string; roleIds: string[] }) => { ok: boolean; reason?: string };
  resetServiceArchitecture: () => void;
}

function normalizeCatalogState(
  persisted: Partial<ServiceArchitectureCatalogState> | undefined
): ServiceArchitectureCatalogState {
  const fallback: ServiceArchitectureCatalogState = {
    serviceFamilies: [],
    serviceTiers: [],
    serviceTemplates: [],
    serviceTemplateTiers: [],
    deliveryPhases: [],
    serviceTemplateTierPhases: [],
    serviceDeliverables: [],
    serviceRoleAllocations: [],
  };
  if (!persisted) return fallback;

  return {
    serviceFamilies: Array.isArray(persisted.serviceFamilies) ? persisted.serviceFamilies.map(bumpEntityMeta) : [],
    serviceTiers: Array.isArray(persisted.serviceTiers) ? persisted.serviceTiers.map(bumpEntityMeta) : [],
    serviceTemplates: Array.isArray(persisted.serviceTemplates) ? persisted.serviceTemplates.map(bumpEntityMeta) : [],
    serviceTemplateTiers: Array.isArray(persisted.serviceTemplateTiers)
      ? persisted.serviceTemplateTiers.map(bumpEntityMeta)
      : [],
    deliveryPhases: Array.isArray(persisted.deliveryPhases) ? persisted.deliveryPhases.map(bumpEntityMeta) : [],
    serviceTemplateTierPhases: Array.isArray(persisted.serviceTemplateTierPhases)
      ? persisted.serviceTemplateTierPhases.map((row) => ({
          ...bumpEntityMeta(row),
          sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : 0,
        }))
      : [],
    serviceDeliverables: Array.isArray(persisted.serviceDeliverables)
      ? persisted.serviceDeliverables.map(bumpEntityMeta)
      : [],
    serviceRoleAllocations: Array.isArray(persisted.serviceRoleAllocations)
      ? persisted.serviceRoleAllocations.map((row) => ({
          ...bumpEntityMeta(row),
          allocatedHours: Number.isFinite(row.allocatedHours) ? row.allocatedHours : 0,
        }))
      : [],
  };
}

export const useServiceArchitectureStore = create<ServiceArchitectureState>()(
  persist(
    (set, get) => ({
      serviceFamilies: [],
      serviceTiers: [],
      serviceTemplates: [],
      serviceTemplateTiers: [],
      deliveryPhases: [],
      serviceTemplateTierPhases: [],
      serviceDeliverables: [],
      serviceRoleAllocations: [],

      addServiceFamily: (input) =>
        set((state) => ({
          serviceFamilies: [
            ...state.serviceFamilies,
            {
              id: newServiceId("svc_family"),
              name: input.name.trim() || "Service family",
              code: input.code.trim().toUpperCase(),
              description: input.description?.trim() || "",
              ...nextMeta(),
            },
          ],
        })),
      updateServiceFamily: (id, patch) =>
        set((state) => ({
          serviceFamilies: state.serviceFamilies.map((it) =>
            it.id === id ? bumpEntityMeta({ ...it, ...patch }) : it
          ),
        })),

      addServiceTier: (input) =>
        set((state) => ({
          serviceTiers: [
            ...state.serviceTiers,
            {
              id: newServiceId("svc_tier"),
              serviceFamilyId: input.serviceFamilyId,
              name: input.name.trim() || "Tier",
              code: input.code.trim().toUpperCase(),
              description: input.description?.trim() || "",
              ...nextMeta(),
            },
          ],
        })),
      updateServiceTier: (id, patch) =>
        set((state) => ({
          serviceTiers: state.serviceTiers.map((it) =>
            it.id === id ? bumpEntityMeta({ ...it, ...patch }) : it
          ),
        })),

      addServiceTemplate: (input) =>
        set((state) => ({
          serviceTemplates: [
            ...state.serviceTemplates,
            {
              id: newServiceId("svc_template"),
              serviceFamilyId: input.serviceFamilyId,
              businessUnitId: input.businessUnitId,
              name: input.name.trim() || "Service template",
              code: input.code.trim().toUpperCase(),
              description: input.description?.trim() || "",
              ...nextMeta(),
            },
          ],
        })),
      updateServiceTemplate: (id, patch) =>
        set((state) => ({
          serviceTemplates: state.serviceTemplates.map((it) =>
            it.id === id ? bumpEntityMeta({ ...it, ...patch }) : it
          ),
        })),

      addServiceTemplateTier: (input) => {
        const state = get();
        const issues = validateTemplateTierFamilyConsistency({
          templateTier: input,
          templates: state.serviceTemplates,
          tiers: state.serviceTiers,
        });
        if (issues.length > 0) return { ok: false, reason: issues[0]?.message || "Invalid template-tier link" };
        const exists = state.serviceTemplateTiers.some(
          (it) => it.serviceTemplateId === input.serviceTemplateId && it.serviceTierId === input.serviceTierId
        );
        if (exists) return { ok: false, reason: "Template-tier already linked" };
        set((s) => ({
          serviceTemplateTiers: [
            ...s.serviceTemplateTiers,
            {
              id: newServiceId("svc_template_tier"),
              serviceTemplateId: input.serviceTemplateId,
              serviceTierId: input.serviceTierId,
              ...nextMeta(),
            },
          ],
        }));
        return { ok: true };
      },
      removeServiceTemplateTier: (id) =>
        set((state) => {
          const phaseIds = new Set(
            state.serviceTemplateTierPhases.filter((it) => it.serviceTemplateTierId === id).map((it) => it.id)
          );
          return {
            serviceTemplateTiers: state.serviceTemplateTiers.filter((it) => it.id !== id),
            serviceTemplateTierPhases: state.serviceTemplateTierPhases.filter(
              (it) => it.serviceTemplateTierId !== id
            ),
            serviceDeliverables: state.serviceDeliverables.filter(
              (it) => !phaseIds.has(it.serviceTemplateTierPhaseId)
            ),
            serviceRoleAllocations: state.serviceRoleAllocations.filter(
              (it) => !phaseIds.has(it.serviceTemplateTierPhaseId)
            ),
          };
        }),

      addDeliveryPhase: (input) =>
        set((state) => ({
          deliveryPhases: [
            ...state.deliveryPhases,
            {
              id: newServiceId("svc_phase"),
              name: input.name.trim() || "Phase",
              code: input.code.trim().toUpperCase(),
              description: input.description?.trim() || "",
              ...nextMeta(),
            },
          ],
        })),
      updateDeliveryPhase: (id, patch) =>
        set((state) => ({
          deliveryPhases: state.deliveryPhases.map((it) =>
            it.id === id ? bumpEntityMeta({ ...it, ...patch }) : it
          ),
        })),

      addServiceTemplateTierPhase: (input) =>
        set((state) => ({
          serviceTemplateTierPhases: [
            ...state.serviceTemplateTierPhases,
            {
              id: newServiceId("svc_template_tier_phase"),
              serviceTemplateTierId: input.serviceTemplateTierId,
              deliveryPhaseId: input.deliveryPhaseId,
              sortOrder: input.sortOrder,
              ...nextMeta(),
            },
          ],
        })),
      updateServiceTemplateTierPhase: (id, patch) =>
        set((state) => ({
          serviceTemplateTierPhases: state.serviceTemplateTierPhases.map((it) =>
            it.id === id ? bumpEntityMeta({ ...it, ...patch }) : it
          ),
        })),
      removeServiceTemplateTierPhase: (id) =>
        set((state) => ({
          serviceTemplateTierPhases: state.serviceTemplateTierPhases.filter((it) => it.id !== id),
          serviceDeliverables: state.serviceDeliverables.filter((it) => it.serviceTemplateTierPhaseId !== id),
          serviceRoleAllocations: state.serviceRoleAllocations.filter(
            (it) => it.serviceTemplateTierPhaseId !== id
          ),
        })),

      addServiceDeliverable: (input) =>
        set((state) => ({
          serviceDeliverables: [
            ...state.serviceDeliverables,
            {
              id: newServiceId("svc_deliverable"),
              serviceTemplateTierPhaseId: input.serviceTemplateTierPhaseId,
              name: input.name.trim() || "Deliverable",
              code: input.code.trim().toUpperCase(),
              description: input.description?.trim() || "",
              ...nextMeta(),
            },
          ],
        })),
      updateServiceDeliverable: (id, patch) =>
        set((state) => ({
          serviceDeliverables: state.serviceDeliverables.map((it) =>
            it.id === id ? bumpEntityMeta({ ...it, ...patch }) : it
          ),
        })),
      removeServiceDeliverable: (id) =>
        set((state) => ({
          serviceDeliverables: state.serviceDeliverables.filter((it) => it.id !== id),
        })),

      addServiceRoleAllocation: (input) =>
        set((state) => ({
          serviceRoleAllocations: [
            ...state.serviceRoleAllocations,
            {
              id: newServiceId("svc_alloc"),
              serviceTemplateTierPhaseId: input.serviceTemplateTierPhaseId,
              jobRoleId: input.jobRoleId,
              allocatedHours: Math.max(0, Number(input.allocatedHours || 0)),
              notes: input.notes || "",
              ...nextMeta(),
            },
          ],
        })),
      updateServiceRoleAllocation: (id, patch) =>
        set((state) => ({
          serviceRoleAllocations: state.serviceRoleAllocations.map((it) =>
            it.id === id ? bumpEntityMeta({ ...it, ...patch }) : it
          ),
        })),
      removeServiceRoleAllocation: (id) =>
        set((state) => ({
          serviceRoleAllocations: state.serviceRoleAllocations.filter((it) => it.id !== id),
        })),

      seedDemoCatalog: (input) => {
        const state = get();
        if (!input.businessUnitId) return { ok: false, reason: "Business unit is required" };
        if (state.serviceFamilies.length > 0 || state.serviceTemplates.length > 0) {
          return { ok: false, reason: "Catalog already has data" };
        }
        const seed = makeServiceArchitectureDemoSeed({
          businessUnitId: input.businessUnitId,
          roleIds: input.roleIds,
        });
        set((s) => ({
          serviceFamilies: [...s.serviceFamilies, ...seed.serviceFamilies],
          serviceTiers: [...s.serviceTiers, ...seed.serviceTiers],
          serviceTemplates: [...s.serviceTemplates, ...seed.serviceTemplates],
          serviceTemplateTiers: [...s.serviceTemplateTiers, ...seed.serviceTemplateTiers],
          deliveryPhases: [...s.deliveryPhases, ...seed.deliveryPhases],
          serviceTemplateTierPhases: [...s.serviceTemplateTierPhases, ...seed.serviceTemplateTierPhases],
          serviceDeliverables: [...s.serviceDeliverables, ...seed.serviceDeliverables],
          serviceRoleAllocations: [...s.serviceRoleAllocations, ...seed.serviceRoleAllocations],
        }));
        return { ok: true };
      },

      resetServiceArchitecture: () =>
        set({
          serviceFamilies: [],
          serviceTiers: [],
          serviceTemplates: [],
          serviceTemplateTiers: [],
          deliveryPhases: [],
          serviceTemplateTierPhases: [],
          serviceDeliverables: [],
          serviceRoleAllocations: [],
        }),
    }),
    {
      name: "efp-service-architecture-v1",
      storage: createJSONStorage(() => createTenantScopedStorage(SERVICE_ARCHITECTURE_BASE_KEY)),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const normalized = normalizeCatalogState(persisted as Partial<ServiceArchitectureCatalogState>);
        return { ...current, ...normalized };
      },
      partialize: (s) => ({
        serviceFamilies: s.serviceFamilies,
        serviceTiers: s.serviceTiers,
        serviceTemplates: s.serviceTemplates,
        serviceTemplateTiers: s.serviceTemplateTiers,
        deliveryPhases: s.deliveryPhases,
        serviceTemplateTierPhases: s.serviceTemplateTierPhases,
        serviceDeliverables: s.serviceDeliverables,
        serviceRoleAllocations: s.serviceRoleAllocations,
      }),
    }
  )
);

