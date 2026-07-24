import { handleApiError, successResponse } from "@/lib/api/response";
import { logger } from "@/utils/logger";

/**
 * AI personalization preference stub — does not enable Gemini rewrite yet.
 */
export async function GET() {
  try {
    logger.info("GET /api/v1/settings/ai-personalization");
    return successResponse({
      enabled: process.env.ENABLE_AI_PERSONALIZATION === "true",
      available: Boolean(process.env.GEMINI_API_KEY?.trim()),
      status: "coming_soon",
      message:
        "AI personalization is a future feature. Template emails work without it.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
