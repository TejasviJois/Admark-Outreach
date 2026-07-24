import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { createEmailTemplateSchema } from "@/schemas/email/email.schema";
import { EmailService } from "@/services/email/email.service";
import { logger } from "@/utils/logger";

export async function GET() {
  try {
    logger.info("GET /api/v1/email-templates");
    const templates = await new EmailService().listTemplates();
    return successResponse(templates);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/email-templates");
    const body = await request.json();
    const input = parseSchema(createEmailTemplateSchema, body);
    const template = await new EmailService().createTemplate(input);
    return successResponse(template, {}, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
