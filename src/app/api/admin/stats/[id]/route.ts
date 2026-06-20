export const dynamic = "force-dynamic";
import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { StatSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "stat",
  schema: StatSchema,
  cacheKey: "stats",
  entityName: "Stat",
});
