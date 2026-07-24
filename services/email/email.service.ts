import {
  NotFoundError,
  ValidationError,
} from "@/lib/errors/domain-error";
import {
  createGeminiPersonalizationProvider,
  isAiPersonalizationEnabled,
  type GeminiPersonalizationProvider,
} from "@/providers/ai/gemini-personalization.provider";
import {
  createEmailProvider,
  getEmailConnectionStatus,
} from "@/providers/email/smtp-email.provider";
import type { EmailProvider } from "@/providers/email/email.provider";
import {
  createTemplateEmailProvider,
  type TemplateEmailProvider,
} from "@/providers/email/template-email.provider";
import { CampaignRepository } from "@/repositories/campaign/campaign.repository";
import { CompanyProfileRepository } from "@/repositories/company-profile/company-profile.repository";
import { EmailQueueRepository } from "@/repositories/email/email-queue.repository";
import { EmailTemplateRepository } from "@/repositories/email/email-template.repository";
import { GeneratedEmailRepository } from "@/repositories/email/generated-email.repository";
import { SentEmailRepository } from "@/repositories/email/sent-email.repository";
import { LeadRepository } from "@/repositories/lead/lead.repository";
import type {
  CreateEmailTemplateInput,
  GenerateEmailInput,
  QueueEmailInput,
  SendEmailInputBody,
  UpdateEmailTemplateInput,
} from "@/schemas/email/email.schema";
import { AuthService } from "@/services/auth/auth.service";
import { logger } from "@/utils/logger";

