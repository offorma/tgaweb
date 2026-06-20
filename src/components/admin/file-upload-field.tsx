"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, X, FileText } from "lucide-react";

interface FileUploadFieldProps {
  id?: string;
  value: string;
  onChange: (url: string, meta?: { fileType?: string; fileSize?: number }) => void;
  required?: boolean;
  accept?: string;
}

const DEFAULT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/jpeg,image/png,image/webp,image/gif,image/svg+xml";

export function FileUploadField({
  id,
  value,
  onChange,
  required,
  accept = DEFAULT_ACCEPT,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        onChange(data.url, { fileType: data.fileType, fileSize: data.fileSize });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleFile = (files: FileList | null) => {
    if (!files?.length) return;
    upload(files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files);
  };

  const isImage = value && /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(value);

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={value ?? ""}
        onChange={(e) => {
          setError(null);
          onChange(e.target.value);
        }}
        placeholder="Upload a file or paste a URL"
        required={required}
      />

      <div
        className={`relative flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors cursor-pointer ${
          dragOver
            ? "border-[var(--orange)] bg-[var(--orange)]/5"
            : "border-input hover:border-[var(--navy)]/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Drop a file here or click to upload
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" /> {error}
        </p>
      )}

      {value && (
        <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm">
          {isImage ? (
            <div className="relative h-10 w-10 rounded overflow-hidden border border-input shrink-0">
              <img src={value} alt="Preview" className="h-full w-full object-cover" />
            </div>
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        </div>
      )}
    </div>
  );
}
