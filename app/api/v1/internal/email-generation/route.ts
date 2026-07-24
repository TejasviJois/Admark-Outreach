import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { generateEmailSchema } from "@/schemas/email/email.schema";
import { EmailService } from "@/services/email/email.service";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/internal/email-generation");
    const body = parseSchema(generateEmailSchema, await request.json());
    const email = await new EmailService().generateEmail(body);
    return successResponse(email, {}, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
