import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { CampusItemSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "campusItem",
  schema: CampusItemSchema,
  cacheKey: "campusItems",
  entityName: "CampusItem",
});
