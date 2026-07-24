import { NotFoundError, ValidationError } from "@/lib/errors/domain-error";
import { scoreCompanyProfile } from "@/lib/email/template-engine";
import {
  createGeminiPersonalizationProvider,
  isAiPersonalizationEnabled,
  type GeminiPersonalizationProvider,
} from "@/providers/ai/gemini-personalization.provider";
import { createWebsiteCrawlProvider } from "@/providers/crawl/cheerio-website-crawl.provider";
import type { WebsiteCrawlProvider } from "@/providers/crawl/crawl.provider";
import { createBusinessEnrichmentProvider } from "@/providers/enrichment/business-enrichment.provider";
import type { BusinessEnrichmentProvider } from "@/providers/enrichment/business-enrichment.provider";
import { createLinkedInProvider } from "@/providers/enrichment/linkedin.provider";
import type { LinkedInProvider } from "@/providers/enrichment/linkedin.provider";
import { createMapsProvider } from "@/providers/enrichment/maps.provider";
import type { MapsProvider } from "@/providers/enrichment/maps.provider";
import { createTechStackProvider } from "@/providers/enrichment/tech-stack.provider";
import type { TechStackProvider } from "@/providers/enrichment/tech-stack.provider";
import {
  createTemplateEmailProvider,
  type TemplateEmailProvider,
} from "@/providers/email/template-email.provider";
import { CampaignRepository } from "@/repositories/campaign/campaign.repository";
import { CompanyRepository } from "@/repositories/company/company.repository";
import { CompanyProfileRepository } from "@/repositories/company-profile/company-profile.repository";
import { CrawlJobRepository } from "@/repositories/crawl-job/crawl-job.repository";
import { EmailQueueRepository } from "@/repositories/email/email-queue.repository";
import { EmailTemplateRepository } from "@/repositories/email/email-template.repository";
import { GeneratedEmailRepository } from "@/repositories/email/generated-email.repository";
import { LeadRepository } from "@/repositories/lead/lead.repository";
import { AuthService } from "@/services/auth/auth.service";
import { EmailService } from "@/services/email/email.service";
import type { LeadRecord } from "@/types/lead";
import { logger } from "@/utils/logger";

export type ProcessLeadResult = {
  leadId: string;
  profileStatus: string;
  generatedEmailId?: string;
  queueId?: string;
  sent?: boolean;
  error?: string;
};

/**
 * CSV → validate (done at import) → crawl if website → profile → template → queue → send
 */
