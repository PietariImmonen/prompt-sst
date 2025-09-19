import * as React from "react";
import { dropAllDatabases } from "replicache";

import { api } from "@/lib/hono";
import { AuthContext, authStore } from "./auth-context";

export type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider(props: AuthProviderProps) {
  const [isReady, setIsReady] = React.useState<boolean>(false);

  const accessToken = React.useMemo(
    () =>
      new URLSearchParams(window.location.hash.substring(1)).get(
        "access_token",
      ),
    [],
  );

  if (!authStore.get()) {
    authStore.set({ accounts: {} });
  }

  React.useEffect(() => {
    if (accessToken) return;
    if (authStore.get() && Object.keys(authStore.get()!.accounts).length)
      return;
    setIsReady(true);
  }, [accessToken]);

  React.useEffect(() => {
    if (!authStore.get()) return;
    if (
      authStore.get()!.current &&
      !authStore.get()!.accounts[authStore.get()!.current!]
    ) {
      const prevStore = authStore.get()!;
      authStore.set({
        ...prevStore,
        current: Object.keys(authStore.get()!.accounts)[0],
      });
    }
  }, []);

  const refresh = React.useCallback(async () => {
    const all = [];
    if (!authStore.get()) return;
    for (const token of [
      ...Object.keys(authStore.get()!.accounts),
      accessToken,
    ]) {
      if (!token) continue;

      const prom = api.account.me
        .$get({}, { headers: { authorization: `Bearer ${token}` } })
        .then(async (response) => {
          if (response.ok) {
            const info = await response.json();

            if (
              !accessToken ||
              !Object.values(authStore.get()!.accounts).find(
                (a) => a.id === info.result.id,
              )
            ) {
              const prevStore = authStore.get()!;
              authStore.set({
                ...prevStore,
                accounts: {
                  ...prevStore.accounts,
                  [token]: {
                    ...info.result,
                    token,
                  },
                },
              });
            }
          }

          if (!response.ok) {
            const prevStore = authStore.get()!;
            delete prevStore.accounts[token];
            authStore.set(prevStore);
          }

          if (accessToken === token) {
            const prevStore = authStore.get()!;
            authStore.set({ ...prevStore, current: token });
            window.location.hash = "";
          }
        });
      all.push(prom);
    }
    await Promise.all(all);
    setIsReady(true);
  }, [accessToken]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{
        get current() {
          const store = authStore.get();
          if (!store) return null;
          const key = store.current;
          if (!key) return null;
          return store.accounts[key] ?? null;
        },
        get accounts() {
          return authStore.get()!.accounts;
        },
        logout: () => {
          authStore.remove();
          localStorage.removeItem("sst-replicache-template.workspace");
          dropAllDatabases();
          window.location.href = "/";
        },
        refresh,
        isReady,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}
