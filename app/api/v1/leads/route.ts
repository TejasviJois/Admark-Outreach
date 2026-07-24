import { handleApiError, successResponse } from "@/lib/api/response";
import { parseSchema } from "@/lib/validation/parse-schema";
import { listLeadsQuerySchema } from "@/schemas/lead/lead.schema";
import { LeadService } from "@/services/lead/lead.service";
import { logger } from "@/utils/logger";

export async function GET(request: Request) {
  try {
    logger.info("GET /api/v1/leads started");
    const url = new URL(request.url);
    const query = parseSchema(
      listLeadsQuerySchema,
      Object.fromEntries(url.searchParams.entries()),
    );
    const service = new LeadService();
    const result = await service.listLeads(query);
    return successResponse(result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
