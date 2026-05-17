import { z } from "zod";

const isoString = z.string().min(1);

const serviceLifecycleSchema = z.enum(["draft", "active", "inactive", "archived"]);

const serviceEntityMetaSchema = z
  .object({
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const serviceFamilySchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    code: z.string(),
    description: z.string().optional(),
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const serviceTierSchema = z
  .object({
    id: z.string().min(1),
    serviceFamilyId: z.string().min(1),
    name: z.string(),
    code: z.string(),
    description: z.string().optional(),
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const serviceTemplateSchema = z
  .object({
    id: z.string().min(1),
    serviceFamilyId: z.string().min(1),
    businessUnitId: z.string().min(1),
    name: z.string(),
    code: z.string(),
    description: z.string().optional(),
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const serviceTemplateTierSchema = z
  .object({
    id: z.string().min(1),
    serviceTemplateId: z.string().min(1),
    serviceTierId: z.string().min(1),
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const deliveryPhaseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    code: z.string(),
    description: z.string().optional(),
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const serviceTemplateTierPhaseSchema = z
  .object({
    id: z.string().min(1),
    serviceTemplateTierId: z.string().min(1),
    deliveryPhaseId: z.string().min(1),
    sortOrder: z.number(),
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const serviceDeliverableSchema = z
  .object({
    id: z.string().min(1),
    serviceTemplateTierPhaseId: z.string().min(1),
    name: z.string(),
    code: z.string(),
    description: z.string().optional(),
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

const serviceRoleAllocationSchema = z
  .object({
    id: z.string().min(1),
    serviceTemplateTierPhaseId: z.string().min(1),
    jobRoleId: z.string().min(1),
    allocatedHours: z.number(),
    notes: z.string().optional(),
    lifecycle: serviceLifecycleSchema,
    version: z.number(),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .passthrough();

export const serviceArchitectureCatalogPayloadSchema = z.object({
  serviceFamilies: z.array(serviceFamilySchema),
  serviceTiers: z.array(serviceTierSchema),
  serviceTemplates: z.array(serviceTemplateSchema),
  serviceTemplateTiers: z.array(serviceTemplateTierSchema),
  deliveryPhases: z.array(deliveryPhaseSchema),
  serviceTemplateTierPhases: z.array(serviceTemplateTierPhaseSchema),
  serviceDeliverables: z.array(serviceDeliverableSchema),
  serviceRoleAllocations: z.array(serviceRoleAllocationSchema),
});

export type ServiceArchitectureCatalogPayload = z.infer<typeof serviceArchitectureCatalogPayloadSchema>;

export const serviceCatalogPutBodySchema = z.object({
  catalog: serviceArchitectureCatalogPayloadSchema,
  engineVersion: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
});

export type ServiceCatalogPutBody = z.infer<typeof serviceCatalogPutBodySchema>;
