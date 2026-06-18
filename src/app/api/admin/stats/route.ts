import { makeCrudRoutes } from "@/lib/crud-factory";
import { StatSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "stat",
  schema: StatSchema,
  cacheKey: "stats",
  entityName: "Stat",
});
