import { z } from "zod";

import { createContext } from "./context";

export const PublicActor = z.object({
  type: z.literal("public"),
  properties: z.object({}),
});
export type PublicActor = z.infer<typeof PublicActor>;

export const AccountActor = z.object({
  type: z.literal("account"),
  properties: z.object({
    accountID: z.string().cuid2(),
    email: z.string().min(1),
    name: z.string().min(1),
  }),
});
export type AccountActor = z.infer<typeof AccountActor>;

export const CustomerActor = z.object({
  type: z.literal("customer"),
  properties: z.object({
    customerID: z.string().cuid2(),
    email: z.string().min(1),
    name: z.string().min(1),
  }),
});
export type CustomerActor = z.infer<typeof CustomerActor>;

export const UserActor = z.object({
  type: z.literal("user"),
  properties: z.object({
    userID: z.string().cuid2(),
    workspaceID: z.string().cuid2(),
    email: z.string().min(1),
    name: z.string().min(1),
  }),
});
export type UserActor = z.infer<typeof UserActor>;

export const SystemActor = z.object({
  type: z.literal("system"),
  properties: z.object({
    workspaceID: z.string().cuid2(),
  }),
});
export type SystemActor = z.infer<typeof SystemActor>;

export const Actor = z.discriminatedUnion("type", [
  UserActor,
  CustomerActor,
  AccountActor,
  PublicActor,
  SystemActor,
]);
export type Actor = z.infer<typeof Actor>;

export const ActorContext = createContext<Actor>();

export function assertActor<T extends Actor["type"]>(type: T) {
  const actor = ActorContext.use();
  if (actor.type !== type) {
    throw new Error(`Expected actor type ${type}, got ${actor.type}`);
  }

  return actor as Extract<Actor, { type: T }>;
}

export function useWorkspaceID() {
  const actor = ActorContext.use();
  if ("workspaceID" in actor.properties) return actor.properties.workspaceID;
  throw new Error(`Expected actor to have workspaceID`);
}

export function useAccountID() {
  const actor = ActorContext.use();
  if (actor.type === "account") return actor.properties.accountID;
  throw new Error(`Actor is "${actor.type}" not AccountActor`);
}

export function useUserID() {
  const actor = ActorContext.use();
  if (actor.type === "user") return actor.properties.userID;
  throw new Error(`Actor is "${actor.type}" not UserActor`);
}
