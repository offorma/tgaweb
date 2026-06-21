import { v2 as cloudinary } from "cloudinary";
import { getSecretValue } from "@/lib/secrets-data";

/**
 * Returns a configured Cloudinary instance.
 * Reads credentials from the Secrets vault (Admin > Secrets),
 * falling back to environment variables for bootstrapping.
 */
export async function getCloudinary() {
  const cloudName =
    (await getSecretValue("CLOUDINARY_CLOUD_NAME")) ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    "";
  const apiKey =
    (await getSecretValue("CLOUDINARY_API_KEY")) ||
    process.env.CLOUDINARY_API_KEY ||
    "";
  const apiSecret =
    (await getSecretValue("CLOUDINARY_API_SECRET")) ||
    process.env.CLOUDINARY_API_SECRET ||
    "";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Admin > Secrets."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return cloudinary;
}

export default cloudinary;
