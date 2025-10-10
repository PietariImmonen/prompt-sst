import * as React from 'react'
import { Replicache } from 'replicache'

import { mutators } from '@/data/mutators'

export function createReplicache(input: { token: string; workspaceId: string }) {
  // Ensure API URL has trailing slash for proper URL construction
  const apiUrl = import.meta.env.VITE_API_URL.endsWith('/')
    ? import.meta.env.VITE_API_URL
    : import.meta.env.VITE_API_URL + '/'

  const rep = new Replicache({
    // logLevel: "debug",
    name: input.workspaceId,
    auth: `Bearer ${input.token}`,
    licenseKey: 'lc928cd833dcd43d98d2f3de98f59969f',
    pullURL: apiUrl + 'sync/pull',
    pushURL: apiUrl + 'sync/push',
    // we don't want to pull in the background as it interrupts with forms leading to overriding the content
    // we have implemented poke which can be used to trigger a pull
    pullInterval: null,
    pushDelay: 1000,
    mutators,
    schemaVersion: '8'
  })

  rep.puller = async (req) => {
    const result = await fetch(rep.pullURL, {
      headers: {
        'x-prompt-saver-workspace': input.workspaceId,
        authorization: `Bearer ${input.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(req),
      method: 'POST'
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
    const result = await fetch(rep.pushURL, {
      headers: {
        'x-prompt-saver-workspace': input.workspaceId,
        authorization: `Bearer ${input.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(req),
      method: 'POST'
    })
    return {
      httpRequestInfo: {
        httpStatusCode: result.status,
        errorMessage: result.statusText
      }
    }
  }

  return rep
}

export const ReplicacheContext = React.createContext<
  ReturnType<typeof createReplicache> | undefined
>(undefined)
