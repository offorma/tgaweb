export const dynamic = "force-dynamic";
import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { FaqSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "faq",
  schema: FaqSchema,
  cacheKey: "faqs",
  entityName: "Faq",
});
