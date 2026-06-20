export const dynamic = "force-dynamic";
import { makeCrudItemRoutes } from "@/lib/crud-factory";
import { AdmissionStepSchema } from "@/lib/validations/site";

export const { GET, PUT, DELETE } = makeCrudItemRoutes({
  model: "admissionStep",
  schema: AdmissionStepSchema,
  cacheKey: "admissionSteps",
  entityName: "AdmissionStep",
});
