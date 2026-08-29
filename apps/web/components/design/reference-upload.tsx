"use client";

import { useState } from "react";
import { Upload, X, FileImage, Loader2 } from "lucide-react";

export function ReferenceUpload({ projectId, onUploadComplete }: { projectId: string, onUploadComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    
    try {
        // Simple stub logic for UI flow, actual S3 upload in Next.js is configured in phase 3
        for (const file of files) {
            // Get presigned URL
            const presignRes = await fetch(`/api/projects/${projectId}/files/presign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: file.name, contentType: file.type })
            });
            const { uploadUrl, objectKey } = await presignRes.json();

            if (uploadUrl) {
                // Upload to MinIO/S3
                await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type }
                });

                // Confirm with Next.js
                await fetch(`/api/projects/${projectId}/files`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ objectKey, filename: file.name, contentType: file.type, size: file.size })
                });
            }
        }
        
        setFiles([]);
        onUploadComplete();
    } catch (err) {
        console.error(err);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
      <h3 className="text-lg font-bold text-white mb-2">Design References</h3>
      <p className="text-sm text-slate-400 mb-6">Upload screenshots of dashboards or websites you like. The AI will use these to influence the design system.</p>
      
      <div 
        className="border-2 border-dashed border-slate-700 hover:border-indigo-500 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer mb-4"
        onClick={() => document.getElementById('reference-upload')?.click()}
      >
        <Upload className="w-8 h-8 text-slate-500 mb-3" />
        <div className="text-sm font-medium text-slate-300">Click to upload references</div>
        <div className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</div>
        <input 
            id="reference-upload" 
            type="file" 
            multiple 
            accept="image/png, image/jpeg" 
            className="hidden"
            onChange={(e) => {
                if (e.target.files) {
                    setFiles(Array.from(e.target.files));
                }
            }}
        />
      </div>

      {files.length > 0 && (
          <div className="space-y-3 mb-4">
              {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                          <FileImage className="w-5 h-5 text-indigo-400" />
                          <span className="text-sm text-slate-300 line-clamp-1">{file.name}</span>
                      </div>
                      <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400">
                          <X className="w-4 h-4" />
                      </button>
                  </div>
              ))}
          </div>
      )}

      {files.length > 0 && (
          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? "Uploading..." : `Upload ${files.length} Reference${files.length > 1 ? 's' : ''}`}
          </button>
      )}
    </div>
  );
}
