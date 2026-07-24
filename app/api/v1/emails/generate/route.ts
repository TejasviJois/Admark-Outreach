import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { generateEmailSchema } from "@/schemas/email/email.schema";
import { EmailService } from "@/services/email/email.service";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/emails/generate");
    const body = await request.json();
    const input = parseSchema(generateEmailSchema, body);
    const email = await new EmailService().generateEmail(input);
    return successResponse(email, {}, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
