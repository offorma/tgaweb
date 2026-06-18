"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  { name: "value", label: "Numeric Value", type: "number", required: true, helpText: "e.g. 850" },
  { name: "suffix", label: "Suffix", type: "text", maxLength: 10, placeholder: "+, %, etc." },
  { name: "label", label: "Label", type: "text", required: true, maxLength: 100, placeholder: "Happy Pupils" },
  { name: "description", label: "Description", type: "text", required: true, maxLength: 200 },
  { name: "order", label: "Display Order", type: "number", required: true },
];

export default function AdminStatsPage() {
  return (
    <>
      <AdminPageHeader
        title="Statistics"
        description="The four big numbers shown in the 'By the Numbers' section. Values animate when scrolled into view."
      />
      <ListEditor
        endpoint="/api/admin/stats"
        title="Statistics"
        entityName="Statistic"
        fields={FIELDS}
        defaultValues={{
          value: 0,
          suffix: "+",
          label: "",
          description: "",
          order: 0,
        }}
        renderCard={(item) => ({
          title: `${item.value}${item.suffix || ""}`,
          subtitle: item.label,
          badge: item.description,
        })}
      />
    </>
  );
}
