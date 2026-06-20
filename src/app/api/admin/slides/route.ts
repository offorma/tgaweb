export const dynamic = "force-dynamic";
import { makeCrudRoutes } from "@/lib/crud-factory";
import { SlideSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "slide",
  schema: SlideSchema,
  cacheKey: "slides",
  entityName: "Slide",
});
