import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Mic, RefreshCw } from 'lucide-react'

interface StepTranscriptionProps {
  onNext: () => void
  onSkip: () => void
}

type BroadcastPayload =
  | { state: 'started' | 'stopped' | 'cancelled' }
  | { state: 'completed'; text: string }
  | { state: 'failed'; message: string }

type StepStatus = 'idle' | 'recording' | 'stopped' | 'completed' | 'cancelled' | 'failed'

export function StepTranscription({ onNext, onSkip }: StepTranscriptionProps) {
  const [status, setStatus] = React.useState<StepStatus>('idle')
  const [hasStarted, setHasStarted] = React.useState(false)
  const [hasStopped, setHasStopped] = React.useState(false)
  const [finalText, setFinalText] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState(
    'Press the shortcut once to start listening. Press it again (or Esc) to finish.'
  )
  const [microphoneGranted, setMicrophoneGranted] = React.useState<boolean | null>(null)
  const [requestingAccess, setRequestingAccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
  const shortcutHint = `${isMac ? '⌘' : 'Ctrl'} + Shift + F`

  React.useEffect(() => {
    let mounted = true

    const fetchInitialStatus = async () => {
      try {
        const result = await window.transcription?.getStatus?.()
        if (!mounted || !result) return
        setMicrophoneGranted(result.status === 'recording' ? true : null)
      } catch (fetchError) {
        console.warn('Failed to fetch transcription status:', fetchError)
      }
    }

    void fetchInitialStatus()

    return () => {
      mounted = false
    }
  }, [])

  React.useEffect(() => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc?.on) return

    const handler = (_event: unknown, payload: BroadcastPayload) => {
      if (!payload) return

      switch (payload.state) {
        case 'started': {
          setStatus('recording')
          setHasStarted(true)
          setHasStopped(false)
          setFinalText(null)
          setError(null)
          setMessage('Listening… use the shortcut again or Esc to stop recording.')
          break
        }
        case 'stopped': {
          setStatus('stopped')
          setHasStopped(true)
          setMessage('Stopping transcription… finishing up.')
          break
        }
        case 'completed': {
          setStatus('completed')
          setHasStopped(true)
          setFinalText(payload.text)
          setMessage('Transcription inserted! You can continue to the next step.')
          break
        }
        case 'cancelled': {
          setStatus('cancelled')
          setHasStopped(true)
          setMessage('Overlay closed without text. Try again or continue.')
          break
        }
        case 'failed': {
          setStatus('failed')
          setHasStopped(true)
          setError(payload.message)
          setMessage('Transcription failed. Fix the issue or skip for now.')
          break
        }
        default:
          break
      }
    }

    ipc.on('transcription:state-changed', handler)

    return () => {
      ipc.off?.('transcription:state-changed', handler)
      ipc.removeListener?.('transcription:state-changed', handler)
    }
  }, [])

  const handleRequestMicrophone = React.useCallback(async () => {
    if (!window.transcription?.requestMicrophoneAccess) return

    try {
      setRequestingAccess(true)
      const granted = await window.transcription.requestMicrophoneAccess()
      setMicrophoneGranted(granted)
      if (!granted) {
        setError('Microphone access is required for transcription.')
      } else {
        setError(null)
      }
    } catch (requestError) {
      console.error('Failed to request microphone access:', requestError)
      setError('Unable to request microphone permission. Check system settings.')
    } finally {
      setRequestingAccess(false)
    }
  }, [])

  const canContinue = hasStarted && hasStopped

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-3">
            <Mic className="h-6 w-6 text-purple-400" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Try the universal transcription</h2>
        <p className="text-sm text-muted-foreground">
          Start dictating with <span className="font-semibold">{shortcutHint}</span>. Press the shortcut
          again (or Esc) to finish and paste the text.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Recording shortcut</p>
            <p className="text-xs text-muted-foreground">Launch the overlay with {shortcutHint}</p>
          </div>
          <Badge
            variant={hasStarted ? 'default' : 'secondary'}
            className={hasStarted ? 'bg-green-500 hover:bg-green-500 text-white' : undefined}
          >
            {hasStarted ? 'Captured' : 'Pending'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Finish recording</p>
            <p className="text-xs text-muted-foreground">
              Stop with the same shortcut or press Esc inside the overlay
            </p>
          </div>
          <Badge
            variant={hasStopped ? 'default' : 'secondary'}
            className={hasStopped ? 'bg-green-500 hover:bg-green-500 text-white' : undefined}
          >
            {hasStopped ? 'Captured' : 'Pending'}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border/50 bg-background/60 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <Check
            className={`h-4 w-4 ${status === 'recording' || status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`}
          />
          <span className="font-medium text-foreground">{message}</span>
        </div>
        {finalText ? (
          <div className="mt-3 rounded border border-border/40 bg-muted/20 p-3 text-xs text-foreground">
            <p className="mb-1 font-semibold text-muted-foreground">Latest transcript</p>
            <p className="whitespace-pre-wrap">{finalText}</p>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Use the shortcut any time after onboarding to paste transcripts instantly.</span>
        </div>
        {microphoneGranted === false ? (
          <span className="text-red-400">Microphone permission denied</span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSkip} variant="outline" className="flex-1" size="lg">
          Skip for now
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-purple-500/20 disabled:opacity-50 disabled:hover:scale-100"
          size="lg"
        >
          Continue
        </Button>
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={requestingAccess}
          onClick={handleRequestMicrophone}
        >
          {requestingAccess ? 'Requesting microphone access…' : 'Check microphone permissions'}
        </Button>
      </div>
    </div>
  )
}
