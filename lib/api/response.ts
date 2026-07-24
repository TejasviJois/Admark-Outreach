import { NextResponse } from "next/server";

import { API_ERROR_CODES } from "@/constants/api";
import { DomainError } from "@/lib/errors/domain-error";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import { logger } from "@/utils/logger";

export function successResponse<TData, TMeta extends Record<string, unknown> = Record<string, unknown>>(
  data: TData,
  meta: TMeta = {} as TMeta,
  status = 200,
): NextResponse<ApiSuccessResponse<TData, TMeta>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      meta,
    },
    { status },
  );
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof DomainError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, { code: error.code });
    } else {
      logger.warn(error.message, { code: error.code });
    }

    return errorResponse(error.code, error.message, error.statusCode);
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  logger.error("Unhandled API error", { error: message });

  return errorResponse(
    API_ERROR_CODES.INTERNAL_ERROR,
    "An unexpected error occurred",
    500,
  );
}
