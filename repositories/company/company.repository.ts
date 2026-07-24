import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { TenantId } from "@/types/ids";

export type CompanyRecord = {
  id: string;
  tenantId: string;
  website: string | null;
  websiteNormalized: string | null;
  companyName: string;
};

type CompanyRow = {
  id: string;
  tenant_id: string;
  website: string | null;
  website_normalized: string | null;
  company_name: string;
};

function mapCompany(row: CompanyRow): CompanyRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    website: row.website,
    websiteNormalized: row.website_normalized,
    companyName: row.company_name,
  };
}

export function normalizeWebsiteKey(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(website.trim())
      ? website.trim()
      : `https://${website.trim()}`;
    const url = new URL(withProtocol);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return website.trim().toLowerCase();
  }
}

export class CompanyRepository {
  async findByNormalizedWebsite(
    tenantId: TenantId,
    websiteNormalized: string,
  ): Promise<CompanyRecord | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("website_normalized", websiteNormalized)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data ? mapCompany(data as CompanyRow) : null;
  }

  async upsertByWebsite(input: {
    tenantId: TenantId;
    companyName: string;
    website: string | null;
  }): Promise<CompanyRecord> {
    const websiteNormalized = normalizeWebsiteKey(input.website);
    const supabase = createSupabaseServiceClient();

    if (websiteNormalized) {
      const existing = await this.findByNormalizedWebsite(
        input.tenantId,
        websiteNormalized,
      );
      if (existing) {
        const { data, error } = await supabase
          .from("companies")
          .update({
            company_name: input.companyName,
            website: input.website,
          })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
        return mapCompany(data as CompanyRow);
      }
    }

    const { data, error } = await supabase
      .from("companies")
      .insert({
        tenant_id: input.tenantId,
        company_name: input.companyName,
        website: input.website,
        website_normalized: websiteNormalized,
      })
      .select("*")
      .single();

    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapCompany(data as CompanyRow);
  }
}
