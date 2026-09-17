import {
  ACCEPTED_FILE_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_INPUT_FILES_PER_PROJECT,
  MAX_UPLOAD_BYTES,
} from "@kairopro/contracts";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  currentCount: number = 0,
): FileValidationResult {
  if (currentCount >= MAX_INPUT_FILES_PER_PROJECT) {
    return {
      valid: false,
      error: `A project carries at most ${MAX_INPUT_FILES_PER_PROJECT} files`,
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: "Files must be 10MB or smaller",
    };
  }

  const extension = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  const hasAllowedExt = (
    ACCEPTED_FILE_EXTENSIONS as readonly string[]
  ).includes(extension);
  const hasAllowedMime = (
    ALLOWED_UPLOAD_MIME_TYPES as readonly string[]
  ).includes(file.type);

  if (!hasAllowedExt && !hasAllowedMime) {
    return {
      valid: false,
      error: "Unsupported file type — PDF, DOCX, TXT, MD, PNG, JPG, SVG only",
    };
  }

  return { valid: true };
}
