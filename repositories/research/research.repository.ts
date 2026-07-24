import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { ResearchStatus } from "@/types/lead";
import type { TenantId } from "@/types/ids";

export type CompanyResearchRecord = {
  id: string;
  tenantId: string;
  leadId: string;
  summary: string | null;
  products: string[];
  painPoints: string[];
  opportunities: string[];
  confidenceScore: number | null;
  status: ResearchStatus;
  generatedAt: string | null;
};

type ResearchRow = {
  id: string;
  tenant_id: string;
  lead_id: string;
  summary: string | null;
  products: string[] | null;
  pain_points: string[] | null;
  opportunities: string[] | null;
  confidence_score: number | null;
  status: ResearchStatus;
  generated_at: string | null;
};

function mapResearch(row: ResearchRow): CompanyResearchRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    summary: row.summary,
    products: row.products ?? [],
    painPoints: row.pain_points ?? [],
    opportunities: row.opportunities ?? [],
    confidenceScore: row.confidence_score,
    status: row.status,
    generatedAt: row.generated_at,
  };
}

export class ResearchRepository {
  async findByLeadId(
    tenantId: TenantId,
    leadId: string,
  ): Promise<CompanyResearchRecord | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("company_research")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    return data ? mapResearch(data as ResearchRow) : null;
  }

  async upsertRunning(tenantId: TenantId, leadId: string) {
    const existing = await this.findByLeadId(tenantId, leadId);
    const supabase = createSupabaseServiceClient();

    if (existing) {
      const { data, error } = await supabase
        .from("company_research")
        .update({ status: "RUNNING", summary: null })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
      return mapResearch(data as ResearchRow);
    }

    const { data, error } = await supabase
      .from("company_research")
      .insert({
        tenant_id: tenantId,
        lead_id: leadId,
        status: "RUNNING",
      })
      .select("*")
      .single();

    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapResearch(data as ResearchRow);
  }

  async markCompleted(
    researchId: string,
    payload: {
      summary: string;
      products: string[];
      painPoints: string[];
      opportunities: string[];
      confidenceScore: number;
    },
  ) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("company_research")
      .update({
        summary: payload.summary,
        products: payload.products,
        pain_points: payload.painPoints,
        opportunities: payload.opportunities,
        confidence_score: payload.confidenceScore,
        status: "COMPLETED",
        generated_at: new Date().toISOString(),
      })
      .eq("id", researchId)
      .select("*")
      .single();

    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapResearch(data as ResearchRow);
  }

  async markFailed(researchId: string) {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("company_research")
      .update({ status: "FAILED" })
      .eq("id", researchId);

    if (error) throw new DatabaseError(error.message);
  }
}
