import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { TenantId } from "@/types/ids";

export type GeneratedEmailRecord = {
  id: string;
  tenantId: string;
  leadId: string;
  templateId: string | null;
  subject: string;
  body: string;
  generationModel: string | null;
  generationVersion: string | null;
  createdAt: string;
};

type GeneratedRow = {
  id: string;
  tenant_id: string;
  lead_id: string;
  template_id: string | null;
  subject: string;
  body: string;
  generation_model: string | null;
  generation_version: string | null;
  created_at: string;
};

function mapGenerated(row: GeneratedRow): GeneratedEmailRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    templateId: row.template_id,
    subject: row.subject,
    body: row.body,
    generationModel: row.generation_model,
    generationVersion: row.generation_version,
    createdAt: row.created_at,
  };
}

export class GeneratedEmailRepository {
  async findLatestByLead(tenantId: TenantId, leadId: string) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("generated_emails")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data ? mapGenerated(data as GeneratedRow) : null;
  }

  async findById(tenantId: TenantId, id: string) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("generated_emails")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data ? mapGenerated(data as GeneratedRow) : null;
  }

  async create(
    tenantId: TenantId,
    input: {
      leadId: string;
      templateId: string | null;
      subject: string;
      body: string;
      generationModel: string;
      generationVersion: string;
    },
  ) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("generated_emails")
      .insert({
        tenant_id: tenantId,
        lead_id: input.leadId,
        template_id: input.templateId,
        subject: input.subject,
        body: input.body,
        generation_model: input.generationModel,
        generation_version: input.generationVersion,
      })
      .select("*")
      .single();
    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapGenerated(data as GeneratedRow);
  }
}
