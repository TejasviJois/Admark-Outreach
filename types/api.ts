export type ApiSuccessResponse<TData, TMeta = Record<string, unknown>> = {
  success: true;
  data: TData;
  meta: TMeta;
};

export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResponse<TData, TMeta = Record<string, unknown>> =
  | ApiSuccessResponse<TData, TMeta>
  | ApiErrorResponse;
