import { makeCrudRoutes } from "@/lib/crud-factory";
import { AdmissionStepSchema } from "@/lib/validations/site";

export const { GET, POST } = makeCrudRoutes({
  model: "admissionStep",
  schema: AdmissionStepSchema,
  cacheKey: "admissionSteps",
  entityName: "AdmissionStep",
});
