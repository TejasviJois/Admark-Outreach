import { successResponse } from "@/lib/api/response";

/**
 * Versioned API root scaffolding.
 * Business resources are added in later sprints.
 */
export async function GET() {
  return successResponse({
    name: "admark-outreach-api",
    version: "v1",
  });
}
