import { ActorContext } from "@sst-replicache-template/core/actor";
import { User } from "@sst-replicache-template/core/domain/user";
import { UserSettings } from "@sst-replicache-template/core/domain/user-settings";
import { bus } from "sst/aws/bus";

export const handler = bus.subscriber(
  [User.Events.UserCreated],
  async (event) => {
    console.log(event.type, event.properties, event.metadata);
    switch (event.type) {
      case "user.created": {
        await ActorContext.with(event.metadata.actor, async () => {
          const userID = event.properties.userID;

          await Promise.all([
            UserSettings.create({
              fullSentences: false,
              language: "fi",
              userID,
              inAppOnboardingCompleted: false,
            }),
          ]);
        });
        break;
      }
    }
  },
);
