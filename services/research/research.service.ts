import { NotFoundError } from "@/lib/errors/domain-error";
import { createAiProvider } from "@/providers/ai/gemini-ai.provider";
import type { AiProvider } from "@/providers/ai/ai.provider";
import { AiTaskRepository } from "@/repositories/ai-task/ai-task.repository";
import { LeadRepository } from "@/repositories/lead/lead.repository";
import { ResearchRepository } from "@/repositories/research/research.repository";
import { AuthService } from "@/services/auth/auth.service";
import { logger } from "@/utils/logger";

export class ResearchService {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly leadRepository: LeadRepository = new LeadRepository(),
    private readonly researchRepository: ResearchRepository = new ResearchRepository(),
    private readonly aiTaskRepository: AiTaskRepository = new AiTaskRepository(),
    private readonly aiProvider: AiProvider = createAiProvider(),
  ) {}

  async getResearch(leadId: string) {
    const profile = await this.authService.getCurrentUserProfile();
    const research = await this.researchRepository.findByLeadId(
      profile.tenant.id,
      leadId,
    );
    if (!research) throw new NotFoundError("Research not found");
    return research;
  }

  async generateResearch(leadId: string) {
    const profile = await this.authService.getCurrentUserProfile();
    const lead = await this.leadRepository.findById(profile.tenant.id, leadId);
    if (!lead) throw new NotFoundError("Lead not found");

    await this.leadRepository.update(profile.tenant.id, leadId, {
      leadStatus: "RESEARCHING",
      researchStatus: "RUNNING",
    });

    const research = await this.researchRepository.upsertRunning(
      profile.tenant.id,
      leadId,
    );

    const taskId = await this.aiTaskRepository.create({
      tenantId: profile.tenant.id,
      taskType: "RESEARCH",
      entityType: "lead",
      entityId: leadId,
    });

    try {
      const result = await this.aiProvider.generateResearch({
        companyName: lead.companyName,
        website: lead.website,
        industry: lead.industry,
        country: lead.country,
      });

      const completed = await this.researchRepository.markCompleted(research.id, {
        summary: result.output.summary,
        products: result.output.products,
        painPoints: result.output.painPoints,
        opportunities: result.output.opportunities,
        confidenceScore: result.output.confidenceScore,
      });

      await this.leadRepository.update(profile.tenant.id, leadId, {
        leadStatus: "READY",
        researchStatus: "COMPLETED",
      });

      await this.aiTaskRepository.complete(taskId, "COMPLETED");
      logger.info("Research generated", { leadId, model: result.model });
      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Research failed";
      await this.researchRepository.markFailed(research.id);
      await this.leadRepository.update(profile.tenant.id, leadId, {
        researchStatus: "FAILED",
      });
      await this.aiTaskRepository.complete(taskId, "FAILED", message);
      logger.error("Research generation failed", { leadId, error: message });
      throw error;
    }
  }
}
