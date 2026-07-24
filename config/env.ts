import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

function formatEnvErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");
}

/**
 * Validates and returns typed environment variables.
 * Lazy-loaded so Next.js builds can complete before secrets are present;
 * fails fast on first use when misconfigured.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${formatEnvErrors(parsed.error)}`,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;

/**
 * Browser-safe env subset (NEXT_PUBLIC_* only).
 */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid public environment configuration: ${formatEnvErrors(parsed.error)}`,
    );
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

const aiEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
});

export type AiEnv = z.infer<typeof aiEnvSchema>;

export function getAiEnv(): AiEnv {
  const parsed = aiEnvSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid AI environment configuration: ${formatEnvErrors(parsed.error)}`,
    );
  }

  return parsed.data;
}

const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),
});

export type EmailEnv = z.infer<typeof emailEnvSchema>;

export function getEmailEnv(): EmailEnv {
  const parsed = emailEnvSchema.safeParse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid email environment configuration: ${formatEnvErrors(parsed.error)}`,
    );
  }

  return parsed.data;
}

const cronEnvSchema = z.object({
  CRON_SECRET: z.string().min(1),
});

export function getCronSecret(): string {
  const parsed = cronEnvSchema.safeParse({
    CRON_SECRET: process.env.CRON_SECRET,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid cron environment configuration: ${formatEnvErrors(parsed.error)}`,
    );
  }

  return parsed.data.CRON_SECRET;
}

const webhookEnvSchema = z.object({
  WEBHOOK_SECRET: z.string().min(1),
});

export function getWebhookSecret(): string {
  const parsed = webhookEnvSchema.safeParse({
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid webhook environment configuration: ${formatEnvErrors(parsed.error)}`,
    );
  }

  return parsed.data.WEBHOOK_SECRET;
}
