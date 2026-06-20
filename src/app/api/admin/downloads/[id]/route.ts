export const dynamic = "force-dynamic";
import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { DownloadSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "download",
  schema: DownloadSchema,
  cacheKey: "downloads",
  entityName: "Download",
});
