import nodemailer from "nodemailer";

import { getSmtpEnv, hasSmtpConfig, hasResendConfig, getEmailFrom } from "@/config/env";
import { ExternalServiceError } from "@/lib/errors/domain-error";
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from "@/providers/email/email.provider";
import { ResendEmailProvider } from "@/providers/email/resend-email.provider";

export class SmtpEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const env = getSmtpEnv();
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.body,
      });

      const id = info.messageId || `smtp-${Date.now()}`;
      return { providerMessageId: id };
    } catch (error) {
      throw new ExternalServiceError(
        error instanceof Error ? error.message : "SMTP send failed",
      );
    }
  }
}

/** Local/dev fallback that does not send real email. */
export class LoggingEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const id = `local-${Date.now()}`;
    console.info(
      JSON.stringify({
        level: "info",
        message: "Email send simulated (SMTP/Resend not configured)",
        context: { to: input.to, subject: input.subject, id },
      }),
    );
    return { providerMessageId: id };
  }
}

export function createEmailProvider(): EmailProvider {
  if (hasSmtpConfig()) {
    return new SmtpEmailProvider();
  }
  if (hasResendConfig()) {
    return new ResendEmailProvider();
  }
  return new LoggingEmailProvider();
}

export type EmailConnectionStatus = {
  configured: boolean;
  provider: "smtp" | "resend" | "none";
  from: string | null;
  missing: string[];
};

export function getEmailConnectionStatus(): EmailConnectionStatus {
  if (hasSmtpConfig()) {
    return {
      configured: true,
      provider: "smtp",
      from: getEmailFrom(),
      missing: [],
    };
  }

  if (hasResendConfig()) {
    return {
      configured: true,
      provider: "resend",
      from: getEmailFrom(),
      missing: [],
    };
  }

  const missing: string[] = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!process.env.SMTP_USER) missing.push("SMTP_USER");
  if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!process.env.EMAIL_FROM) missing.push("EMAIL_FROM");

  return {
    configured: false,
    provider: "none",
    from: null,
    missing,
  };
}
