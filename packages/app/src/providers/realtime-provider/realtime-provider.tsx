import * as React from "react";
import { createId } from "@paralleldrive/cuid2";
import mqtt, { MqttClient } from "mqtt";

import { useAuth } from "@/hooks/use-auth";
import { bus } from "./bus";

export function RealtimeProvider(props: { children: React.ReactElement }) {
  const auth = useAuth();
  const connectionRef = React.useRef<MqttClient | null>(null);

  React.useEffect(() => {
    if (!auth.current || !auth.isReady) {
      return;
    }

    const endpoint = import.meta.env.VITE_REALTIME_ENDPOINT;
    const authorizer = import.meta.env.VITE_AUTHORIZER;

    console.log("endpoint", endpoint);
    console.log("authorizer", authorizer);

    async function createConnection() {
      try {
        console.log("creating new connection");

        if (connectionRef.current) {
          connectionRef.current.end();
        }

        const url = new URL(`wss://${endpoint}/mqtt`);
        url.searchParams.set("x-amz-customauthorizer-name", authorizer);

        const workspaces = auth.current.workspaces;

        if (workspaces.length > 10) {
          console.log("too many workspaces to allow realtime updates");
          return;
        }

        const connection = mqtt.connect(url.toString(), {
          protocolVersion: 5,
          manualConnect: true,
          username: "", // this must be empty for the authorizer to work
          password: auth.current.token,
          clientId: "client_" + createId(),
        });

        connection.on("connect", async () => {
          console.log("WS connected");
          for (const workspace of workspaces) {
            console.log("subscribing to", workspace.id);
            await connection.subscribeAsync(
              `sst-replicache-template/${import.meta.env.VITE_STAGE}/${workspace.id}/all/#`,
              { qos: 1 },
            );
          }
        });

        connection.on("error", (e) => {
          console.log("connection error", e);
        });

        connection.on("message", (fullTopic, payload) => {
          const splits = fullTopic.split("/");
          const workspaceID = splits[2];
          const message = new TextDecoder("utf8").decode(
            new Uint8Array(payload),
          );
          const parsed = JSON.parse(message);
          const topic = splits[4];
          if (topic === "poke") {
            bus.emit("poke", { workspaceID, ...parsed.properties });
          }
        });

        connection.on("disconnect", console.log);

        connection.connect();

        connectionRef.current = connection;
      } catch (error) {
        console.error("Failed to create connection", error);
      }
    }

    createConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.end();
        connectionRef.current = null;
      }
    };
  }, [auth, auth.isReady]);

  return props.children;
}
