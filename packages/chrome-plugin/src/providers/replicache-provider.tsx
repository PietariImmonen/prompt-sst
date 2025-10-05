import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { Replicache } from "replicache"

import { mutators } from "~lib/mutators"

type ReplicacheContextType = Replicache<typeof mutators> | null

const ReplicacheContext = createContext<ReplicacheContextType>(null)

export function useReplicache() {
  const context = useContext(ReplicacheContext)
  if (!context) {
    throw new Error("useReplicache must be used within ReplicacheProvider")
  }
  return context
}

export function ReplicacheProvider({
  children,
  token,
  workspaceID,
  email
}: {
  children: ReactNode
  token: string
  workspaceID: string
  email: string
}) {
  const [replicache, setReplicache] = useState<Replicache<
    typeof mutators
  > | null>(null)

  useEffect(() => {
    // Get API URL from environment or use default
    const apiRoot = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:3000"
    const baseURL = apiRoot.replace(/\/+$/, "")
    const pullURL = `${baseURL}/sync/pull`
    const pushURL = `${baseURL}/sync/push`

    const rep = new Replicache({
      name: workspaceID,
      auth: `Bearer ${token}`,
      licenseKey: "lc928cd833dcd43d98d2f3de98f59969f",
      pullURL,
      pushURL,
      pullInterval: null,
      pushDelay: 1000,
      mutators,
      schemaVersion: "8"
    })

    rep.puller = async (req) => {
      const result = await fetch(pullURL, {
        headers: {
          "x-prompt-saver-workspace": workspaceID,
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(req),
        method: "POST"
      })
      return {
        response: result.status === 200 ? await result.json() : undefined,
        httpRequestInfo: {
          httpStatusCode: result.status,
          errorMessage: result.statusText
        }
      }
    }

    rep.pusher = async (req) => {
      const result = await fetch(pushURL, {
        headers: {
          "x-prompt-saver-workspace": workspaceID,
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(req),
        method: "POST"
      })
      return {
        httpRequestInfo: {
          httpStatusCode: result.status,
          errorMessage: result.statusText
        }
      }
    }

    setReplicache(rep)

    return () => {
      rep.close()
    }
  }, [token, workspaceID])

  if (!replicache) {
    return null
  }

  return (
    <ReplicacheContext.Provider value={replicache}>
      {children}
    </ReplicacheContext.Provider>
  )
}
