import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthenticationError } from "@/lib/errors/domain-error";
import { getCronSecret } from "@/config/env";
import { EmailService } from "@/services/email/email.service";
import { logger } from "@/utils/logger";

function assertCronAuth(request: Request) {
  const header = request.headers.get("authorization");
  const expected = `Bearer ${getCronSecret()}`;
  if (header !== expected) {
    throw new AuthenticationError("Invalid cron secret");
  }
}

export async function POST(request: Request) {
  try {
    assertCronAuth(request);
    logger.info("POST /api/v1/cron/retry-emails");
    const results = await new EmailService().retryFailed();
    return successResponse({ processed: results.length, results });
  } catch (error) {
    return handleApiError(error);
  }
}
