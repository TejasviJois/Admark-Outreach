import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { z } from "zod";
import { OutreachPipelineService } from "@/services/outreach/outreach-pipeline.service";
import { logger } from "@/utils/logger";

const bodySchema = z.object({
  campaignId: z.string().uuid(),
  sendImmediately: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/campaigns/process");
    const body = await request.json();
    const input = parseSchema(bodySchema, body);
    const results = await new OutreachPipelineService().processCampaign(
      input.campaignId,
      { sendImmediately: input.sendImmediately },
    );
    return successResponse({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
