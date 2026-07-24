import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logger } from "@/utils/logger";

/**
 * Smoke check: verifies the service-role client can reach Supabase Auth.
 * Does not query domain tables (foundation schema may not exist yet).
 */
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      logger.error("Supabase smoke check failed", { error: error.message });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EXTERNAL_SERVICE_ERROR",
            message: "Database connection smoke check failed",
          },
        },
        { status: 503 },
      );
    }

    logger.info("Supabase smoke check succeeded");
    return NextResponse.json({
      success: true,
      data: { connected: true },
      meta: {},
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown connection error";
    logger.error("Supabase smoke check threw", { error: message });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EXTERNAL_SERVICE_ERROR",
          message: "Database connection smoke check failed",
        },
      },
      { status: 503 },
    );
  }
}
