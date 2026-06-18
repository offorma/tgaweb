import { makeCrudRoutes } from "@/lib/crud-factory";
import { ProgramSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "program",
  schema: ProgramSchema,
  cacheKey: "programs",
  entityName: "Program",
});
