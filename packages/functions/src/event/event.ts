import { ActorContext, assertActor } from "@prompt-saver/core/actor";
import { LLM } from "@prompt-saver/core/domain/llm";
import { Prompt } from "@prompt-saver/core/domain/prompt";
import { Replicache } from "@prompt-saver/core/domain/replicache";
import { User } from "@prompt-saver/core/domain/user";
import { UserSettings } from "@prompt-saver/core/domain/user-settings";
import { bus } from "sst/aws/bus";

export const handler = bus.subscriber(
  [User.Events.UserCreated, Prompt.Events.PromptCreated],
  async (event) => {
    console.log(event.type, event.properties, event.metadata);
    switch (event.type) {
      case "user.created": {
        await ActorContext.with(event.metadata.actor, async () => {
          const userID = event.properties.userID;

          await Promise.all([
            UserSettings.create({
              userID,
              inAppOnboardingCompleted: false,
            }),
          ]);
        });
        break;
      }
      case "prompt.created": {
        await ActorContext.with(event.metadata.actor, async () => {
          const { promptID, workspaceID, skipCategorization } =
            event.properties;

          console.log(
            `[Event] Processing prompt.created event for prompt ${promptID}`,
          );

          await LLM.analyzePrompt({
            promptID,
            workspaceID,
            skipCategorization,
          });
        });
        const actor = assertActor("user");
        Replicache.poke({
          actor: actor.properties.email,
          workspaceID: actor.properties.workspaceID,
        });
        break;
      }
    }
  },
);
