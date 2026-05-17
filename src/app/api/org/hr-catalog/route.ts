import { NextResponse } from "next/server";

import { HR_WORKFORCE_ENGINE_VERSION } from "@/lib/hr-workforce/workspace-versions";

import { loadHrWorkforceCatalog } from "@/server/hr/load-hr-catalog";

import { saveHrWorkforceCatalog } from "@/server/hr/save-hr-catalog";

import { requireTenantContext } from "@/server/tenant/context";

import { tenantErrorResponse } from "@/server/tenant/errors";

import {

  hrCatalogPutBodySchema,

  type HrWorkforceCatalogPayload,

} from "@/server/validation/hr-catalog-schema";

import { validateHrCatalogStructure } from "@/server/validation/validate-hr-catalog-structure";



export async function GET() {

  try {

    const tenant = await requireTenantContext();

    const row = await loadHrWorkforceCatalog(tenant.organizationId);



    if (!row) {

      return NextResponse.json(

        { error: "HR workforce catalog not found for this organization" },

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

    const parsed = hrCatalogPutBodySchema.safeParse(json);



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

    const structureIssues = validateHrCatalogStructure(catalog as HrWorkforceCatalogPayload);

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



    const meta = await saveHrWorkforceCatalog({

      organizationId: tenant.organizationId,

      userId: tenant.userId,

      catalog: catalog as HrWorkforceCatalogPayload,

      engineVersion: engineVersion ?? String(HR_WORKFORCE_ENGINE_VERSION),

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


