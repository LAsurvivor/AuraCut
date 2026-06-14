export type ErrorCode =
  | "background_removal_failed"
  | "background_removal_invalid_response"
  | "clipdrop_not_configured"
  | "cloudinary_not_configured"
  | "empty_upload"
  | "file_too_large"
  | "image_delete_failed"
  | "image_hosting_failed"
  | "image_job_timeout"
  | "image_lookup_failed"
  | "image_not_found"
  | "internal_error"
  | "invalid_delete_token"
  | "invalid_image_id"
  | "invalid_job_id"
  | "job_not_found"
  | "missing_delete_token"
  | "missing_file"
  | "not_found"
  | "preset_asset_missing"
  | "preset_not_found"
  | "service_not_configured"
  | "too_many_files"
  | "unsupported_file_type";

export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
