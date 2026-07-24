import type { EmailTemplateRecord } from "@/repositories/email/email-template.repository";
import {
  buildTemplateVars,
  renderTemplate,
} from "@/lib/email/template-engine";

export type TemplateEmailInput = {
  companyName?: string | null;
  firstName?: string | null;
  industry?: string | null;
  location?: string | null;
  services?: string[] | null;
  subjectTemplate: string;
  bodyTemplate: string;
};

export type TemplateEmailResult = {
  subject: string;
  body: string;
  model: string;
  version: string;
};

export interface TemplateEmailProvider {
  render(input: TemplateEmailInput): TemplateEmailResult;
}

export class DeterministicTemplateEmailProvider implements TemplateEmailProvider {
  render(input: TemplateEmailInput): TemplateEmailResult {
    const vars = buildTemplateVars(input);
    // Support both {{industry}} meaning decorated or raw — map industry to raw for simple templates
    const mapped = {
      ...vars,
      industry: (vars.industry_raw as string) || "",
      location: (vars.location_raw as string) || "",
      service_2: input.services?.[1]?.trim() ?? "",
    };
    return {
      subject: renderTemplate(input.subjectTemplate, mapped),
      body: renderTemplate(input.bodyTemplate, mapped),
      model: "template-engine",
      version: "template.v1",
    };
  }
}

export function createTemplateEmailProvider(): TemplateEmailProvider {
  return new DeterministicTemplateEmailProvider();
}

export function templateToInput(
  template: EmailTemplateRecord,
  rest: Omit<TemplateEmailInput, "subjectTemplate" | "bodyTemplate">,
): TemplateEmailInput {
  return {
    ...rest,
    subjectTemplate: template.subjectTemplate,
    bodyTemplate: template.bodyTemplate,
  };
}
