import { z } from "zod";

import { REPLY_CLASSIFICATIONS } from "@/types/ai";

export const researchAiOutputSchema = z
  .object({
    summary: z.string().min(1),
    products: z.array(z.string()),
    painPoints: z.array(z.string()),
    opportunities: z.array(z.string()),
    confidenceScore: z.number().min(0).max(1),
  })
  .strict();

export const emailAiOutputSchema = z
  .object({
    subject: z.string().min(1).max(200),
    body: z.string().min(1),
  })
  .strict();

export const classificationAiOutputSchema = z
  .object({
    classification: z.enum(REPLY_CLASSIFICATIONS),
    confidenceScore: z.number().min(0).max(1),
    rationale: z.string().min(1),
  })
  .strict();
