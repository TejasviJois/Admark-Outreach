import type { AuthUserId, TenantId, UserId, Uuid } from "@/types/ids";

/**
 * Base repository contract. Domain repositories extend this with typed methods.
 * Repositories own persistence only — no business rules or HTTP.
 */
export interface BaseRepository {
  readonly name: string;
}

export type TenantRecord = {
  id: TenantId;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = {
  id: UserId;
  tenantId: TenantId;
  authUserId: AuthUserId;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  tenantId: TenantId;
  authUserId: AuthUserId;
  fullName: string;
  email: string;
  role?: string;
};

export type UserWithTenant = {
  user: UserRecord;
  tenant: TenantRecord;
};

export type EntityId = Uuid;
