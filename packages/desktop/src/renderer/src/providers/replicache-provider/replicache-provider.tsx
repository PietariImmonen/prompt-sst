import * as React from 'react'

import { bus } from '../realtime-provider/bus'
import { createReplicache, ReplicacheContext } from './replicache-context'

export function ReplicacheProvider(props: {
  children: React.ReactNode
  token: string
  workspaceID: string
  email: string
}) {
  const [replicache, setReplicache] = React.useState<ReturnType<typeof createReplicache> | null>(
    null
  )

  React.useEffect(() => {
    let isSubscribed = true
    
    const _replicache = createReplicache({
      token: props.token,
      workspaceId: props.workspaceID
    })
    
    // Only set replicache if the component is still mounted
    // This prevents double-mounting in React StrictMode from creating multiple instances
    if (isSubscribed) {
      setReplicache(_replicache)
    } else {
      _replicache.close()
    }

    return () => {
      isSubscribed = false
      _replicache.close()
    }
  }, [props.token, props.workspaceID])

  React.useEffect(() => {
    if (!replicache) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pokeHandler = (params: any) => {
      if (params.actor && params.actor !== props.email) {
        console.debug('poke handler invoked')
        replicache.pull()
      } else {
        console.debug('poke handler ignored')
      }
    }

    bus.on('poke', pokeHandler)

    return () => {
      bus.off('poke', pokeHandler)
    }
  }, [props.email, replicache])

  return (
    <ReplicacheContext.Provider value={replicache ?? undefined}>
      {replicache && props.children}
    </ReplicacheContext.Provider>
  )
}
