import type { ExtractTablesWithRelations } from "drizzle-orm";
import type {
  PgQueryResultHKT,
  PgTransaction,
  PgTransactionConfig,
} from "drizzle-orm/pg-core";

import { createContext } from "../context";
import { db } from "../drizzle";

export type Transaction = PgTransaction<
  PgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

type TxOrDb = Transaction | typeof db;

const TransactionContext = createContext<{
  tx: TxOrDb;
  effects: (() => void | Promise<void>)[];
}>();

export async function useTransaction<T>(callback: (trx: TxOrDb) => Promise<T>) {
  try {
    const { tx } = TransactionContext.use();
    return callback(tx);
  } catch {
    return callback(db);
  }
}

export async function createTransactionEffect(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effect: () => any | Promise<any>,
) {
  try {
    const { effects } = TransactionContext.use();
    effects.push(effect);
  } catch {
    await effect();
  }
}

export async function createTransaction<T>(
  callback: (tx: TxOrDb) => Promise<T>,
  config?: PgTransactionConfig,
) {
  try {
    const { tx } = TransactionContext.use();
    return callback(tx);
  } catch {
    const effects: (() => void | Promise<void>)[] = [];
    const result = await db.transaction(
      async (tx) => {
        const result = await TransactionContext.with(
          { tx, effects },
          async () => {
            return callback(tx);
          },
        );
        return result;
      },
      {
        isolationLevel: "repeatable read",
        ...config,
      },
    );
    await Promise.all(effects.map((x) => x()));
    return result;
  }
}
