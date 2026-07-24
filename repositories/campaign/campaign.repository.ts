import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { BaseRepository } from "@/repositories/base.repository";
import type { CreateCampaignInput } from "@/schemas/campaign/campaign.schema";
import type { CampaignRecord, CampaignStatus } from "@/types/lead";
import type { TenantId } from "@/types/ids";

const CAMPAIGN_SELECT =
  "id, tenant_id, name, description, status, target_country, target_industry, default_template_id, created_at, updated_at";

type CampaignRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  target_country: string | null;
  target_industry: string | null;
  default_template_id: string | null;
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
    defaultTemplateId: row.default_template_id,
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
        default_template_id: input.defaultTemplateId ?? null,
        status: "DRAFT",
      })
      .select(CAMPAIGN_SELECT)
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
      .select(CAMPAIGN_SELECT)
      .eq("tenant_id", tenantId)
      .eq("id", campaignId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data ? mapCampaign(data as CampaignRow) : null;
  }

  async update(
    tenantId: TenantId,
    campaignId: string,
    input: { defaultTemplateId?: string | null; name?: string },
  ): Promise<CampaignRecord> {
    const supabase = createSupabaseServiceClient();
    const payload: Record<string, unknown> = {};
    if (input.defaultTemplateId !== undefined) {
      payload.default_template_id = input.defaultTemplateId;
    }
    if (input.name !== undefined) payload.name = input.name;

    const { data, error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", campaignId)
      .select(CAMPAIGN_SELECT)
      .single();

    if (error || !data) {
      throw new DatabaseError(error?.message ?? "Failed to update campaign");
    }

    return mapCampaign(data as CampaignRow);
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
      .select(CAMPAIGN_SELECT, { count: "exact" })
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
