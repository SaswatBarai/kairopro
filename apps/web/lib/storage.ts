import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Dual-mode: MinIO locally, real S3 in production
export const storage = new S3Client(
  process.env.NODE_ENV === "production"
    ? {
        region: process.env.AWS_REGION ?? "us-east-1",
        // IAM role provides credentials in ECS
      }
    : {
        endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
        region: process.env.AWS_REGION ?? "us-east-1",
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
          secretAccessKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
        },
        forcePathStyle: true, // Required for MinIO
      }
);

export const BUCKET = process.env.MINIO_BUCKET ?? "kairopro";

// ---------------------------------------------------------------------------
// Presigned upload URL (PUT) — 15 minutes
// ---------------------------------------------------------------------------
export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(storage, command, { expiresIn: 900 });
}

// ---------------------------------------------------------------------------
// Presigned download URL (GET) — 1 hour
// ---------------------------------------------------------------------------
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(storage, command, { expiresIn: 3600 });
}

// ---------------------------------------------------------------------------
// Delete object
// ---------------------------------------------------------------------------
export async function deleteObject(key: string): Promise<void> {
  await storage.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
