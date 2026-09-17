import {
  CreateTextInputSchema,
  InputKindSchema,
  MAX_INPUT_FILES_PER_PROJECT,
  MAX_UPLOAD_BYTES,
  UploadMimeTypeSchema,
  type Input,
  type InputKind,
  type UploadMimeType,
} from "@kairopro/contracts";
import type { RequestContext } from "../../lib/context";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { logger, withCorrelation } from "../../platform/logger";
import { ownerOf } from "../org/access";
import { extractByMime } from "./extract";
import {
  createInput,
  countFileInputs,
  deleteInputsByStoredNames,
  deleteInputRow,
  findInputById,
  findTextInput,
  listInputsByProject,
  updateInput,
  type InputRow,
} from "./input.repository";
import { sniffMime } from "./sniff";
import {
  generateStoredName,
  getObjectStorage,
  sanitizeOriginalName,
  type ObjectStorage,
} from "./storage";

/**
 * Input domain service (Phase 5): a project's TEXT input (upserted) and its
 * FILE inputs (max 5, sniffed, stored in S3-compatible storage, extracted
 * best-effort). Extraction failure records a null extraction and never
 * fails the request.
 */

/** What the route layer hands the service — transport-agnostic. */
export interface IncomingUpload {
  buffer: Buffer;
  originalName?: string;
}

export async function listInputs(
  projectId: string,
  ctx: RequestContext,
): Promise<Input[]> {
  await requireProject(projectId, ctx);
  const rows = await listInputsByProject(projectId);
  return rows.map(toInput);
}

/** Upsert the project's single TEXT input — the requirements textarea. */
export async function saveTextInput(
  projectId: string,
  text: unknown,
  ctx: RequestContext,
): Promise<Input> {
  await requireProject(projectId, ctx);
  const parsed = CreateTextInputSchema.safeParse({ kind: "TEXT", text });
  if (!parsed.success) {
    throw new ValidationError({
      message: "Requirements text must be 1–50,000 characters",
      details: parsed.error.flatten(),
    });
  }

  const existing = await findTextInput(projectId);
  if (existing) {
    const row = await updateInput(existing.id, {
      extraction: parsed.data.text,
      sizeBytes: Buffer.byteLength(parsed.data.text, "utf8"),
    });
    return toInput(row);
  }
  const row = await createInput({
    projectId,
    kind: "TEXT",
    originalName: null,
    mimeType: null,
    storedName: "",
    sizeBytes: Buffer.byteLength(parsed.data.text, "utf8"),
    extraction: parsed.data.text,
  });
  return toInput(row);
}

/**
 * Store uploaded files. All-or-nothing: every file is validated (allowlist
 * by sniffed type, size, per-project count) before anything is written; a
 * failure partway cleans up the objects it managed to put.
 */
export async function createFileInputs(
  projectId: string,
  uploads: IncomingUpload[],
  ctx: RequestContext,
): Promise<Input[]> {
  await requireProject(projectId, ctx);
  if (uploads.length === 0) {
    throw new ValidationError({ message: "No files were uploaded" });
  }

  // 1. Validate everything — type (sniffed, never client-declared), size, count.
  const staged = uploads.map((upload) => {
    if (upload.buffer.length === 0) {
      throw new ValidationError({ message: "One of the files is empty" });
    }
    if (upload.buffer.length > MAX_UPLOAD_BYTES) {
      throw new ValidationError({
        message: "Files must be 10MB or smaller",
        details: { originalName: sanitizeOriginalName(upload.originalName) },
      });
    }
    const mimeType = sniffMime(upload.buffer);
    if (!mimeType) {
      throw new ValidationError({
        message:
          "Unsupported file type — PDF, DOCX, TXT, MD, PNG, JPG, SVG only",
        details: { originalName: sanitizeOriginalName(upload.originalName) },
      });
    }
    return { upload, mimeType };
  });

  const existingCount = await countFileInputs(projectId);
  if (existingCount + staged.length > MAX_INPUT_FILES_PER_PROJECT) {
    throw new ValidationError({
      message: `A project carries at most ${MAX_INPUT_FILES_PER_PROJECT} files (${existingCount} already attached)`,
    });
  }

  // 2. Store objects, extract best-effort, create rows — rolling back the
  //    objects if any write fails (rows were not yet created).
  const storage = getObjectStorage();
  const putNames: string[] = [];
  try {
    const rows: InputRow[] = [];
    for (const { upload, mimeType } of staged) {
      const storedName = generateStoredName(mimeType);
      await storage.put(projectId, storedName, upload.buffer, mimeType);
      putNames.push(storedName);

      const extraction = await extractByMime(mimeType, upload.buffer);
      rows.push(
        await createInput({
          projectId,
          kind: "FILE",
          originalName: sanitizeOriginalName(upload.originalName),
          mimeType,
          storedName,
          sizeBytes: upload.buffer.length,
          extraction,
        }),
      );
    }
    return rows.map(toInput);
  } catch (cause) {
    // Rows may exist for earlier files in the batch — remove them, then the
    // objects, so a failed batch leaves nothing behind.
    for (const name of putNames) {
      await storage.deleteObject(projectId, name).catch(() => undefined);
    }
    await deleteRecentInputs(projectId, putNames);
    throw cause;
  }
}

export async function deleteInput(
  projectId: string,
  inputId: string,
  ctx: RequestContext,
): Promise<void> {
  await requireProject(projectId, ctx);
  const row = await findInputById(inputId);
  if (!row || row.projectId !== projectId) {
    throw new NotFoundError({ message: "Input not found" });
  }

  if (row.kind === "FILE" && row.storedName) {
    // Best-effort: an orphaned object is a cleanup problem, not a reason to
    // keep the row (seeded demo inputs predate the object store).
    await getObjectStorage()
      .deleteObject(projectId, row.storedName)
      .catch((cause) =>
        withCorrelation(logger, { projectId }).warn(
          { err: cause, inputId },
          "failed to delete stored upload; row removed anyway",
        ),
      );
  }
  await deleteInputRow(inputId);
}

/** Remove every upload object under the project — best-effort, used by
 * project deletion. Never throws (the DB cascade is the source of truth). */
export async function purgeProjectUploads(projectId: string): Promise<void> {
  try {
    await getObjectStorage().deleteByPrefix(projectId);
  } catch (cause) {
    withCorrelation(logger, { projectId }).warn(
      { err: cause },
      "failed to purge project uploads from storage",
    );
  }
}

async function requireProject(
  projectId: string,
  ctx: RequestContext,
): Promise<void> {
  const project = await ownerOf(projectId, ctx);
  if (!project) {
    throw new NotFoundError({ message: "Project not found" });
  }
}

async function deleteRecentInputs(
  projectId: string,
  storedNames: string[],
): Promise<void> {
  if (storedNames.length === 0) return;
  await deleteInputsByStoredNames(projectId, storedNames);
}

export function toInput(row: InputRow): Input {
  const kind: InputKind = InputKindSchema.parse(row.kind);
  const mimeType = row.mimeType
    ? UploadMimeTypeSchema.safeParse(row.mimeType)
    : null;
  return {
    id: row.id,
    projectId: row.projectId,
    kind,
    originalName: row.originalName ?? null,
    mimeType: mimeType?.success ? mimeType.data : null,
    sizeBytes: row.sizeBytes,
    extraction: row.extraction ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export type { UploadMimeType, ObjectStorage };
