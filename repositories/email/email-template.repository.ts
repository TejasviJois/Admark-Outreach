import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { TenantId } from "@/types/ids";

export type EmailTemplateRecord = {
  id: string;
  tenantId: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isDefault: boolean;
};

type TemplateRow = {
  id: string;
  tenant_id: string;
  name: string;
  subject_template: string;
  body_template: string;
  is_default: boolean;
};

function mapTemplate(row: TemplateRow): EmailTemplateRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    isDefault: row.is_default,
  };
}

export class EmailTemplateRepository {
  async list(tenantId: TenantId) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw new DatabaseError(error.message);
    return ((data as TemplateRow[]) ?? []).map(mapTemplate);
  }

  async findById(tenantId: TenantId, templateId: string) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", templateId)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data ? mapTemplate(data as TemplateRow) : null;
  }

  async findDefault(tenantId: TenantId) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_default", true)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data ? mapTemplate(data as TemplateRow) : null;
  }

  async create(
    tenantId: TenantId,
    input: {
      name: string;
      subjectTemplate: string;
      bodyTemplate: string;
      isDefault?: boolean;
    },
  ) {
    const supabase = createSupabaseServiceClient();
    if (input.isDefault) {
      await supabase
        .from("email_templates")
        .update({ is_default: false })
        .eq("tenant_id", tenantId)
        .eq("is_default", true);
    }
    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        subject_template: input.subjectTemplate,
        body_template: input.bodyTemplate,
        is_default: input.isDefault ?? false,
      })
      .select("*")
      .single();
    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapTemplate(data as TemplateRow);
  }

  async update(
    tenantId: TenantId,
    templateId: string,
    input: {
      name?: string;
      subjectTemplate?: string;
      bodyTemplate?: string;
      isDefault?: boolean;
    },
  ) {
    const supabase = createSupabaseServiceClient();
    if (input.isDefault) {
      await supabase
        .from("email_templates")
        .update({ is_default: false })
        .eq("tenant_id", tenantId)
        .eq("is_default", true);
    }
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.subjectTemplate !== undefined) {
      payload.subject_template = input.subjectTemplate;
    }
    if (input.bodyTemplate !== undefined) {
      payload.body_template = input.bodyTemplate;
    }
    if (input.isDefault !== undefined) payload.is_default = input.isDefault;

    const { data, error } = await supabase
      .from("email_templates")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", templateId)
      .select("*")
      .single();
    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapTemplate(data as TemplateRow);
  }

  async delete(tenantId: TenantId, templateId: string) {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", templateId);
    if (error) throw new DatabaseError(error.message);
  }
}
