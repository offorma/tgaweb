import { NextResponse } from "next/server";
import { getCloudinary } from "@/lib/cloudinary";
import { adminHandler } from "@/lib/admin-api";

export const runtime = "nodejs";

// List all resources in the tga folder
export const GET = adminHandler(
  async (req) => {
    const cld = await getCloudinary();
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor") || undefined;
    const type = url.searchParams.get("type") || "all"; // "image" | "raw" | "all"

    const resourceType = type === "raw" ? "raw" : "image";
    const prefix = "tga";

    const result = await cld.api.resources({
      type: "upload",
      prefix,
      resource_type: resourceType,
      max_results: 50,
      next_cursor: cursor,
    });

    // If type is "all", also fetch raw (documents)
    let allResources = result.resources || [];
    let nextCursor = result.next_cursor;

    if (type === "all") {
      const rawResult = await cld.api.resources({
        type: "upload",
        prefix,
        resource_type: "raw",
        max_results: 50,
        next_cursor: cursor,
      });
      allResources = [...allResources, ...(rawResult.resources || [])];
    }

    const items = allResources.map((r: any) => ({
      publicId: r.public_id,
      url: r.secure_url,
      format: r.format,
      resourceType: r.resource_type,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ items, nextCursor });
  },
  { method: "GET" }
);

// Delete a resource from Cloudinary
export const DELETE = adminHandler(
  async (req) => {
    const cld = await getCloudinary();
    const { publicId, resourceType } = await req.json();

    if (!publicId || typeof publicId !== "string") {
      return NextResponse.json(
        { error: "publicId is required" },
        { status: 400 }
      );
    }

    const result = await cld.uploader.destroy(publicId, {
      resource_type: resourceType || "image",
    });

    if (result.result !== "ok") {
      return NextResponse.json(
        { error: `Cloudinary delete failed: ${result.result}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  },
  { method: "DELETE" }
);