export class EmailService {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly leadRepository: LeadRepository = new LeadRepository(),
    private readonly campaignRepository: CampaignRepository = new CampaignRepository(),
    private readonly companyProfileRepository: CompanyProfileRepository = new CompanyProfileRepository(),
    private readonly templateRepository: EmailTemplateRepository = new EmailTemplateRepository(),
    private readonly generatedEmailRepository: GeneratedEmailRepository = new GeneratedEmailRepository(),
    private readonly queueRepository: EmailQueueRepository = new EmailQueueRepository(),
    private readonly sentEmailRepository: SentEmailRepository = new SentEmailRepository(),
    private readonly templateEmailProvider: TemplateEmailProvider = createTemplateEmailProvider(),
    private readonly geminiProvider: GeminiPersonalizationProvider = createGeminiPersonalizationProvider(),
    private readonly emailProvider: EmailProvider = createEmailProvider(),
  ) {}

  getConnectionStatus() {
    return getEmailConnectionStatus();
  }

  async listTemplates() {
    const profile = await this.authService.getCurrentUserProfile();
    return this.templateRepository.list(profile.tenant.id);
  }

  async createTemplate(input: CreateEmailTemplateInput) {
    const profile = await this.authService.getCurrentUserProfile();
    return this.templateRepository.create(profile.tenant.id, input);
  }

  async updateTemplate(templateId: string, input: UpdateEmailTemplateInput) {
    const profile = await this.authService.getCurrentUserProfile();
    const existing = await this.templateRepository.findById(
      profile.tenant.id,
      templateId,
    );
    if (!existing) throw new NotFoundError("Email template not found");
    return this.templateRepository.update(profile.tenant.id, templateId, input);
  }

  async deleteTemplate(templateId: string) {
    const profile = await this.authService.getCurrentUserProfile();
    const existing = await this.templateRepository.findById(
      profile.tenant.id,
      templateId,
    );
    if (!existing) throw new NotFoundError("Email template not found");
    await this.templateRepository.delete(profile.tenant.id, templateId);
    return { id: templateId };
  }

  async generateEmail(input: GenerateEmailInput) {
    const profile = await this.authService.getCurrentUserProfile();
    const lead = await this.leadRepository.findById(
      profile.tenant.id,
      input.leadId,
    );
    if (!lead) throw new NotFoundError("Lead not found");

    if (!input.regenerate) {
      const existing = await this.generatedEmailRepository.findLatestByLead(
        profile.tenant.id,
        input.leadId,
      );
      if (existing) return existing;
    }

    const companyProfile = await this.companyProfileRepository.findByLeadId(
      profile.tenant.id,
      input.leadId,
    );

    const campaign = await this.campaignRepository.findById(
      profile.tenant.id,
      lead.campaignId,
    );

    const template = input.templateId
      ? await this.templateRepository.findById(
          profile.tenant.id,
          input.templateId,
        )
      : campaign?.defaultTemplateId
        ? await this.templateRepository.findById(
            profile.tenant.id,
            campaign.defaultTemplateId,
          )
        : await this.templateRepository.findDefault(profile.tenant.id);

    if (!template) throw new NotFoundError("Email template not found");

    const rendered = this.templateEmailProvider.render({
      companyName:
        companyProfile?.companyName ?? lead.companyName,
      firstName: lead.firstName,
      industry: companyProfile?.industry ?? lead.industry,
      location: companyProfile?.location ?? lead.country,
      services: companyProfile?.services ?? [],
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
    });

    let subject = rendered.subject;
    let body = rendered.body;
    let generationModel = rendered.model;
    const generationVersion = rendered.version;

    const quality = companyProfile?.profileQualityScore ?? 0;
    if (isAiPersonalizationEnabled() && quality >= 40) {
      try {
        const personalized = await this.geminiProvider.personalize({
          companyProfile: {
            company: companyProfile?.companyName,
            industry: companyProfile?.industry,
            about: companyProfile?.about,
            services: companyProfile?.services,
            location: companyProfile?.location,
            website: companyProfile?.website,
          },
          subject,
          body,
        });
        subject = personalized.subject;
        body = personalized.body;
        generationModel = "gemini-stub";
      } catch {
        // Template email must never fail because AI is unavailable.
      }
    }

    return this.generatedEmailRepository.create(profile.tenant.id, {
      leadId: lead.id,
      templateId: template.id,
      subject,
      body,
      generationModel,
      generationVersion,
    });
  }

  async queueEmail(input: QueueEmailInput) {
    const profile = await this.authService.getCurrentUserProfile();
    const generated = await this.generatedEmailRepository.findById(
      profile.tenant.id,
      input.generatedEmailId,
    );
    if (!generated) throw new NotFoundError("Generated email not found");

    const existing = await this.queueRepository.findActiveByGeneratedEmail(
      profile.tenant.id,
      input.generatedEmailId,
    );
    if (existing) return existing;

    const queued = await this.queueRepository.create(
      profile.tenant.id,
      input.generatedEmailId,
      input.scheduledAt,
    );

    await this.leadRepository.update(profile.tenant.id, generated.leadId, {
      leadStatus: "QUEUED",
    });

    return queued;
  }

  async sendEmail(input: SendEmailInputBody) {
    const profile = await this.authService.getCurrentUserProfile();

    let queue = input.queueId
      ? await this.queueRepository.findById(profile.tenant.id, input.queueId)
      : null;

    if (!queue && input.generatedEmailId) {
      queue = await this.queueRepository.findActiveByGeneratedEmail(
        profile.tenant.id,
        input.generatedEmailId,
      );
      if (!queue) {
        queue = await this.queueRepository.create(
          profile.tenant.id,
          input.generatedEmailId,
        );
      }
    }

    if (!queue) throw new NotFoundError("Queued email not found");

    return this.sendQueuedEmail(profile.tenant.id, queue.id);
  }

  async sendQueuedEmail(tenantId: string, queueId: string) {
    const queue = await this.queueRepository.findById(tenantId, queueId);
    if (!queue) throw new NotFoundError("Queued email not found");

    if (queue.status === "SENT") {
      const existing = await this.sentEmailRepository.findByGeneratedEmail(
        tenantId,
        queue.generatedEmailId,
      );
      return existing;
    }

    const generated = await this.generatedEmailRepository.findById(
      tenantId,
      queue.generatedEmailId,
    );
    if (!generated) throw new NotFoundError("Generated email not found");

    const alreadySent = await this.sentEmailRepository.findByGeneratedEmail(
      tenantId,
      generated.id,
    );
    if (alreadySent) {
      await this.queueRepository.markStatus(queue.id, "SENT");
      return alreadySent;
    }

    const lead = await this.leadRepository.findById(tenantId, generated.leadId);
    if (!lead) throw new NotFoundError("Lead not found");

    const connection = getEmailConnectionStatus();
    if (!connection.configured) {
      throw new ValidationError(
        `Email not configured. Set Titan SMTP env vars: ${connection.missing.join(", ")}`,
      );
    }

    await this.queueRepository.markStatus(queue.id, "PROCESSING");

    try {
      const sendResult = await this.emailProvider.send({
        to: lead.email,
        subject: generated.subject,
        body: generated.body,
      });

      const sent = await this.sentEmailRepository.create({
        tenantId,
        leadId: lead.id,
        generatedEmailId: generated.id,
        providerMessageId: sendResult.providerMessageId,
      });

      await this.queueRepository.markStatus(queue.id, "SENT");
      await this.leadRepository.update(tenantId, lead.id, {
        leadStatus: "EMAILED",
      });

      logger.info("Email sent", {
        leadId: lead.id,
        providerMessageId: sendResult.providerMessageId,
      });

      return sent;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Email send failed";
      await this.queueRepository.markStatus(queue.id, "FAILED", {
        lastError: message,
        retryCount: queue.retryCount + 1,
      });
      throw error;
    }
  }

  async processQueue(limit = 20) {
    const pending = await this.queueRepository.listPending(limit);
    const results = [];

    for (const item of pending) {
      try {
        results.push({
          queueId: item.id,
          result: await this.sendQueuedEmail(item.tenantId, item.id),
        });
      } catch (error) {
        results.push({
          queueId: item.id,
          error: error instanceof Error ? error.message : "Failed",
        });
      }
    }

    return results;
  }

  async retryFailed(limit = 20) {
    const failed = await this.queueRepository.listFailed(limit);
    const results = [];

    for (const item of failed) {
      await this.queueRepository.markStatus(item.id, "PENDING");
      try {
        results.push({
          queueId: item.id,
          result: await this.sendQueuedEmail(item.tenantId, item.id),
        });
      } catch (error) {
        results.push({
          queueId: item.id,
          error: error instanceof Error ? error.message : "Failed",
        });
      }
    }

    return results;
  }
}
