export interface DocumentData {
  id: string;
  projectId: string;
  uploadedById: string;
  filename: string;
  originalFilename: string;
  contentType: string;
  storagePath: string;
  fileSize: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  _count?: { chunks: number };
  uploadedBy?: { name: string | null; email: string; image: string | null };
}

export interface UploadPresignRequest {
  filename: string;
  contentType: string;
}

export interface UploadPresignResponse {
  uploadUrl: string;
  objectKey: string;
}
