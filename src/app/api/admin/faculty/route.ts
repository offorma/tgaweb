export const dynamic = "force-dynamic";
import { makeCrudRoutes } from "@/lib/crud-factory";
import { FacultySchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "faculty",
  schema: FacultySchema,
  cacheKey: "faculty",
  entityName: "Faculty",
});
