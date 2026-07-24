/**
 * Service-layer conventions:
 * - Services own business logic and orchestration.
 * - Services call repositories and providers only.
 * - Services must not touch HTTP request/response objects.
 * - API route handlers remain thin controllers.
 */
export type ServiceResult<T> = T;
