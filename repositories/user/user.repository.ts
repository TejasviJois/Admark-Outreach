import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type {
  BaseRepository,
  CreateUserInput,
  TenantRecord,
  UserRecord,
  UserWithTenant,
} from "@/repositories/base.repository";
import type { AuthUserId, TenantId } from "@/types/ids";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type UserRow = {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
};

function mapTenant(row: TenantRow): TenantRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    authUserId: row.auth_user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserRepository implements BaseRepository {
  readonly name = "UserRepository";

  async findByAuthUserId(
    authUserId: AuthUserId,
  ): Promise<UserWithTenant | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, tenant_id, auth_user_id, full_name, email, role, created_at, updated_at, tenants (id, name, slug, plan, is_active, created_at, updated_at)",
      )
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }

    if (!data) {
      return null;
    }

    const row = data as UserRow & { tenants: TenantRow | TenantRow[] | null };
    const tenantRow = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;

    if (!tenantRow) {
      throw new DatabaseError("User tenant relationship missing");
    }

    return {
      user: mapUser(row),
      tenant: mapTenant(tenantRow),
    };
  }

  async findDefaultTenantId(): Promise<TenantId | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", "admark")
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data?.id ?? null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("users")
      .insert({
        tenant_id: input.tenantId,
        auth_user_id: input.authUserId,
        full_name: input.fullName,
        email: input.email,
        role: input.role ?? "owner",
      })
      .select(
        "id, tenant_id, auth_user_id, full_name, email, role, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      throw new DatabaseError(error?.message ?? "Failed to create user");
    }

    return mapUser(data as UserRow);
  }
}
