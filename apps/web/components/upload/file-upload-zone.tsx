"use client";

import { useState, useCallback } from "react";
import { UploadCloud, FileText, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { uploadFile, UploadProgress } from "@/lib/upload";

interface FileUploadZoneProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function FileUploadZone({ projectId, onUploadComplete }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [projectId]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      const uploadId = crypto.randomUUID();
      
      setUploads((prev) => ({
        ...prev,
        [uploadId]: { filename: file.name, progress: 0, status: "uploading" },
      }));

      try {
        await uploadFile(projectId, file, (progress) => {
          setUploads((prev) => ({
            ...prev,
            [uploadId]: { ...prev[uploadId], progress },
          }));
        });

        setUploads((prev) => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], progress: 100, status: "processing" },
        }));

        if (onUploadComplete) onUploadComplete();
      } catch (err: any) {
        setUploads((prev) => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], status: "error", error: err.message },
        }));
      }
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const newUploads = { ...prev };
      delete newUploads[id];
      return newUploads;
    });
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
        }`}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
          title=""
        />
        <div className="p-4 bg-slate-800/80 rounded-full mb-4">
          <UploadCloud className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-base font-semibold text-white">Upload Knowledge Documents</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          Drag and drop PDF, Word, or Markdown files here, or click to browse.
        </p>
      </div>

      {/* Upload List */}
      {Object.entries(uploads).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploads).map(([id, upload]) => (
            <div
              key={id}
              className="flex items-center gap-4 p-3 bg-slate-900 border border-slate-800 rounded-xl"
            >
              <div className="p-2 bg-slate-800 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-200 truncate pr-4">
                    {upload.filename}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {upload.status === "error" ? "Failed" : `${upload.progress}%`}
                  </span>
                </div>
                
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      upload.status === "error" ? "bg-red-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                
                <p className="text-xs mt-1 text-slate-500">
                  {upload.status === "uploading" && "Uploading to storage..."}
                  {upload.status === "processing" && "Queued for AI processing"}
                  {upload.status === "error" && <span className="text-red-400">{upload.error}</span>}
                </p>
              </div>

              {["processing", "completed", "error"].includes(upload.status) ? (
                <button
                  onClick={() => removeUpload(id)}
                  className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="p-1.5">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
