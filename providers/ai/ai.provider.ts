import type {
  ClassificationAiOutput,
  EmailAiOutput,
  EmailGenerationInput,
  ReplyClassificationInput,
  ResearchAiOutput,
  ResearchGenerationInput,
} from "@/types/ai";

export interface AiProvider {
  generateResearch(input: ResearchGenerationInput): Promise<{
    output: ResearchAiOutput;
    model: string;
    promptVersion: string;
  }>;
  generateEmail(input: EmailGenerationInput): Promise<{
    output: EmailAiOutput;
    model: string;
    promptVersion: string;
  }>;
  classifyReply(input: ReplyClassificationInput): Promise<{
    output: ClassificationAiOutput;
    model: string;
    promptVersion: string;
  }>;
}
