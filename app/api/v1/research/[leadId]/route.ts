import { handleApiError, successResponse } from "@/lib/api/response";
import { ResearchService } from "@/services/research/research.service";
import { logger } from "@/utils/logger";

type RouteContext = { params: Promise<{ leadId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { leadId } = await context.params;
    logger.info("GET /api/v1/research/{leadId}", { leadId });
    const research = await new ResearchService().getResearch(leadId);
    return successResponse(research);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { leadId } = await context.params;
    logger.info("POST /api/v1/research/{leadId}", { leadId });
    const research = await new ResearchService().generateResearch(leadId);
    return successResponse(research, {}, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
