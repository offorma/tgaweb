import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { NewsItemSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "newsItem",
  schema: NewsItemSchema,
  cacheKey: "news",
  entityName: "NewsItem",
});
