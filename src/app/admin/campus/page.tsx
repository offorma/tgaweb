"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true, maxLength: 100 },
  { name: "description", label: "Description", type: "text", required: true, maxLength: 200 },
  { name: "image", label: "Image", type: "image", required: true },
  { name: "order", label: "Display Order", type: "number", required: true },
];

export default function AdminCampusPage() {
  return (
    <>
      <AdminPageHeader
        title="Campus Life"
        description="The mosaic grid of campus life photos shown on the homepage."
      />
      <ListEditor
        endpoint="/api/admin/campus-items"
        title="Campus Items"
        entityName="Campus Item"
        fields={FIELDS}
        defaultValues={{
          title: "",
          description: "",
          image: "/images/",
          order: 0,
        }}
        renderCard={(item) => ({
          title: item.title,
          subtitle: item.description,
          image: item.image,
        })}
      />
    </>
  );
}
