export interface UploadProgress {
  filename: string;
  progress: number; // 0 to 100
  status: "pending" | "uploading" | "processing" | "completed" | "error";
  error?: string;
}

export async function uploadFile(
  projectId: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  try {
    // 1. Get presigned URL
    const presignRes = await fetch(`/api/projects/${projectId}/files/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    });

    if (!presignRes.ok) throw new Error("Failed to get upload URL");
    const { uploadUrl, objectKey } = await presignRes.json();

    // 2. Upload directly to MinIO/S3 using XMLHttpRequest for progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });

    // 3. Confirm upload with our backend
    const confirmRes = await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        objectKey,
        size: file.size,
      }),
    });

    if (!confirmRes.ok) {
      throw new Error("Failed to confirm upload");
    }

    return await confirmRes.json();
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}
