import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthService } from "@/services/auth/auth.service";
import { logger } from "@/utils/logger";

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile, tenant, and role.
 */
export async function GET() {
  try {
    logger.info("GET /api/v1/auth/me started");
    const authService = new AuthService();
    const profile = await authService.getCurrentUserProfile();
    logger.info("GET /api/v1/auth/me completed", { userId: profile.id });
    return successResponse(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
