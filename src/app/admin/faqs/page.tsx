"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  { name: "question", label: "Question", type: "text", required: true, maxLength: 300 },
  { name: "answer", label: "Answer", type: "textarea", required: true, rows: 5, maxLength: 2000 },
  { name: "order", label: "Display Order", type: "number", required: true },
];

export default function AdminFaqsPage() {
  return (
    <>
      <AdminPageHeader
        title="FAQs"
        description="Frequently asked questions shown in the accordion section."
      />
      <ListEditor
        endpoint="/api/admin/faqs"
        title="FAQs"
        entityName="FAQ"
        fields={FIELDS}
        defaultValues={{
          question: "",
          answer: "",
          order: 0,
        }}
        renderCard={(item) => ({
          title: item.question,
          subtitle: item.answer,
        })}
      />
    </>
  );
}
