"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, X } from "lucide-react";

interface ImageUploadFieldProps {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  /** "landscape" for aspect-video preview, "portrait" for square/round */
  previewStyle?: "landscape" | "portrait";
}

export function ImageUploadField({
  id,
  value,
  onChange,
  required,
  previewStyle = "landscape",
}: ImageUploadFieldProps) {
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
        onChange(data.url);
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

  return (
    <div className="space-y-2">
      {/* Manual URL input */}
      <Input
        id={id}
        value={value ?? ""}
        onChange={(e) => {
          setError(null);
          onChange(e.target.value);
        }}
        placeholder="/images/... or https URL"
        required={required}
      />

      {/* Drop zone / upload button */}
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
              Drop an image here or click to upload
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" /> {error}
        </p>
      )}

      {/* Preview */}
      {value && (
        <div
          className={
            previewStyle === "portrait"
              ? "h-24 w-24 rounded-full overflow-hidden border-2 border-[var(--orange)]/30"
              : "relative aspect-video rounded-lg overflow-hidden bg-muted border border-input max-h-32"
          }
        >
          <img
            src={value}
            alt="Preview"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = "0.3";
            }}
          />
        </div>
      )}
    </div>
  );
}
