import { NextResponse } from "next/server";
import { getCloudinary } from "@/lib/cloudinary";
import { adminHandler } from "@/lib/admin-api";

export const runtime = "nodejs";

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const ALLOWED_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES];

export const POST = adminHandler(
  async (req) => {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: images (JPEG, PNG, WebP, GIF, SVG) and documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)" },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    const isImage = IMAGE_TYPES.includes(file.type);

    const cld = await getCloudinary();
    const result = await cld.uploader.upload(dataUri, {
      folder: isImage ? "tga" : "tga/documents",
      resource_type: "auto",
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      fileType: result.format || MIME_TO_EXT[file.type] || "file",
      fileSize: result.bytes,
    });
  },
  { method: "POST" }
);
