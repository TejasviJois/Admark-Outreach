import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { TenantId } from "@/types/ids";

export type EmailQueueRecord = {
  id: string;
  tenantId: string;
  generatedEmailId: string;
  scheduledAt: string;
  status: string;
  retryCount: number;
  lastError: string | null;
};

type QueueRow = {
  id: string;
  tenant_id: string;
  generated_email_id: string;
  scheduled_at: string;
  status: string;
  retry_count: number;
  last_error: string | null;
};

function mapQueue(row: QueueRow): EmailQueueRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    generatedEmailId: row.generated_email_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    retryCount: row.retry_count,
    lastError: row.last_error,
  };
}

export class EmailQueueRepository {
  async findActiveByGeneratedEmail(tenantId: TenantId, generatedEmailId: string) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("generated_email_id", generatedEmailId)
      .in("status", ["PENDING", "PROCESSING"])
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data ? mapQueue(data as QueueRow) : null;
  }

  async findById(tenantId: TenantId, queueId: string) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", queueId)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data ? mapQueue(data as QueueRow) : null;
  }

  async create(
    tenantId: TenantId,
    generatedEmailId: string,
    scheduledAt?: string,
  ) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_queue")
      .insert({
        tenant_id: tenantId,
        generated_email_id: generatedEmailId,
        scheduled_at: scheduledAt ?? new Date().toISOString(),
        status: "PENDING",
      })
      .select("*")
      .single();
    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapQueue(data as QueueRow);
  }

  async listPending(limit = 20) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "PENDING")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(limit);
    if (error) throw new DatabaseError(error.message);
    return ((data as QueueRow[]) ?? []).map(mapQueue);
  }

  async listFailed(limit = 20) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "FAILED")
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (error) throw new DatabaseError(error.message);
    return ((data as QueueRow[]) ?? []).map(mapQueue);
  }

  async markStatus(
    queueId: string,
    status: string,
    extra?: { lastError?: string; retryCount?: number },
  ) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_queue")
      .update({
        status,
        last_error: extra?.lastError ?? null,
        ...(extra?.retryCount !== undefined
          ? { retry_count: extra.retryCount }
          : {}),
      })
      .eq("id", queueId)
      .select("*")
      .single();
    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapQueue(data as QueueRow);
  }
}
