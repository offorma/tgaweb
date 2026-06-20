import { v2 as cloudinary } from "cloudinary";
import { db } from "@/lib/db";

let configured = false;

/**
 * Returns a configured Cloudinary instance.
 * Reads credentials from DB (SiteSettings), falling back to env vars for bootstrapping.
 */
export async function getCloudinary() {
  if (configured) return cloudinary;

  const settings = await db.siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  });

  const cloudName =
    settings?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey =
    settings?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY || "";
  const apiSecret =
    settings?.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET || "";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set credentials in Admin > Site Settings or via environment variables."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  configured = true;
  return cloudinary;
}

/**
 * Call this after Cloudinary settings are updated in admin
 * so the next request picks up new credentials.
 */
export function resetCloudinaryConfig() {
  configured = false;
}

export default cloudinary;
