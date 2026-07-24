import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { queueEmailSchema } from "@/schemas/email/email.schema";
import { EmailService } from "@/services/email/email.service";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    logger.info("POST /api/v1/emails/queue");
    const body = await request.json();
    const input = parseSchema(queueEmailSchema, body);
    const queued = await new EmailService().queueEmail(input);
    return successResponse(queued, {}, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
