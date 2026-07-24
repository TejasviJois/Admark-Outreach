import { GoogleGenerativeAI } from "@google/generative-ai";

import { getAiEnv } from "@/config/env";
import { validateAiJsonWithRetry } from "@/lib/ai/validate-and-retry";
import type { AiProvider } from "@/providers/ai/ai.provider";
import {
  emailGenerationPrompt,
  replyClassificationPrompt,
  researchPrompt,
} from "@/prompts/registry";
import {
  classificationAiOutputSchema,
  emailAiOutputSchema,
  researchAiOutputSchema,
} from "@/schemas/ai/ai-output.schema";
import type {
  EmailGenerationInput,
  ReplyClassificationInput,
  ResearchGenerationInput,
} from "@/types/ai";

const MODEL = "gemini-2.0-flash";

export class GeminiAiProvider implements AiProvider {
  private getModel(temperature: number, topP: number) {
    const { GEMINI_API_KEY } = getAiEnv();
    const client = new GoogleGenerativeAI(GEMINI_API_KEY);
    return client.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature,
        topP,
        responseMimeType: "application/json",
      },
    });
  }

  async generateResearch(input: ResearchGenerationInput) {
    const model = this.getModel(
      researchPrompt.temperature,
      researchPrompt.topP,
    );
    const userPrompt = JSON.stringify(input);

    const output = await validateAiJsonWithRetry({
      schema: researchAiOutputSchema,
      taskName: "research",
      generate: async (attempt, previousError) => {
        const retryBlock = previousError
          ? `\nPrevious validation error: ${previousError}\nReturn corrected JSON only.`
          : "";
        const result = await model.generateContent(
          `${researchPrompt.system}\n\nInput:\n${userPrompt}${retryBlock}`,
        );
        return result.response.text();
      },
    });

    return {
      output,
      model: MODEL,
      promptVersion: researchPrompt.version,
    };
  }

  async generateEmail(input: EmailGenerationInput) {
    const model = this.getModel(
      emailGenerationPrompt.temperature,
      emailGenerationPrompt.topP,
    );
    const userPrompt = JSON.stringify(input);

    const output = await validateAiJsonWithRetry({
      schema: emailAiOutputSchema,
      taskName: "email_generation",
      generate: async (attempt, previousError) => {
        const retryBlock = previousError
          ? `\nPrevious validation error: ${previousError}\nReturn corrected JSON only.`
          : "";
        const result = await model.generateContent(
          `${emailGenerationPrompt.system}\n\nInput:\n${userPrompt}${retryBlock}`,
        );
        return result.response.text();
      },
    });

    return {
      output,
      model: MODEL,
      promptVersion: emailGenerationPrompt.version,
    };
  }

  async classifyReply(input: ReplyClassificationInput) {
    const model = this.getModel(
      replyClassificationPrompt.temperature,
      replyClassificationPrompt.topP,
    );
    const userPrompt = JSON.stringify(input);

    const output = await validateAiJsonWithRetry({
      schema: classificationAiOutputSchema,
      taskName: "reply_classification",
      generate: async (attempt, previousError) => {
        const retryBlock = previousError
          ? `\nPrevious validation error: ${previousError}\nReturn corrected JSON only.`
          : "";
        const result = await model.generateContent(
          `${replyClassificationPrompt.system}\n\nInput:\n${userPrompt}${retryBlock}`,
        );
        return result.response.text();
      },
    });

    return {
      output,
      model: MODEL,
      promptVersion: replyClassificationPrompt.version,
    };
  }
}

export function createAiProvider(): AiProvider {
  return new GeminiAiProvider();
}
