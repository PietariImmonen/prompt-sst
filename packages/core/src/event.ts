import { event } from "sst/event";
import { ZodValidator } from "sst/event/validator";

import { ActorContext } from "./actor";

export const defineEvent = event.builder({
  validator: ZodValidator,
  metadata() {
    return {
      actor: ActorContext.use(),
    };
  },
});
