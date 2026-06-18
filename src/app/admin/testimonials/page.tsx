"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  { name: "name", label: "Author Name", type: "text", required: true, maxLength: 100, placeholder: "Mr. & Mrs. Obiora" },
  { name: "relation", label: "Relation", type: "text", required: true, maxLength: 150, placeholder: "Parents of Zara (P4) & Tobe (P2)" },
  { name: "rating", label: "Star Rating (1-5)", type: "number", required: true },
  { name: "order", label: "Display Order", type: "number", required: true },
  { name: "quote", label: "Testimonial Quote", type: "textarea", required: true, rows: 5, maxLength: 2000 },
];

export default function AdminTestimonialsPage() {
  return (
    <>
      <AdminPageHeader
        title="Testimonials"
        description="Parent and community testimonials shown in the rotating carousel."
      />
      <ListEditor
        endpoint="/api/admin/testimonials"
        title="Testimonials"
        entityName="Testimonial"
        fields={FIELDS}
        defaultValues={{
          name: "",
          relation: "",
          rating: 5,
          quote: "",
          order: 0,
        }}
        renderCard={(item) => ({
          title: item.name,
          subtitle: item.relation,
          badge: `${item.rating}★`,
        })}
      />
    </>
  );
}
