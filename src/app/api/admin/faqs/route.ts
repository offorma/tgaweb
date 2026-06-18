import { makeCrudRoutes } from "@/lib/crud-factory";
import { FaqSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "faq",
  schema: FaqSchema,
  cacheKey: "faqs",
  entityName: "Faq",
});
