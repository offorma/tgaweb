export const dynamic = "force-dynamic";
import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { ProgramSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "program",
  schema: ProgramSchema,
  cacheKey: "programs",
  entityName: "Program",
});
