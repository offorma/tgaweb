import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { FacultySchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "faculty",
  schema: FacultySchema,
  cacheKey: "faculty",
  entityName: "Faculty",
});
