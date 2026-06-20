"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  { name: "name", label: "Display Name", type: "text", required: true, maxLength: 200, placeholder: "e.g. 2026 School Calendar" },
  { name: "description", label: "Description", type: "textarea", required: false, rows: 2, maxLength: 500, placeholder: "Brief description of this file" },
  { name: "url", label: "File", type: "file", required: true },
  { name: "fileType", label: "File Type", type: "text", required: true, maxLength: 20, placeholder: "pdf" },
  { name: "fileSize", label: "File Size (bytes)", type: "number", required: false },
  { name: "order", label: "Display Order", type: "number", required: true },
  { name: "published", label: "Published (visible on site)", type: "checkbox" },
];

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDownloadsPage() {
  return (
    <>
      <AdminPageHeader
        title="Downloads"
        description="Manage downloadable files (PDFs, documents) shown in the site footer. Upload files to Cloudinary and set display names."
      />
      <ListEditor
        endpoint="/api/admin/downloads"
        title="Downloads"
        entityName="Download"
        fields={FIELDS}
        defaultValues={{
          name: "",
          description: "",
          url: "",
          fileType: "pdf",
          fileSize: 0,
          published: true,
          order: 0,
        }}
        renderCard={(item) => ({
          title: item.name,
          subtitle: item.description || `${item.fileType.toUpperCase()}${item.fileSize ? ` • ${formatFileSize(item.fileSize)}` : ""}`,
          badge: item.published ? item.fileType.toUpperCase() : "Draft",
        })}
      />
    </>
  );
}
