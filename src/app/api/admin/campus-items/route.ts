export const dynamic = "force-dynamic";
import { makeCrudRoutes } from "@/lib/crud-factory";
import { CampusItemSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "campusItem",
  schema: CampusItemSchema,
  cacheKey: "campusItems",
  entityName: "CampusItem",
});
