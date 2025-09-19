import { createSubjects } from "@openauthjs/openauth";
import { z } from "zod";

export const subjects = createSubjects({
  account: z.object({
    accountID: z.string(),
    email: z.string(),
    name: z.string(),
  }),
});