export class OutreachPipelineService {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly leadRepository: LeadRepository = new LeadRepository(),
    private readonly campaignRepository: CampaignRepository = new CampaignRepository(),
    private readonly companyRepository: CompanyRepository = new CompanyRepository(),
    private readonly companyProfileRepository: CompanyProfileRepository = new CompanyProfileRepository(),
    private readonly crawlJobRepository: CrawlJobRepository = new CrawlJobRepository(),
    private readonly templateRepository: EmailTemplateRepository = new EmailTemplateRepository(),
    private readonly generatedEmailRepository: GeneratedEmailRepository = new GeneratedEmailRepository(),
    private readonly queueRepository: EmailQueueRepository = new EmailQueueRepository(),
    private readonly emailService: EmailService = new EmailService(),
    private readonly crawlProvider: WebsiteCrawlProvider = createWebsiteCrawlProvider(),
    private readonly techStackProvider: TechStackProvider = createTechStackProvider(),
    private readonly businessEnrichmentProvider: BusinessEnrichmentProvider = createBusinessEnrichmentProvider(),
    private readonly mapsProvider: MapsProvider = createMapsProvider(),
    private readonly linkedInProvider: LinkedInProvider = createLinkedInProvider(),
    private readonly templateEmailProvider: TemplateEmailProvider = createTemplateEmailProvider(),
    private readonly geminiProvider: GeminiPersonalizationProvider = createGeminiPersonalizationProvider(),
  ) {}

  async processImportedLeads(
    leadIds: string[],
    options: { sendImmediately?: boolean } = {},
  ): Promise<ProcessLeadResult[]> {
    const results: ProcessLeadResult[] = [];
    for (const leadId of leadIds) {
      try {
        results.push(
          await this.processLead(leadId, {
            sendImmediately: options.sendImmediately ?? true,
          }),
        );
      } catch (error) {
        results.push({
          leadId,
          profileStatus: "FAILED",
          error: error instanceof Error ? error.message : "Pipeline failed",
        });
      }
    }
    return results;
  }

  async processLead(
    leadId: string,
    options: { sendImmediately?: boolean } = {},
  ): Promise<ProcessLeadResult> {
    const authProfile = await this.authService.getCurrentUserProfile();
    const tenantId = authProfile.tenant.id;
    const lead = await this.leadRepository.findById(tenantId, leadId);
    if (!lead) throw new NotFoundError("Lead not found");

    const campaign = await this.campaignRepository.findById(
      tenantId,
      lead.campaignId,
    );
    if (!campaign) throw new NotFoundError("Campaign not found");

    const template = campaign.defaultTemplateId
      ? await this.templateRepository.findById(
          tenantId,
          campaign.defaultTemplateId,
        )
      : await this.templateRepository.findDefault(tenantId);

    if (!template) {
      throw new ValidationError(
        "Campaign has no default template. Assign a template before mailing.",
      );
    }

    await this.leadRepository.update(tenantId, leadId, {
      leadStatus: "RESEARCHING",
      researchStatus: "RUNNING",
    });

    const company = await this.companyRepository.upsertByWebsite({
      tenantId,
      companyName: lead.companyName,
      website: lead.website,
    });

    await this.leadRepository.update(tenantId, leadId, {
      companyId: company.id,
    });

    const runningProfile = await this.companyProfileRepository.upsertForLead({
      tenantId,
      leadId,
      companyId: company.id,
      website: lead.website,
      status: "RUNNING",
    });

    let about: string | null = null;
    let services: string[] = [];
    let contactEmail: string | null = lead.email;
    let location: string | null = lead.country;
    let linkedinUrl: string | null = lead.linkedinUrl;
    let socialLinks: Record<string, string> = {};
    let sourcePages: string[] = [];
    let companyName = lead.companyName;
    let website = lead.website;
    let industry = lead.industry;

    const websiteUrl = lead.website?.trim();
    if (websiteUrl) {
      const jobId = await this.crawlJobRepository.create({
        tenantId,
        companyId: company.id,
        leadId,
        website: websiteUrl,
        status: "RUNNING",
      });

      try {
        const extracted = await this.crawlProvider.extractFromWebsite(websiteUrl);
        about = extracted.about;
        services = extracted.services;
        contactEmail = extracted.contactEmail ?? lead.email;
        linkedinUrl = extracted.linkedinUrl ?? lead.linkedinUrl;
        socialLinks = extracted.socialLinks;
        sourcePages = extracted.sourcePages;
        companyName = extracted.companyName ?? lead.companyName;
        website = extracted.website;
        location = extracted.location ?? location;
        await this.crawlJobRepository.complete(jobId, {
          status: "COMPLETED",
          sourcePages,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Crawl failed";
        await this.crawlJobRepository.complete(jobId, {
          status: "FAILED",
          errorMessage: message,
        });
        logger.error("Website crawl failed; continuing with CSV fields", {
          leadId,
          error: message,
        });
      }
    } else {
      await this.crawlJobRepository.create({
        tenantId,
        companyId: company.id,
        leadId,
        website: null,
        status: "SKIPPED",
      });
    }

    const tech = await this.techStackProvider.lookup(website ?? "");
    const business = await this.businessEnrichmentProvider.enrich({
      companyName,
      website: website ?? "",
    });
    const maps = await this.mapsProvider.lookup({ companyName, website });
    const linkedIn = await this.linkedInProvider.lookup({ companyName, website });

    industry = business.industry ?? industry;
    location = maps.location ?? business.location ?? location;
    linkedinUrl = linkedIn.linkedinUrl ?? linkedinUrl;

    const quality = scoreCompanyProfile({
      companyName,
      about,
      services,
      contactEmail,
      location,
      website,
      socialLinks,
    });

    const status = quality < 40 ? "INCOMPLETE" : "COMPLETED";

    const profile = await this.companyProfileRepository.markFinished(
      runningProfile.id,
      {
        companyName,
        industry,
        website,
        about,
        services,
        teamSize: business.teamSize ?? lead.employeeCount,
        location,
        technologies: tech.technologies,
        contactEmail,
        linkedinUrl,
        socialLinks,
        sourcePages,
        profileQualityScore: quality,
        status,
      },
    );

    await this.leadRepository.update(tenantId, leadId, {
      leadStatus: "READY",
      researchStatus: "COMPLETED",
      companyName: profile.companyName ?? lead.companyName,
      website: profile.website ?? lead.website,
      industry: profile.industry ?? lead.industry,
      country: profile.location ?? lead.country,
      linkedinUrl: profile.linkedinUrl ?? lead.linkedinUrl,
      employeeCount: profile.teamSize ?? lead.employeeCount,
    });

    const rendered = this.templateEmailProvider.render({
      companyName: profile.companyName ?? lead.companyName,
      firstName: lead.firstName,
      industry: profile.industry ?? lead.industry,
      location: profile.location ?? lead.country,
      services: profile.services,
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
    });

    let subject = rendered.subject;
    let body = rendered.body;
    let generationModel = rendered.model;
    let generationVersion = rendered.version;

    // Future AI: only when enabled AND profile quality is sufficient.
    // Stub returns template unchanged; never fails the pipeline.
    if (isAiPersonalizationEnabled() && quality >= 40) {
      try {
        const personalized = await this.geminiProvider.personalize({
          companyProfile: {
            company: profile.companyName,
            industry: profile.industry,
            about: profile.about,
            services: profile.services,
            location: profile.location,
            website: profile.website,
          },
          subject,
          body,
        });
        subject = personalized.subject;
        body = personalized.body;
        generationModel = "gemini-stub";
      } catch (error) {
        logger.error("AI personalization skipped; using template", {
          leadId,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    const generated = await this.generatedEmailRepository.create(tenantId, {
      leadId,
      templateId: template.id,
      subject,
      body,
      generationModel,
      generationVersion,
    });

    const queued = await this.queueRepository.create(tenantId, generated.id);
    await this.leadRepository.update(tenantId, leadId, {
      leadStatus: "QUEUED",
    });

    let sent = false;
    if (options.sendImmediately !== false) {
      try {
        await this.emailService.sendQueuedEmail(tenantId, queued.id);
        sent = true;
      } catch (error) {
        logger.error("Send failed after queue", {
          leadId,
          error: error instanceof Error ? error.message : "unknown",
        });
        return {
          leadId,
          profileStatus: profile.status,
          generatedEmailId: generated.id,
          queueId: queued.id,
          sent: false,
          error: error instanceof Error ? error.message : "Send failed",
        };
      }
    }

    return {
      leadId,
      profileStatus: profile.status,
      generatedEmailId: generated.id,
      queueId: queued.id,
      sent,
    };
  }

  async processCampaign(
    campaignId: string,
    options: { sendImmediately?: boolean } = {},
  ) {
    const authProfile = await this.authService.getCurrentUserProfile();
    const leads = await this.leadRepository.findMany(authProfile.tenant.id, {
      campaignId,
      page: 1,
      limit: 200,
    });

    const eligible = leads.items.filter(
      (lead) =>
        lead.leadStatus === "NEW" ||
        lead.leadStatus === "READY" ||
        lead.leadStatus === "FAILED",
    );

    return this.processImportedLeads(
      eligible.map((l: LeadRecord) => l.id),
      options,
    );
  }
}
