import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import { Resource } from "sst/resource";

export namespace Realtime {
  const data = new IoTDataPlaneClient({});

  export async function publish(
    topic: string,
    workspaceID: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: any,
    profileID?: string,
  ) {
    await data.send(
      new PublishCommand({
        payload: Buffer.from(
          JSON.stringify({
            properties,
            workspaceID,
          }),
        ),
        topic: `${Resource.App.name}/${Resource.App.stage}/${workspaceID}/${
          profileID ? profileID : "all"
        }/${topic}`,
      }),
    );
  }
}
