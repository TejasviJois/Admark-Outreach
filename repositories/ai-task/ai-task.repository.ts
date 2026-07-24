import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { AiTaskStatus, AiTaskType } from "@/types/ai";
import type { TenantId } from "@/types/ids";

export class AiTaskRepository {
  async create(input: {
    tenantId: TenantId;
    taskType: AiTaskType;
    entityType: string;
    entityId: string;
    model?: string;
  }) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("ai_tasks")
      .insert({
        tenant_id: input.tenantId,
        task_type: input.taskType,
        entity_type: input.entityType,
        entity_id: input.entityId,
        model: input.model ?? null,
        status: "PROCESSING",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return data.id as string;
  }

  async complete(taskId: string, status: Extract<AiTaskStatus, "COMPLETED" | "FAILED">, errorMessage?: string) {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("ai_tasks")
      .update({
        status,
        completed_at: new Date().toISOString(),
        error_message: errorMessage ?? null,
      })
      .eq("id", taskId);

    if (error) throw new DatabaseError(error.message);
  }
}
