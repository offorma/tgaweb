export const dynamic = "force-dynamic";
import { makeCrudRoutes } from "@/lib/crud-factory";
import { DownloadSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "download",
  schema: DownloadSchema,
  cacheKey: "downloads",
  entityName: "Download",
});
