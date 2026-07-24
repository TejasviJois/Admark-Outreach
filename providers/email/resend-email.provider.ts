import { Resend } from "resend";

import { getEmailEnv } from "@/config/env";
import { ExternalServiceError } from "@/lib/errors/domain-error";
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from "@/providers/email/email.provider";

export class ResendEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const env = getEmailEnv();
    const resend = new Resend(env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.body,
    });

    if (error || !data?.id) {
      throw new ExternalServiceError(
        error?.message ?? "Email provider send failed",
      );
    }

    return { providerMessageId: data.id };
  }
}

/** Local/dev fallback that does not send real email. */
export class LoggingEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const id = `local-${Date.now()}`;
    console.info(
      JSON.stringify({
        level: "info",
        message: "Email send simulated",
        context: { to: input.to, subject: input.subject, id },
      }),
    );
    return { providerMessageId: id };
  }
}

export function createEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    return new ResendEmailProvider();
  }
  return new LoggingEmailProvider();
}
