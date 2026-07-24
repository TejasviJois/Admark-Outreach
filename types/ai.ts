export const AI_TASK_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

export type AiTaskStatus = (typeof AI_TASK_STATUSES)[number];

export const AI_TASK_TYPES = [
  "RESEARCH",
  "EMAIL_GENERATION",
  "REPLY_CLASSIFICATION",
] as const;

export type AiTaskType = (typeof AI_TASK_TYPES)[number];

/** DATABASE.md reply classification values (schema source of truth). */
export const REPLY_CLASSIFICATIONS = [
  "POSITIVE",
  "NEGATIVE",
  "OUT_OF_OFFICE",
  "NOT_INTERESTED",
  "SPAM",
  "UNKNOWN",
] as const;

export type ReplyClassification = (typeof REPLY_CLASSIFICATIONS)[number];

export type ResearchAiOutput = {
  summary: string;
  products: string[];
  painPoints: string[];
  opportunities: string[];
  confidenceScore: number;
};

export type EmailAiOutput = {
  subject: string;
  body: string;
};

export type ClassificationAiOutput = {
  classification: ReplyClassification;
  confidenceScore: number;
  rationale: string;
};

export type ResearchGenerationInput = {
  companyName: string;
  website: string | null;
  industry: string | null;
  country: string | null;
};

export type EmailGenerationInput = {
  companyName: string;
  firstName: string | null;
  researchSummary: string;
  painPoints: string[];
  opportunities: string[];
  subjectTemplate: string;
  bodyTemplate: string;
};

export type ReplyClassificationInput = {
  subject: string;
  body: string;
};
