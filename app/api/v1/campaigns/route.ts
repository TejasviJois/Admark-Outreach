import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import {
  createCampaignSchema,
  listCampaignsQuerySchema,
} from "@/schemas/campaign/campaign.schema";
import { CampaignService } from "@/services/campaign/campaign.service";
import { logger } from "@/utils/logger";

export async function GET(request: Request) {
  try {
    logger.info("GET /api/v1/campaigns started");
    const url = new URL(request.url);
    const query = parseSchema(
      listCampaignsQuerySchema,
      Object.fromEntries(url.searchParams.entries()),
    );
    const service = new CampaignService();
    const result = await service.listCampaigns(query);
    return successResponse(result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/campaigns started");
    const body = await request.json();
    const input = parseSchema(createCampaignSchema, body);
    const service = new CampaignService();
    const campaign = await service.createCampaign(input);
    return successResponse(campaign, {}, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
