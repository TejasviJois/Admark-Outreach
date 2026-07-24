export const LEAD_STATUSES = [
  "NEW",
  "RESEARCHING",
  "READY",
  "QUEUED",
  "EMAILED",
  "REPLIED",
  "BOUNCED",
  "UNSUBSCRIBED",
  "FAILED",
  "ARCHIVED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const RESEARCH_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type LeadRecord = {
  id: string;
  tenantId: string;
  campaignId: string;
  companyName: string;
  website: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  linkedinUrl: string | null;
  industry: string | null;
  country: string | null;
  employeeCount: number | null;
  leadStatus: LeadStatus;
  researchStatus: ResearchStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CampaignRecord = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  targetCountry: string | null;
  targetIndustry: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadImportRow = {
  companyName: string;
  website?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  linkedinUrl?: string;
  industry?: string;
  country?: string;
  employeeCount?: number;
};
