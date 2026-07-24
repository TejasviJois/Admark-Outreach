export type TemplateVars = Record<string, string | number | null | undefined>;

/**
 * Deterministic {{placeholder}} replacement.
 * Missing values become empty strings — never leave raw tags.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}

export function buildTemplateVars(input: {
  companyName?: string | null;
  firstName?: string | null;
  industry?: string | null;
  location?: string | null;
  services?: string[] | null;
}): TemplateVars {
  const services = input.services ?? [];
  const industry = input.industry?.trim();
  const location = input.location?.trim();
  const service1 = services[0]?.trim() ?? "";
  const service2 = services[1]?.trim() ?? "";

  return {
    company_name: input.companyName?.trim() ?? "",
    first_name: input.firstName?.trim() || "there",
    industry: industry ? ` (${industry})` : "",
    location: location ? ` in ${location}` : location === "" ? "" : "",
    // Plain forms for templates that use bare placeholders
    industry_raw: industry ?? "",
    location_raw: location ?? "",
    service_1: service1,
    service_2: service2 ? (service1 ? ` and ${service2}` : service2) : "",
  };
}

/** Score 0–100 from how filled the profile is. */
export function scoreCompanyProfile(input: {
  companyName?: string | null;
  about?: string | null;
  services?: string[] | null;
  contactEmail?: string | null;
  location?: string | null;
  website?: string | null;
  socialLinks?: Record<string, string> | null;
}): number {
  let score = 0;
  if (input.companyName?.trim()) score += 15;
  if (input.website?.trim()) score += 15;
  if (input.about && input.about.trim().length > 40) score += 25;
  else if (input.about?.trim()) score += 10;
  if ((input.services?.length ?? 0) >= 2) score += 20;
  else if ((input.services?.length ?? 0) === 1) score += 10;
  if (input.contactEmail?.trim()) score += 10;
  if (input.location?.trim()) score += 10;
  if (input.socialLinks && Object.keys(input.socialLinks).length > 0) score += 5;
  return Math.min(100, score);
}
