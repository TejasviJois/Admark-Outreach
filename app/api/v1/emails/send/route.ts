import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { sendEmailSchema } from "@/schemas/email/email.schema";
import { EmailService } from "@/services/email/email.service";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/emails/send");
    const body = await request.json();
    const input = parseSchema(sendEmailSchema, body);
    const sent = await new EmailService().sendEmail(input);
    return successResponse(sent);
  } catch (error) {
    return handleApiError(error);
  }
}
