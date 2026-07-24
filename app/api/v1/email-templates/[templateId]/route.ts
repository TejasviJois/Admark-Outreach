import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { updateEmailTemplateSchema } from "@/schemas/email/email.schema";
import { EmailService } from "@/services/email/email.service";
import { logger } from "@/utils/logger";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { templateId } = await context.params;
    logger.info("PATCH /api/v1/email-templates/{templateId}", { templateId });
    const body = await request.json();
    const input = parseSchema(updateEmailTemplateSchema, body);
    const template = await new EmailService().updateTemplate(templateId, input);
    return successResponse(template);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { templateId } = await context.params;
    logger.info("DELETE /api/v1/email-templates/{templateId}", { templateId });
    const result = await new EmailService().deleteTemplate(templateId);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
