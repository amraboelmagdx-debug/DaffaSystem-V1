export type AppRole =
  | "admin"
  | "executive"
  | "finance_manager"
  | "sales_director"
  | "analyst"
  | "viewer";

export type TenantMembership = {
  organizationId: string;
  organizationName: string;
  role: AppRole;
};

export type TenantContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  role: AppRole;
  memberships: TenantMembership[];
};
