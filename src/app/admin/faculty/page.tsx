"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  { name: "name", label: "Full Name", type: "text", required: true, maxLength: 100 },
  { name: "role", label: "Role / Title", type: "text", required: true, maxLength: 100, placeholder: "Head of School" },
  { name: "image", label: "Portrait Image", type: "image", required: true },
  { name: "order", label: "Display Order", type: "number", required: true },
  { name: "bio", label: "Biography", type: "textarea", required: true, rows: 4, maxLength: 1000 },
  { name: "quote", label: "Quote", type: "textarea", required: true, rows: 2, maxLength: 500 },
];

export default function AdminFacultyPage() {
  return (
    <>
      <AdminPageHeader
        title="Faculty"
        description="Manage teacher and staff profiles shown in the 'Meet Our Educators' section."
      />
      <ListEditor
        endpoint="/api/admin/faculty"
        title="Faculty"
        entityName="Faculty"
        fields={FIELDS}
        defaultValues={{
          name: "",
          role: "",
          image: "/images/teacher-",
          bio: "",
          quote: "",
          order: 0,
        }}
        renderCard={(item) => ({
          title: item.name,
          subtitle: item.role,
          image: item.image,
        })}
      />
    </>
  );
}
