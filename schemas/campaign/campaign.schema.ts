import { z } from "zod";

import {
  CAMPAIGN_DESCRIPTION_MAX_LENGTH,
  CAMPAIGN_NAME_MAX_LENGTH,
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  LEAD_NAME_MAX_LENGTH,
  MAX_PAGE_LIMIT,
} from "@/constants/pagination";
import { CAMPAIGN_STATUSES } from "@/types/lead";

export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(CAMPAIGN_NAME_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .max(CAMPAIGN_DESCRIPTION_MAX_LENGTH)
    .optional()
    .nullable(),
  targetCountry: z
    .string()
    .trim()
    .max(LEAD_NAME_MAX_LENGTH)
    .optional()
    .nullable(),
  targetIndustry: z
    .string()
    .trim()
    .max(LEAD_NAME_MAX_LENGTH)
    .optional()
    .nullable(),
  defaultTemplateId: z.string().uuid().optional().nullable(),
});

export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT),
  status: campaignStatusSchema.optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
