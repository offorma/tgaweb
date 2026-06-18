"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  { name: "step", label: "Step Number", type: "text", required: true, maxLength: 10, placeholder: "01, 02, 03..." },
  { name: "title", label: "Title", type: "text", required: true, maxLength: 100 },
  { name: "description", label: "Description", type: "textarea", required: true, rows: 4, maxLength: 1000 },
  { name: "order", label: "Display Order", type: "number", required: true },
];

export default function AdminAdmissionsPage() {
  return (
    <>
      <AdminPageHeader
        title="Admissions Steps"
        description="The four-step application process shown on the Admissions section of the homepage."
      />
      <ListEditor
        endpoint="/api/admin/admission-steps"
        title="Admission Steps"
        entityName="Admission Step"
        fields={FIELDS}
        defaultValues={{
          step: "",
          title: "",
          description: "",
          order: 0,
        }}
        renderCard={(item) => ({
          title: item.title,
          subtitle: item.description,
          badge: `Step ${item.step}`,
        })}
      />
    </>
  );
}
