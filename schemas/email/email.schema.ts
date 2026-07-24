import { z } from "zod";

export const createEmailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subjectTemplate: z.string().trim().min(1),
  bodyTemplate: z.string().trim().min(1),
  isDefault: z.boolean().optional(),
});

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" },
);

export const generateEmailSchema = z.object({
  leadId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  regenerate: z.boolean().optional().default(false),
});

export const queueEmailSchema = z.object({
  generatedEmailId: z.string().uuid(),
  scheduledAt: z.string().datetime().optional(),
});

export const sendEmailSchema = z.object({
  queueId: z.string().uuid().optional(),
  generatedEmailId: z.string().uuid().optional(),
}).refine((value) => Boolean(value.queueId || value.generatedEmailId), {
  message: "queueId or generatedEmailId is required",
});

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export type GenerateEmailInput = z.infer<typeof generateEmailSchema>;
export type QueueEmailInput = z.infer<typeof queueEmailSchema>;
export type SendEmailInputBody = z.infer<typeof sendEmailSchema>;
