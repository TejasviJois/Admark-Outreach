import { z } from "zod";

import { ValidationError } from "@/lib/errors/domain-error";

export function parseSchema<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; ");
    throw new ValidationError(message);
  }

  return parsed.data;
}
