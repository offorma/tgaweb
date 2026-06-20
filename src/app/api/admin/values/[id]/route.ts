export const dynamic = "force-dynamic";
import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { ValueSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "value",
  schema: ValueSchema,
  cacheKey: "values",
  entityName: "Value",
});
