import { handleApiError, successResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors/domain-error";
import { parseSchema } from "@/lib/validation/parse-schema";
import { leadImportRequestSchema } from "@/schemas/lead/lead.schema";
import { LeadService } from "@/services/lead/lead.service";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/leads/import started");

    const formData = await request.formData();
    const campaignIdValue = formData.get("campaignId");
    const fileValue = formData.get("file");

    const { campaignId } = parseSchema(leadImportRequestSchema, {
      campaignId: campaignIdValue,
    });

    if (!(fileValue instanceof File)) {
      throw new ValidationError("File required");
    }

    const fileContent = await fileValue.text();
    const service = new LeadService();
    const summary = await service.importLeads(
      campaignId,
      fileValue.name,
      fileContent,
    );

    return successResponse(summary, {}, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
