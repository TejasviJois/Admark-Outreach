import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { updateLeadSchema } from "@/schemas/lead/lead.schema";
import { LeadService } from "@/services/lead/lead.service";
import { logger } from "@/utils/logger";

type RouteContext = {
  params: Promise<{ leadId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { leadId } = await context.params;
    logger.info("GET /api/v1/leads/{leadId} started", { leadId });
    const service = new LeadService();
    const lead = await service.getLeadById(leadId);
    return successResponse(lead);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { leadId } = await context.params;
    logger.info("PATCH /api/v1/leads/{leadId} started", { leadId });
    const body = await request.json();
    const input = parseSchema(updateLeadSchema, body);
    const service = new LeadService();
    const lead = await service.updateLead(leadId, input);
    return successResponse(lead);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { leadId } = await context.params;
    logger.info("DELETE /api/v1/leads/{leadId} started", { leadId });
    const service = new LeadService();
    const lead = await service.archiveLead(leadId);
    return successResponse(lead);
  } catch (error) {
    return handleApiError(error);
  }
}
