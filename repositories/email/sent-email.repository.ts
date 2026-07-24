import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { TenantId } from "@/types/ids";

export class SentEmailRepository {
  async findByGeneratedEmail(tenantId: TenantId, generatedEmailId: string) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("sent_emails")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("generated_email_id", generatedEmailId)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async create(input: {
    tenantId: TenantId;
    leadId: string;
    generatedEmailId: string;
    providerMessageId: string | null;
    status?: string;
  }) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("sent_emails")
      .insert({
        tenant_id: input.tenantId,
        lead_id: input.leadId,
        generated_email_id: input.generatedEmailId,
        provider_message_id: input.providerMessageId,
        status: input.status ?? "SENT",
      })
      .select("*")
      .single();
    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return data;
  }
}
