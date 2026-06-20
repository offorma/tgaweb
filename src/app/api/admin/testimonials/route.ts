export const dynamic = "force-dynamic";
import { makeCrudRoutes } from "@/lib/crud-factory";
import { TestimonialSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "testimonial",
  schema: TestimonialSchema,
  cacheKey: "testimonials",
  entityName: "Testimonial",
});
