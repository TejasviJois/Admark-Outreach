import type { z } from "zod";

import { ExternalServiceError } from "@/lib/errors/domain-error";
import { logger } from "@/utils/logger";

const MAX_RETRIES = 2;

function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function validateAiJsonWithRetry<T>(options: {
  schema: z.ZodType<T>;
  generate: (attempt: number, previousError?: string) => Promise<string>;
  taskName: string;
}): Promise<T> {
  let previousError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const raw = await options.generate(attempt, previousError);
    const cleaned = stripCodeFences(raw);

    try {
      const parsedJson: unknown = JSON.parse(cleaned);
      const parsed = options.schema.safeParse(parsedJson);

      if (!parsed.success) {
        previousError = parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        logger.warn("AI schema validation failed", {
          taskName: options.taskName,
          attempt,
          error: previousError,
        });
        continue;
      }

      return parsed.data;
    } catch (error) {
      previousError =
        error instanceof Error ? error.message : "Invalid JSON syntax";
      logger.warn("AI JSON parse failed", {
        taskName: options.taskName,
        attempt,
        error: previousError,
      });
    }
  }

  throw new ExternalServiceError(
    `AI output validation failed for ${options.taskName} after retries`,
  );
}
