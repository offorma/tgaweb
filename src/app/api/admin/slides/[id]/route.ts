export const dynamic = "force-dynamic";
import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { SlideSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "slide",
  schema: SlideSchema,
  cacheKey: "slides",
  entityName: "Slide",
});
