import { Realtime } from "../realtime";

export namespace Replicache {
  interface PokeParams {
    actor: string;
    workspaceID: string;
  }

  export async function poke(params: PokeParams) {
    console.log("sending poke");
    await Realtime.publish("poke", params.workspaceID, { actor: params.actor });
    console.log("poke sent");
  }
}
