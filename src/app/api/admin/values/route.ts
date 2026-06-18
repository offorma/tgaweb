import { makeCrudRoutes } from "@/lib/crud-factory";
import { ValueSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "value",
  schema: ValueSchema,
  cacheKey: "values",
  entityName: "Value",
});
