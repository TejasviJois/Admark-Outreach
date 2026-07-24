/**
 * Future: rewrite an already-rendered template email using structured profile JSON.
 * V1 stub — must never be required for send.
 */
export type GeminiPersonalizationInput = {
  companyProfile: Record<string, unknown>;
  subject: string;
  body: string;
};

export type GeminiPersonalizationResult = {
  subject: string;
  body: string;
};

export interface GeminiPersonalizationProvider {
  personalize(
    input: GeminiPersonalizationInput,
  ): Promise<GeminiPersonalizationResult>;
}

export class StubGeminiPersonalizationProvider
  implements GeminiPersonalizationProvider
{
  async personalize(
    input: GeminiPersonalizationInput,
  ): Promise<GeminiPersonalizationResult> {
    // AI enhancement is deferred — return template unchanged.
    return { subject: input.subject, body: input.body };
  }
}

export function createGeminiPersonalizationProvider(): GeminiPersonalizationProvider {
  return new StubGeminiPersonalizationProvider();
}

export function isAiPersonalizationEnabled(): boolean {
  return (
    process.env.ENABLE_AI_PERSONALIZATION === "true" &&
    Boolean(process.env.GEMINI_API_KEY?.trim())
  );
}
