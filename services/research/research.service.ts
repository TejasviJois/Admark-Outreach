import { NotFoundError } from "@/lib/errors/domain-error";
import { CompanyProfileRepository } from "@/repositories/company-profile/company-profile.repository";
import { AuthService } from "@/services/auth/auth.service";
import { OutreachPipelineService } from "@/services/outreach/outreach-pipeline.service";

/**
 * Enrichment entry point (API-compatible).
 * Full mail pipeline lives in OutreachPipelineService; Enrich queues+sends when SMTP is set.
 */
export class ResearchService {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly companyProfileRepository: CompanyProfileRepository = new CompanyProfileRepository(),
    private readonly outreachPipeline: OutreachPipelineService = new OutreachPipelineService(),
  ) {}

  async getResearch(leadId: string) {
    const profile = await this.authService.getCurrentUserProfile();
    const companyProfile = await this.companyProfileRepository.findByLeadId(
      profile.tenant.id,
      leadId,
    );
    if (!companyProfile) throw new NotFoundError("Company profile not found");
    return companyProfile;
  }

  async generateResearch(leadId: string) {
    const result = await this.outreachPipeline.processLead(leadId, {
      sendImmediately: false,
    });
    const profile = await this.getResearch(leadId);
    return { ...profile, pipeline: result };
  }
}
