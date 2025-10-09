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
  const [initialPullComplete, setInitialPullComplete] = React.useState(false)
  const pullTimerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const _replicache = createReplicache({
      token: props.token,
      workspaceId: props.workspaceID
    })

    // Set replicache immediately, don't wait for pull
    setReplicache(_replicache)

    // Do initial pull in the background
    console.log('ReplicacheProvider - Starting initial pull...')
    _replicache
      .pull()
      .then(() => {
        console.log('ReplicacheProvider - Initial pull complete')
        setInitialPullComplete(true)
      })
      .catch((error) => {
        console.error('ReplicacheProvider - Initial pull failed:', error)
        // Still mark as complete even if pull fails
        // The app should work with cached data or empty state
        setInitialPullComplete(true)
      })

    // Expose replicache instance globally for overlay access
    ;(window as any).__replicacheInstance = _replicache

    return () => {
      _replicache.close()
      // Clean up global reference
      ;(window as any).__replicacheInstance = null
    }
  }, [props.token, props.workspaceID])

  React.useEffect(() => {
    if (!replicache) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pokeHandler = (params: any) => {
      if (params.workspaceID !== props.workspaceID) {
        console.debug('poke handler ignored for different workspace')
        return
      }

      // Allow self-originated pokes so background captures from other surfaces (e.g. browser extension)
      // still fan out to the desktop app. A tiny debounce keeps repeated pokes from stacking pulls.
      console.debug('poke handler pulling', { actor: params.actor })
      if (pullTimerRef.current) {
        window.clearTimeout(pullTimerRef.current)
      }
      pullTimerRef.current = window.setTimeout(() => {
        pullTimerRef.current = null
        void replicache.pull()
      }, 100)
    }

    bus.on('poke', pokeHandler)

    return () => {
      bus.off('poke', pokeHandler)
      if (pullTimerRef.current) {
        window.clearTimeout(pullTimerRef.current)
        pullTimerRef.current = null
      }
    }
  }, [props.email, props.workspaceID, replicache])

  return (
    <ReplicacheContext.Provider value={replicache ?? undefined}>
      {replicache && initialPullComplete && props.children}
    </ReplicacheContext.Provider>
  )
}
