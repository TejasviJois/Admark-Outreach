import { handleApiError, successResponse } from "@/lib/api/response";
import { EmailService } from "@/services/email/email.service";
import { logger } from "@/utils/logger";

export async function GET() {
  try {
    logger.info("GET /api/v1/emails/connection");
    const status = new EmailService().getConnectionStatus();
    return successResponse(status);
  } catch (error) {
    return handleApiError(error);
  }
}
