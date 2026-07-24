import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { z } from "zod";
import { ResearchService } from "@/services/research/research.service";
import { logger } from "@/utils/logger";

const researchBodySchema = z.object({ leadId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/internal/research");
    const body = parseSchema(researchBodySchema, await request.json());
    const research = await new ResearchService().generateResearch(body.leadId);
    return successResponse(research, {}, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
