import { makeCrudRoutes } from "@/lib/crud-factory";
import { NewsItemSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "newsItem",
  schema: NewsItemSchema,
  cacheKey: "news",
  entityName: "NewsItem",
});
