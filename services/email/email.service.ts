import {
  NotFoundError,
  ValidationError,
} from "@/lib/errors/domain-error";
import { createAiProvider } from "@/providers/ai/gemini-ai.provider";
import type { AiProvider } from "@/providers/ai/ai.provider";
import { createEmailProvider } from "@/providers/email/resend-email.provider";
import type { EmailProvider } from "@/providers/email/email.provider";
import { AiTaskRepository } from "@/repositories/ai-task/ai-task.repository";
import { EmailQueueRepository } from "@/repositories/email/email-queue.repository";
import { EmailTemplateRepository } from "@/repositories/email/email-template.repository";
import { GeneratedEmailRepository } from "@/repositories/email/generated-email.repository";
import { SentEmailRepository } from "@/repositories/email/sent-email.repository";
import { LeadRepository } from "@/repositories/lead/lead.repository";
import { ResearchRepository } from "@/repositories/research/research.repository";
import type {
  CreateEmailTemplateInput,
  GenerateEmailInput,
  QueueEmailInput,
  SendEmailInputBody,
} from "@/schemas/email/email.schema";
import { AuthService } from "@/services/auth/auth.service";
import { logger } from "@/utils/logger";

export class EmailService {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly leadRepository: LeadRepository = new LeadRepository(),
    private readonly researchRepository: ResearchRepository = new ResearchRepository(),
    private readonly templateRepository: EmailTemplateRepository = new EmailTemplateRepository(),
    private readonly generatedEmailRepository: GeneratedEmailRepository = new GeneratedEmailRepository(),
    private readonly queueRepository: EmailQueueRepository = new EmailQueueRepository(),
    private readonly sentEmailRepository: SentEmailRepository = new SentEmailRepository(),
    private readonly aiTaskRepository: AiTaskRepository = new AiTaskRepository(),
    private readonly aiProvider: AiProvider = createAiProvider(),
    private readonly emailProvider: EmailProvider = createEmailProvider(),
  ) {}

  async listTemplates() {
    const profile = await this.authService.getCurrentUserProfile();
    return this.templateRepository.list(profile.tenant.id);
  }

  async createTemplate(input: CreateEmailTemplateInput) {
    const profile = await this.authService.getCurrentUserProfile();
    return this.templateRepository.create(profile.tenant.id, input);
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

    const research = await this.researchRepository.findByLeadId(
      profile.tenant.id,
      input.leadId,
    );
    if (!research || research.status !== "COMPLETED" || !research.summary) {
      throw new ValidationError("Research missing. Generate research first.");
    }

    const template = input.templateId
      ? await this.templateRepository.findById(
          profile.tenant.id,
          input.templateId,
        )
      : await this.templateRepository.findDefault(profile.tenant.id);

    if (!template) throw new NotFoundError("Email template not found");

    const taskId = await this.aiTaskRepository.create({
      tenantId: profile.tenant.id,
      taskType: "EMAIL_GENERATION",
      entityType: "lead",
      entityId: lead.id,
    });

    try {
      const result = await this.aiProvider.generateEmail({
        companyName: lead.companyName,
        firstName: lead.firstName,
        researchSummary: research.summary,
        painPoints: research.painPoints,
        opportunities: research.opportunities,
        subjectTemplate: template.subjectTemplate,
        bodyTemplate: template.bodyTemplate,
      });

      const generated = await this.generatedEmailRepository.create(
        profile.tenant.id,
        {
          leadId: lead.id,
          templateId: template.id,
          subject: result.output.subject,
          body: result.output.body,
          generationModel: result.model,
          generationVersion: result.promptVersion,
        },
      );

      await this.aiTaskRepository.complete(taskId, "COMPLETED");
      return generated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Email generation failed";
      await this.aiTaskRepository.complete(taskId, "FAILED", message);
      throw error;
    }
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
