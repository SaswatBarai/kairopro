import { randomUUID } from "node:crypto";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  EXTENSION_BY_MIME,
  MAX_UPLOAD_BYTES,
  type UploadMimeType,
} from "@kairopro/contracts";
import { ProviderError } from "../../lib/errors";

/**
 * S3-compatible object storage for project uploads (Phase 5). Local dev runs
 * against the MinIO container (`S3_ENDPOINT=http://localhost:9000`,
 * path-style) — 1:1 API parity with production AWS S3, where `S3_ENDPOINT`
 * is unset and the standard AWS credential/region chain applies. The bucket
 * (`kairopro-uploads` in dev) is created by the compose `minio-init` service.
 */
export interface ObjectStorage {
  put(
    projectId: string,
    objectName: string,
    body: Buffer,
    contentType: string,
  ): Promise<void>;
  get(projectId: string, objectName: string): Promise<Buffer>;
  deleteObject(projectId: string, objectName: string): Promise<void>;
  /** Remove every object under the project prefix — used by project delete. */
  deleteByPrefix(projectId: string): Promise<void>;
}

const S3_ENDPOINT_ENV = "S3_ENDPOINT";
const S3_BUCKET_ENV = "S3_BUCKET";
const S3_ACCESS_KEY_ENV = "S3_ACCESS_KEY";
const S3_SECRET_KEY_ENV = "S3_SECRET_KEY";
const S3_REGION_ENV = "S3_REGION";

let cached: ObjectStorage | undefined;

export function getObjectStorage(): ObjectStorage {
  cached ??= new S3ObjectStorage();
  return cached;
}

/** Test seam — construct a fresh client with explicit configuration. */
export function createObjectStorage(config: {
  endpoint?: string;
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}): ObjectStorage {
  return new S3ObjectStorage(config);
}

class S3ObjectStorage implements ObjectStorage {
  readonly #client: S3Client;
  readonly #bucket: string;

  constructor(config?: ConstructorConfig) {
    const endpoint = config?.endpoint ?? process.env[S3_ENDPOINT_ENV];
    const bucket = config?.bucket ?? process.env[S3_BUCKET_ENV];
    const region = config?.region ?? process.env[S3_REGION_ENV] ?? "us-east-1";
    const accessKeyId = config?.accessKeyId ?? process.env[S3_ACCESS_KEY_ENV];
    const secretAccessKey =
      config?.secretAccessKey ?? process.env[S3_SECRET_KEY_ENV];

    if (!bucket) {
      throw new ProviderError({
        message: "Upload storage is not configured: S3_BUCKET is not set",
      });
    }

    this.#bucket = bucket;
    this.#client = new S3Client({
      region,
      // MinIO (and every S3-compatible store) needs path-style addressing;
      // AWS accepts it too, so it is safe to key off the endpoint's presence.
      ...(endpoint
        ? {
            endpoint,
            forcePathStyle: true,
            ...(accessKeyId && secretAccessKey
              ? { credentials: { accessKeyId, secretAccessKey } }
              : {}),
          }
        : {}),
    });
  }

  async put(
    projectId: string,
    objectName: string,
    body: Buffer,
    contentType: string,
  ) {
    await this.#send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: objectKey(projectId, objectName),
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
      }),
    );
  }

  async get(projectId: string, objectName: string): Promise<Buffer> {
    const response = await this.#send(
      new GetObjectCommand({
        Bucket: this.#bucket,
        Key: objectKey(projectId, objectName),
      }),
    );
    const bytes = await response.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async deleteObject(projectId: string, objectName: string) {
    // S3 deletes are idempotent — a missing key is not an error (seeded demo
    // inputs predate the object store).
    await this.#send(
      new DeleteObjectsCommand({
        Bucket: this.#bucket,
        Delete: {
          Objects: [{ Key: objectKey(projectId, objectName) }],
          Quiet: true,
        },
      }),
    );
  }

  async deleteByPrefix(projectId: string) {
    const prefix = `projects/${projectId}/`;
    const keys: { Key: string }[] = [];

    let continuationToken: string | undefined;
    do {
      const listed = await this.#send(
        new ListObjectsV2Command({
          Bucket: this.#bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of listed.Contents ?? []) {
        if (object.Key) keys.push({ Key: object.Key });
      }
      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined;
    } while (continuationToken);

    // DeleteObjectsCommand accepts at most 1000 keys per call.
    for (let index = 0; index < keys.length; index += 1000) {
      await this.#send(
        new DeleteObjectsCommand({
          Bucket: this.#bucket,
          Delete: { Objects: keys.slice(index, index + 1000), Quiet: true },
        }),
      );
    }
  }

  async #send(command: any): Promise<any> {
    try {
      return await this.#client.send(command);
    } catch (cause) {
      throw new ProviderError({
        message: "Upload storage request failed",
        cause,
      });
    }
  }
}

type ConstructorConfig = Parameters<typeof createObjectStorage>[0];

function objectKey(projectId: string, objectName: string): string {
  return `projects/${projectId}/inputs/${objectName}`;
}

/**
 * The stored name is ALWAYS generated server-side — the uploaded filename is
 * never honored (hostile names like `../../etc/passwd` only ever survive, in
 * sanitized form, as the display-only `originalName`).
 */
export function generateStoredName(mime: UploadMimeType): string {
  const extension = EXTENSION_BY_MIME[mime];
  return `${randomUUID()}.${extension}`;
}

/** Display-only sanitization of the client-supplied filename. */
export function sanitizeOriginalName(name: string | undefined): string | null {
  if (!name) return null;
  const base = name.split(/[/\\]/).pop() ?? ""; // strip any path component
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (cleaned.length === 0) return null;
  return cleaned.length > 200 ? cleaned.slice(0, 200) : cleaned;
}

export const STORAGE_MAX_UPLOAD_BYTES = MAX_UPLOAD_BYTES;
