import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { TestimonialSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "testimonial",
  schema: TestimonialSchema,
  cacheKey: "testimonials",
  entityName: "Testimonial",
});
