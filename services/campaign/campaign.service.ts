import { CampaignRepository } from "@/repositories/campaign/campaign.repository";
import type {
  CreateCampaignInput,
  ListCampaignsQuery,
} from "@/schemas/campaign/campaign.schema";
import { AuthService } from "@/services/auth/auth.service";
import type { CampaignRecord } from "@/types/lead";

export class CampaignService {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly campaignRepository: CampaignRepository = new CampaignRepository(),
  ) {}

  async createCampaign(input: CreateCampaignInput): Promise<CampaignRecord> {
    const profile = await this.authService.getCurrentUserProfile();
    return this.campaignRepository.create(profile.tenant.id, input);
  }

  async listCampaigns(
    query: ListCampaignsQuery,
  ): Promise<{ items: CampaignRecord[]; total: number; page: number; limit: number }> {
    const profile = await this.authService.getCurrentUserProfile();
    const result = await this.campaignRepository.findMany(profile.tenant.id, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });

    return {
      ...result,
      page: query.page,
      limit: query.limit,
    };
  }
}
