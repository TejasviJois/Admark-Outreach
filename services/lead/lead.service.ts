import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors/domain-error";
import { CampaignRepository } from "@/repositories/campaign/campaign.repository";
import { LeadRepository } from "@/repositories/lead/lead.repository";
import type { ListLeadsQuery, UpdateLeadInput } from "@/schemas/lead/lead.schema";
import { leadImportRowSchema } from "@/schemas/lead/lead.schema";
import { AuthService } from "@/services/auth/auth.service";
import type { LeadImportRow, LeadRecord } from "@/types/lead";
import { parseCsv } from "@/utils/csv/parse-csv";
import { logger } from "@/utils/logger";

export type LeadImportSummary = {
  importedCount: number;
  skippedDuplicateCount: number;
  invalidRowCount: number;
  importedLeadIds: string[];
  duplicateEmails: string[];
  invalidRows: Array<{ rowNumber: number; errors: string }>;
};

const HEADER_ALIASES: Record<string, keyof LeadImportRow> = {
  company_name: "companyName",
  companyname: "companyName",
  company: "companyName",
  website: "website",
  first_name: "firstName",
  firstname: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  email: "email",
  linkedin_url: "linkedinUrl",
  linkedinurl: "linkedinUrl",
  linkedin: "linkedinUrl",
  industry: "industry",
  country: "country",
  employee_count: "employeeCount",
  employeecount: "employeeCount",
};

export class LeadService {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly leadRepository: LeadRepository = new LeadRepository(),
    private readonly campaignRepository: CampaignRepository = new CampaignRepository(),
  ) {}

  async listLeads(query: ListLeadsQuery) {
    const profile = await this.authService.getCurrentUserProfile();
    const result = await this.leadRepository.findMany(profile.tenant.id, {
      campaignId: query.campaignId,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return {
      ...result,
      page: query.page,
      limit: query.limit,
    };
  }

  async getLeadById(leadId: string): Promise<LeadRecord> {
    const profile = await this.authService.getCurrentUserProfile();
    const lead = await this.leadRepository.findById(profile.tenant.id, leadId);

    if (!lead) {
      throw new NotFoundError("Lead not found");
    }

    return lead;
  }

  async updateLead(leadId: string, input: UpdateLeadInput): Promise<LeadRecord> {
    const profile = await this.authService.getCurrentUserProfile();
    const existing = await this.leadRepository.findById(profile.tenant.id, leadId);

    if (!existing) {
      throw new NotFoundError("Lead not found");
    }

    if (input.email && input.email.toLowerCase() !== existing.email.toLowerCase()) {
      const conflict = await this.leadRepository.findByEmailInTenant(
        profile.tenant.id,
        input.email,
      );
      if (conflict) {
        throw new ConflictError("A lead with this email already exists");
      }
    }

    return this.leadRepository.update(profile.tenant.id, leadId, input);
  }

  async archiveLead(leadId: string): Promise<LeadRecord> {
    const profile = await this.authService.getCurrentUserProfile();
    const existing = await this.leadRepository.findById(profile.tenant.id, leadId);

    if (!existing) {
      throw new NotFoundError("Lead not found");
    }

    return this.leadRepository.softDelete(profile.tenant.id, leadId);
  }

  async importLeads(
    campaignId: string,
    fileName: string,
    fileContent: string,
  ): Promise<LeadImportSummary> {
    const profile = await this.authService.getCurrentUserProfile();

    if (!fileName.toLowerCase().endsWith(".csv")) {
      throw new ValidationError("Unsupported format. CSV file required");
    }

    if (!fileContent.trim()) {
      throw new ValidationError("File required");
    }

    const campaign = await this.campaignRepository.findById(
      profile.tenant.id,
      campaignId,
    );

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    const { headers, rows } = parseCsv(fileContent);
    const normalizedHeaders = headers.map((header) =>
      header.trim().toLowerCase().replace(/\s+/g, "_"),
    );

    const mappedKeys = new Set(
      normalizedHeaders
        .map((header) => HEADER_ALIASES[header])
        .filter(Boolean),
    );

    if (!mappedKeys.has("companyName") || !mappedKeys.has("email")) {
      throw new ValidationError("Missing columns: company_name, email");
    }

    const invalidRows: LeadImportSummary["invalidRows"] = [];
    const validRows: LeadImportRow[] = [];

    rows.forEach((row, index) => {
      const mapped: Record<string, string> = {};
      normalizedHeaders.forEach((header, headerIndex) => {
        const key = HEADER_ALIASES[header];
        if (key) {
          mapped[key] = row[headerIndex] ?? "";
        }
      });

      const parsed = leadImportRowSchema.safeParse(mapped);
      if (!parsed.success) {
        invalidRows.push({
          rowNumber: index + 2,
          errors: parsed.error.issues.map((issue) => issue.message).join("; "),
        });
        return;
      }

      validRows.push({
        companyName: parsed.data.companyName,
        website: parsed.data.website,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email.toLowerCase(),
        linkedinUrl: parsed.data.linkedinUrl,
        industry: parsed.data.industry,
        country: parsed.data.country,
        employeeCount: parsed.data.employeeCount,
      });
    });

    if (validRows.length === 0 && invalidRows.length > 0) {
      throw new ValidationError("Invalid CSV rows. No valid leads to import");
    }

    const uniqueByEmail = new Map<string, LeadImportRow>();
    for (const row of validRows) {
      if (!uniqueByEmail.has(row.email)) {
        uniqueByEmail.set(row.email, row);
      }
    }

    const candidateRows = Array.from(uniqueByEmail.values());
    const existingEmails = await this.leadRepository.findEmailsInTenant(
      profile.tenant.id,
      candidateRows.map((row) => row.email),
    );
    const existingSet = new Set(existingEmails);

    const toImport = candidateRows.filter((row) => !existingSet.has(row.email));
    const duplicateEmails = candidateRows
      .filter((row) => existingSet.has(row.email))
      .map((row) => row.email);

    if (toImport.length === 0 && duplicateEmails.length > 0 && invalidRows.length === 0) {
      throw new ConflictError("Duplicate import. All emails already exist for this tenant");
    }

    const imported = await this.leadRepository.createMany(
      profile.tenant.id,
      campaignId,
      toImport,
    );

    logger.info("Lead import completed", {
      importedCount: imported.length,
      skippedDuplicateCount: duplicateEmails.length,
      invalidRowCount: invalidRows.length,
    });

    return {
      importedCount: imported.length,
      skippedDuplicateCount: duplicateEmails.length,
      invalidRowCount: invalidRows.length,
      importedLeadIds: imported.map((lead) => lead.id),
      duplicateEmails,
      invalidRows,
    };
  }
}
