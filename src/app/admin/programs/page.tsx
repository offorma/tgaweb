"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  {
    name: "name",
    label: "Program Name",
    type: "text",
    required: true,
    maxLength: 100,
    placeholder: "Early Years (Nursery)",
  },
  {
    name: "ages",
    label: "Ages / Stage",
    type: "text",
    required: true,
    maxLength: 50,
    placeholder: "Ages 3 – 5",
  },
  {
    name: "tagline",
    label: "Tagline",
    type: "text",
    required: true,
    maxLength: 100,
    placeholder: "Where wonder takes flight",
  },
  {
    name: "color",
    label: "Accent Color",
    type: "select",
    required: true,
    options: [
      { value: "orange", label: "Orange" },
      { value: "navy", label: "Navy" },
      { value: "gold", label: "Gold" },
    ],
  },
  {
    name: "image",
    label: "Image",
    type: "image",
    required: true,
  },
  {
    name: "order",
    label: "Display Order",
    type: "number",
    required: true,
    helpText: "Lower numbers appear first",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    required: true,
    rows: 4,
    maxLength: 2000,
  },
  {
    name: "features",
    label: "Features (one per line)",
    type: "textarea",
    required: true,
    rows: 6,
    maxLength: 3000,
    helpText: "Each line becomes a checkmark in the UI",
  },
];

export default function AdminProgramsPage() {
  return (
    <>
      <AdminPageHeader
        title="Programs"
        description="Manage the three academic programs shown on the homepage (Nursery, Lower Primary, Upper Primary)."
      />
      <ListEditor
        endpoint="/api/admin/programs"
        title="Programs"
        entityName="Program"
        fields={FIELDS}
        defaultValues={{
          name: "",
          ages: "",
          tagline: "",
          color: "orange",
          image: "/images/",
          description: "",
          features: "",
          order: 0,
        }}
        renderCard={(item) => ({
          title: item.name,
          subtitle: item.ages,
          badge: item.tagline,
          image: item.image,
        })}
      />
    </>
  );
}
