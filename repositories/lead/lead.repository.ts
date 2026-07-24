import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { BaseRepository } from "@/repositories/base.repository";
import type { UpdateLeadInput } from "@/schemas/lead/lead.schema";
import type {
  LeadImportRow,
  LeadRecord,
  LeadStatus,
  ResearchStatus,
} from "@/types/lead";
import type { TenantId } from "@/types/ids";

const LEAD_SELECT =
  "id, tenant_id, campaign_id, company_id, company_name, website, first_name, last_name, email, linkedin_url, industry, country, employee_count, lead_status, research_status, created_at, updated_at, deleted_at";

type LeadRow = {
  id: string;
  tenant_id: string;
  campaign_id: string;
  company_id: string | null;
  company_name: string;
  website: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  linkedin_url: string | null;
  industry: string | null;
  country: string | null;
  employee_count: number | null;
  lead_status: LeadStatus;
  research_status: ResearchStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapLead(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    campaignId: row.campaign_id,
    companyId: row.company_id,
    companyName: row.company_name,
    website: row.website,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    linkedinUrl: row.linkedin_url,
    industry: row.industry,
    country: row.country,
    employeeCount: row.employee_count,
    leadStatus: row.lead_status,
    researchStatus: row.research_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export type LeadUpdateFields = UpdateLeadInput & {
  companyId?: string | null;
};

export class LeadRepository implements BaseRepository {
  readonly name = "LeadRepository";

  async createMany(
    tenantId: TenantId,
    campaignId: string,
    rows: LeadImportRow[],
  ): Promise<LeadRecord[]> {
    if (rows.length === 0) {
      return [];
    }

    const supabase = createSupabaseServiceClient();
    const payload = rows.map((row) => ({
      tenant_id: tenantId,
      campaign_id: campaignId,
      company_name: row.companyName,
      website: row.website ?? null,
      first_name: row.firstName ?? null,
      last_name: row.lastName ?? null,
      email: row.email.toLowerCase(),
      linkedin_url: row.linkedinUrl ?? null,
      industry: row.industry ?? null,
      country: row.country ?? null,
      employee_count: row.employeeCount ?? null,
      lead_status: "NEW" as const,
      research_status: "PENDING" as const,
    }));

    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select(LEAD_SELECT);

    if (error || !data) {
      throw new DatabaseError(error?.message ?? "Failed to import leads");
    }

    return (data as LeadRow[]).map(mapLead);
  }

  async findById(
    tenantId: TenantId,
    leadId: string,
  ): Promise<LeadRecord | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("tenant_id", tenantId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data ? mapLead(data as LeadRow) : null;
  }

  async findByEmailInTenant(
    tenantId: TenantId,
    email: string,
  ): Promise<LeadRecord | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("tenant_id", tenantId)
      .eq("email", email.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data ? mapLead(data as LeadRow) : null;
  }

  async findEmailsInTenant(
    tenantId: TenantId,
    emails: string[],
  ): Promise<string[]> {
    if (emails.length === 0) {
      return [];
    }

    const normalized = emails.map((email) => email.toLowerCase());
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .select("email")
      .eq("tenant_id", tenantId)
      .in("email", normalized)
      .is("deleted_at", null);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return (data ?? []).map((row) => String(row.email).toLowerCase());
  }

  async findMany(
    tenantId: TenantId,
    options: {
      campaignId?: string;
      status?: LeadStatus;
      search?: string;
      page: number;
      limit: number;
    },
  ): Promise<{ items: LeadRecord[]; total: number }> {
    const supabase = createSupabaseServiceClient();
    const from = (options.page - 1) * options.limit;
    const to = from + options.limit - 1;

    let query = supabase
      .from("leads")
      .select(LEAD_SELECT, { count: "exact" })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (options.campaignId) {
      query = query.eq("campaign_id", options.campaignId);
    }

    if (options.status) {
      query = query.eq("lead_status", options.status);
    }

    if (options.search) {
      const term = `%${options.search}%`;
      query = query.or(
        `company_name.ilike.${term},email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw new DatabaseError(error.message);
    }

    return {
      items: (data as LeadRow[] | null)?.map(mapLead) ?? [],
      total: count ?? 0,
    };
  }

  async update(
    tenantId: TenantId,
    leadId: string,
    input: LeadUpdateFields,
  ): Promise<LeadRecord> {
    const supabase = createSupabaseServiceClient();
    const payload: Record<string, unknown> = {};

    if (input.companyId !== undefined) payload.company_id = input.companyId;
    if (input.companyName !== undefined) payload.company_name = input.companyName;
    if (input.website !== undefined) payload.website = input.website;
    if (input.firstName !== undefined) payload.first_name = input.firstName;
    if (input.lastName !== undefined) payload.last_name = input.lastName;
    if (input.email !== undefined) payload.email = input.email.toLowerCase();
    if (input.linkedinUrl !== undefined) payload.linkedin_url = input.linkedinUrl;
    if (input.industry !== undefined) payload.industry = input.industry;
    if (input.country !== undefined) payload.country = input.country;
    if (input.employeeCount !== undefined) {
      payload.employee_count = input.employeeCount;
    }
    if (input.leadStatus !== undefined) payload.lead_status = input.leadStatus;
    if (input.researchStatus !== undefined) {
      payload.research_status = input.researchStatus;
    }

    const { data, error } = await supabase
      .from("leads")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .select(LEAD_SELECT)
      .single();

    if (error || !data) {
      throw new DatabaseError(error?.message ?? "Failed to update lead");
    }

    return mapLead(data as LeadRow);
  }

  async softDelete(tenantId: TenantId, leadId: string): Promise<LeadRecord> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .update({
        deleted_at: new Date().toISOString(),
        lead_status: "ARCHIVED",
      })
      .eq("tenant_id", tenantId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .select(LEAD_SELECT)
      .single();

    if (error || !data) {
      throw new DatabaseError(error?.message ?? "Failed to archive lead");
    }

    return mapLead(data as LeadRow);
  }
}
