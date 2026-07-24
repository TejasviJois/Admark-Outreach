import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { BaseRepository } from "@/repositories/base.repository";
import type { CreateCampaignInput } from "@/schemas/campaign/campaign.schema";
import type { CampaignRecord, CampaignStatus } from "@/types/lead";
import type { TenantId } from "@/types/ids";

type CampaignRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  target_country: string | null;
  target_industry: string | null;
  created_at: string;
  updated_at: string;
};

function mapCampaign(row: CampaignRow): CampaignRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    status: row.status,
    targetCountry: row.target_country,
    targetIndustry: row.target_industry,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CampaignRepository implements BaseRepository {
  readonly name = "CampaignRepository";

  async create(
    tenantId: TenantId,
    input: CreateCampaignInput,
  ): Promise<CampaignRecord> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description ?? null,
        target_country: input.targetCountry ?? null,
        target_industry: input.targetIndustry ?? null,
        status: "DRAFT",
      })
      .select(
        "id, tenant_id, name, description, status, target_country, target_industry, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      throw new DatabaseError(error?.message ?? "Failed to create campaign");
    }

    return mapCampaign(data as CampaignRow);
  }

  async findById(
    tenantId: TenantId,
    campaignId: string,
  ): Promise<CampaignRecord | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select(
        "id, tenant_id, name, description, status, target_country, target_industry, created_at, updated_at",
      )
      .eq("tenant_id", tenantId)
      .eq("id", campaignId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data ? mapCampaign(data as CampaignRow) : null;
  }

  async findMany(
    tenantId: TenantId,
    options: {
      page: number;
      limit: number;
      status?: CampaignStatus;
    },
  ): Promise<{ items: CampaignRecord[]; total: number }> {
    const supabase = createSupabaseServiceClient();
    const from = (options.page - 1) * options.limit;
    const to = from + options.limit - 1;

    let query = supabase
      .from("campaigns")
      .select(
        "id, tenant_id, name, description, status, target_country, target_industry, created_at, updated_at",
        { count: "exact" },
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new DatabaseError(error.message);
    }

    return {
      items: (data as CampaignRow[] | null)?.map(mapCampaign) ?? [],
      total: count ?? 0,
    };
  }
}
