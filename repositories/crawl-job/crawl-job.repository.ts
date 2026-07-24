import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { TenantId } from "@/types/ids";

export type CrawlJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export class CrawlJobRepository {
  async create(input: {
    tenantId: TenantId;
    companyId?: string | null;
    leadId?: string | null;
    website?: string | null;
    status: CrawlJobStatus;
  }) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("crawl_jobs")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId ?? null,
        lead_id: input.leadId ?? null,
        website: input.website ?? null,
        status: input.status,
        started_at: input.status === "RUNNING" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return data.id as string;
  }

  async complete(
    jobId: string,
    payload: {
      status: CrawlJobStatus;
      sourcePages?: string[];
      errorMessage?: string | null;
    },
  ) {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("crawl_jobs")
      .update({
        status: payload.status,
        source_pages: payload.sourcePages ?? [],
        error_message: payload.errorMessage ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (error) throw new DatabaseError(error.message);
  }
}
