import { NextResponse } from "next/server";

import { SERVICE_ARCHITECTURE_ENGINE_VERSION } from "@/lib/service-architecture/workspace-versions";
import { loadHrWorkforceCatalog } from "@/server/hr/load-hr-catalog";
import { loadServiceArchitectureCatalog } from "@/server/service/load-service-catalog";
import { saveServiceArchitectureCatalog } from "@/server/service/save-service-catalog";
import { validateSaAgainstHrCatalog } from "@/server/service/validate-catalog-references";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";
import {
  hrWorkforceCatalogPayloadSchema,
  type HrWorkforceCatalogPayload,
} from "@/server/validation/hr-catalog-schema";
import {
  serviceCatalogPutBodySchema,
  type ServiceArchitectureCatalogPayload,
} from "@/server/validation/service-catalog-schema";
import { validateServiceCatalogStructure } from "@/server/validation/validate-service-catalog-structure";

function hrPayloadFromRow(payload: Record<string, unknown>): HrWorkforceCatalogPayload | null {
  const parsed = hrWorkforceCatalogPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const row = await loadServiceArchitectureCatalog(tenant.organizationId);

    if (!row) {
      return NextResponse.json(
        { error: "Service architecture catalog not found for this organization" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        catalog: row.payload,
        meta: {
          organizationId: row.organizationId,
          engineVersion: row.engineVersion,
          updatedAt: row.updatedAt,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const tenant = await requireTenantContext();
    const json = await req.json().catch(() => null);
    const parsed = serviceCatalogPutBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION",
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const { catalog, engineVersion, expectedUpdatedAt } = parsed.data;
    const structureIssues = validateServiceCatalogStructure(
      catalog as ServiceArchitectureCatalogPayload
    );
    if (structureIssues.length > 0) {
      return NextResponse.json(
        {
          error: "Catalog structure validation failed",
          code: "VALIDATION",
          details: structureIssues,
        },
        { status: 422 }
      );
    }

    const hrRow = await loadHrWorkforceCatalog(tenant.organizationId);
    const hrPayload = hrRow ? hrPayloadFromRow(hrRow.payload) : null;
    const hrRefIssues = validateSaAgainstHrCatalog(
      catalog as ServiceArchitectureCatalogPayload,
      hrPayload
    );
    if (hrRefIssues.length > 0) {
      const status = hrPayload == null ? 424 : 422;
      return NextResponse.json(
        {
          error:
            hrPayload == null
              ? "HR workforce catalog not found; import HR data first"
              : "Service catalog references invalid HR entities",
          code: hrPayload == null ? "FAILED_DEPENDENCY" : "VALIDATION",
          details: hrRefIssues,
        },
        { status }
      );
    }

    const meta = await saveServiceArchitectureCatalog({
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      catalog: catalog as ServiceArchitectureCatalogPayload,
      engineVersion: engineVersion ?? String(SERVICE_ARCHITECTURE_ENGINE_VERSION),
      expectedUpdatedAt,
    });

    return NextResponse.json(
      { meta },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
