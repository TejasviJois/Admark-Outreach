import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors/domain-error";
import type { TenantId } from "@/types/ids";

export type ProfileStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "INCOMPLETE"
  | "FAILED";

export type CompanyProfileRecord = {
  id: string;
  tenantId: string;
  companyId: string | null;
  leadId: string | null;
  companyName: string | null;
  industry: string | null;
  website: string | null;
  about: string | null;
  services: string[];
  teamSize: number | null;
  location: string | null;
  technologies: string[];
  contactEmail: string | null;
  linkedinUrl: string | null;
  socialLinks: Record<string, string>;
  sourcePages: string[];
  profileQualityScore: number | null;
  status: ProfileStatus;
  extractedAt: string | null;
};

type ProfileRow = {
  id: string;
  tenant_id: string;
  company_id: string | null;
  lead_id: string | null;
  company_name: string | null;
  industry: string | null;
  website: string | null;
  about: string | null;
  services: string[] | null;
  team_size: number | null;
  location: string | null;
  technologies: string[] | null;
  contact_email: string | null;
  linkedin_url: string | null;
  social_links: Record<string, string> | null;
  source_pages: string[] | null;
  profile_quality_score: number | null;
  status: ProfileStatus;
  extracted_at: string | null;
};

function mapProfile(row: ProfileRow): CompanyProfileRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    companyId: row.company_id,
    leadId: row.lead_id,
    companyName: row.company_name,
    industry: row.industry,
    website: row.website,
    about: row.about,
    services: row.services ?? [],
    teamSize: row.team_size,
    location: row.location,
    technologies: row.technologies ?? [],
    contactEmail: row.contact_email,
    linkedinUrl: row.linkedin_url,
    socialLinks: row.social_links ?? {},
    sourcePages: row.source_pages ?? [],
    profileQualityScore: row.profile_quality_score,
    status: row.status,
    extractedAt: row.extracted_at,
  };
}

export class CompanyProfileRepository {
  async findByLeadId(
    tenantId: TenantId,
    leadId: string,
  ): Promise<CompanyProfileRecord | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    return data ? mapProfile(data as ProfileRow) : null;
  }

  async findByCompanyId(
    tenantId: TenantId,
    companyId: string,
  ): Promise<CompanyProfileRecord | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    return data ? mapProfile(data as ProfileRow) : null;
  }

  async upsertForLead(input: {
    tenantId: TenantId;
    leadId: string;
    companyId: string;
    website: string | null;
    status: ProfileStatus;
  }) {
    const existing = await this.findByLeadId(input.tenantId, input.leadId);
    const supabase = createSupabaseServiceClient();

    if (existing) {
      const { data, error } = await supabase
        .from("company_profiles")
        .update({
          company_id: input.companyId,
          website: input.website,
          status: input.status,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
      return mapProfile(data as ProfileRow);
    }

    const { data, error } = await supabase
      .from("company_profiles")
      .insert({
        tenant_id: input.tenantId,
        lead_id: input.leadId,
        company_id: input.companyId,
        website: input.website,
        status: input.status,
      })
      .select("*")
      .single();

    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapProfile(data as ProfileRow);
  }

  async markFinished(
    profileId: string,
    payload: {
      companyName: string | null;
      industry: string | null;
      website: string | null;
      about: string | null;
      services: string[];
      teamSize: number | null;
      location: string | null;
      technologies: string[];
      contactEmail: string | null;
      linkedinUrl: string | null;
      socialLinks: Record<string, string>;
      sourcePages: string[];
      profileQualityScore: number;
      status: "COMPLETED" | "INCOMPLETE";
    },
  ) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("company_profiles")
      .update({
        company_name: payload.companyName,
        industry: payload.industry,
        website: payload.website,
        about: payload.about,
        services: payload.services,
        team_size: payload.teamSize,
        location: payload.location,
        technologies: payload.technologies,
        contact_email: payload.contactEmail,
        linkedin_url: payload.linkedinUrl,
        social_links: payload.socialLinks,
        source_pages: payload.sourcePages,
        profile_quality_score: payload.profileQualityScore,
        status: payload.status,
        extracted_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .select("*")
      .single();

    if (error || !data) throw new DatabaseError(error?.message ?? "Failed");
    return mapProfile(data as ProfileRow);
  }

  async markFailed(profileId: string) {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("company_profiles")
      .update({ status: "FAILED" })
      .eq("id", profileId);

    if (error) throw new DatabaseError(error.message);
  }
}
