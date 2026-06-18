"use client";

import { AdminPageHeader } from "@/components/admin/shell";
import { ListEditor, type FieldDef } from "@/components/admin/list-editor";

const FIELDS: FieldDef[] = [
  { name: "title", label: "Headline", type: "text", required: true, maxLength: 200 },
  { name: "date", label: "Date", type: "date", required: true },
  {
    name: "category",
    label: "Category",
    type: "select",
    required: true,
    options: [
      { value: "News", label: "News" },
      { value: "Event", label: "Event" },
    ],
  },
  { name: "tag", label: "Tag", type: "text", required: true, maxLength: 50, placeholder: "STEM, Sports, Admissions..." },
  { name: "image", label: "Image", type: "image", required: true },
  { name: "order", label: "Display Order", type: "number", required: true },
  { name: "published", label: "Published (visible on site)", type: "checkbox" },
  { name: "excerpt", label: "Excerpt / Summary", type: "textarea", required: true, rows: 4, maxLength: 1000 },
];

export default function AdminNewsPage() {
  return (
    <>
      <AdminPageHeader
        title="News & Events"
        description="Post news items and upcoming events. Unpublished items are hidden from the public site."
      />
      <ListEditor
        endpoint="/api/admin/news"
        title="News"
        entityName="News Item"
        fields={FIELDS}
        defaultValues={{
          title: "",
          date: new Date().toISOString().split("T")[0],
          category: "News",
          tag: "",
          image: "/images/",
          excerpt: "",
          published: true,
          order: 0,
        }}
        renderCard={(item) => ({
          title: item.title,
          subtitle: item.excerpt,
          badge: item.published ? item.category : "Draft",
          image: item.image,
        })}
      />
    </>
  );
}
