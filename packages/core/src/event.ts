import { event } from "sst/event";
import { ZodValidator } from "sst/event/validator";
import type { ZodType } from "zod";

import { ActorContext } from "./actor";

export const defineEvent = event.builder({
  validator: ZodValidator as (schema: ZodType) => typeof ZodValidator,
  metadata() {
    return {
      actor: ActorContext.use(),
    };
  },
});
