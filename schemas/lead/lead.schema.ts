import { z } from "zod";

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  LEAD_NAME_MAX_LENGTH,
  MAX_PAGE_LIMIT,
} from "@/constants/pagination";
import { LEAD_STATUSES, RESEARCH_STATUSES } from "@/types/lead";

const optionalUrl = z.preprocess((value) => {
  if (value === "") {
    return null;
  }
  return value;
}, z.string().url().nullable().optional());

export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const researchStatusSchema = z.enum(RESEARCH_STATUSES);

export const updateLeadSchema = z
  .object({
    companyName: z.string().trim().min(1).max(LEAD_NAME_MAX_LENGTH).optional(),
    website: optionalUrl,
    firstName: z.string().trim().max(LEAD_NAME_MAX_LENGTH).nullable().optional(),
    lastName: z.string().trim().max(LEAD_NAME_MAX_LENGTH).nullable().optional(),
    email: z.string().trim().email().optional(),
    linkedinUrl: optionalUrl,
    industry: z.string().trim().max(LEAD_NAME_MAX_LENGTH).nullable().optional(),
    country: z.string().trim().max(LEAD_NAME_MAX_LENGTH).nullable().optional(),
    employeeCount: z.number().int().positive().nullable().optional(),
    leadStatus: leadStatusSchema.optional(),
    researchStatus: researchStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const listLeadsQuerySchema = z.object({
  campaignId: z.string().uuid().optional(),
  status: leadStatusSchema.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT),
});

export const leadImportRowSchema = z.object({
  companyName: z.string().trim().min(1).max(LEAD_NAME_MAX_LENGTH),
  website: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return undefined;
      const trimmed = v.trim();
      if (!trimmed) return undefined;
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    })
    .pipe(z.string().url().optional()),
  firstName: z.string().trim().max(LEAD_NAME_MAX_LENGTH).optional(),
  lastName: z.string().trim().max(LEAD_NAME_MAX_LENGTH).optional(),
  email: z.string().trim().email(),
  linkedinUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return undefined;
      const trimmed = v.trim();
      if (!trimmed) return undefined;
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    })
    .pipe(z.string().url().optional()),
  industry: z.string().trim().max(LEAD_NAME_MAX_LENGTH).optional(),
  country: z.string().trim().max(LEAD_NAME_MAX_LENGTH).optional(),
  employeeCount: z.coerce.number().int().positive().optional(),
});

export const leadImportRequestSchema = z.object({
  campaignId: z.string().uuid(),
});

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type LeadImportRowInput = z.infer<typeof leadImportRowSchema>;
