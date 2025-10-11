import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import useTranscribe from '@/hooks/useTranscribe'
import { isActiveState } from '@soniox/speech-to-text-web'
import { useCallback, useEffect, useState } from 'react'

/**
 * Direct Soniox SDK Test Page
 *
 * This page tests the Soniox SDK directly in THIS window using the useTranscribe hook,
 * so you can see all console logs in the main DevTools.
 */
const TranscriptionTestDirectPage = () => {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs((prev) => [...prev.slice(-30), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Get API key from environment
  const apiKey =
    import.meta.env.VITE_SONIOX_API_KEY ||
    'c476482a47b7e22b2de7629562deb30ed4ccc73d692eb06199b466b156e7ae56'

  if (!apiKey) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Missing API Key</CardTitle>
            <CardDescription>VITE_SONIOX_API_KEY not found in environment</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Use the transcription hook
  const {
    state,
    finalTokens,
    finalText,
    nonFinalTokens,
    startTranscription,
    stopTranscription,
    error,
    audioURL
  } = useTranscribe({
    apiKey: apiKey,
    onStarted: () => {
      addLog('✅ onStarted callback - Transcription started!')
      addLog('🎤 Microphone is active - speak now!')
      addLog('📼 Audio recording started in parallel')
      addLog('💡 Tip: Speak clearly and loudly')
    },
    onFinished: ({ finalText: completedText, finalTokens: finishedTokens }) => {
      addLog('🏁 onFinished callback - Transcription finished!')
      addLog(`📝 Total final tokens: ${finishedTokens.length}`)
      if (completedText.length > 0) {
        addLog(`📄 Final transcript: ${completedText}`)
      } else {
        addLog('⚠️ Final transcript is empty')
      }
      addLog('💾 Audio recording saved - check below for playback')
    }
  })

  const previewText = nonFinalTokens.map((token) => token.text).join('')
  const transcribedText = `${finalText}${previewText}`
  const totalTokenCount = finalTokens.length + nonFinalTokens.length

  const [microphoneLabel, setMicrophoneLabel] = useState<string | null>(null)
  const [microphoneError, setMicrophoneError] = useState<string | null>(null)

  const detectActiveMicrophone = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      const message = 'Device enumeration unavailable in this environment'
      addLog(`⚠️ ${message}`)
      setMicrophoneLabel(null)
      setMicrophoneError(message)
      return
    }

    let stream: MediaStream | null = null
    try {
      // Request a temporary audio stream so we can identify the active input
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const [track] = stream.getAudioTracks()

      if (!track) {
        const message = 'No audio track available in captured stream'
        addLog(`⚠️ ${message}`)
        setMicrophoneLabel(null)
        setMicrophoneError(message)
        return
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const matchingDevice = devices.find(
        (device) => device.kind === 'audioinput' && device.label === track.label
      )

      const label = (matchingDevice?.label ?? track.label ?? '').trim()

      if (label.length === 0) {
        setMicrophoneLabel(null)
        setMicrophoneError('Microphone permission granted but label unavailable')
        addLog(
          '🎧 Microphone detected but label unavailable (try restarting the app after granting permission)'
        )
      } else {
        setMicrophoneLabel(label)
        setMicrophoneError(null)
      }
      console.log(`🎧 Using microphone: ${label}`)
    } catch (deviceError) {
      const message =
        deviceError instanceof Error ? deviceError.message : JSON.stringify(deviceError)
      setMicrophoneLabel(null)
      setMicrophoneError(message)
      addLog(`❌ Microphone access error: ${message}`)
    } finally {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [addLog])

  const handleStart = async () => {
    addLog('🎙️ Starting transcription via useTranscribe hook...')
    addLog(`🔑 API Key: ${apiKey.substring(0, 10)}...`)

    //Request microphone access on macOS via Electron API
    if (window.transcription?.requestMicrophoneAccess) {
      addLog('🔐 Requesting microphone access...')
      const granted = await window.transcription.requestMicrophoneAccess()
      if (!granted) {
        addLog('❌ Microphone access denied. Please grant permission in System Settings.')
        return
      }
      addLog('✅ Microphone access granted')
    }

    startTranscription()
  }

  const handleStop = () => {
    addLog('🛑 Stopping transcription...')
    stopTranscription()
  }

  const isRecording = isActiveState(state)

  // Detect microphone only when recording stops to avoid stream conflicts
  useEffect(() => {
    if (!isRecording && state === 'Init') {
      void detectActiveMicrophone()
    }
  }, [isRecording, state, detectActiveMicrophone])

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-6 w-6" />
            Direct Soniox SDK Test (useTranscribe Hook)
          </CardTitle>
          <CardDescription>
            Test the Soniox SDK using the useTranscribe React hook. All logs appear below AND in the
            console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              <strong>Error:</strong> {error.status} - {error.message}
              {error.errorCode && ` (Code: ${error.errorCode})`}
            </div>
          )}

          {/* Recording Status */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-semibold">Recording Status</p>
              <p className="text-sm text-muted-foreground">
                {isRecording ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
                    {state} - Speak now!
                  </span>
                ) : (
                  <span className="text-muted-foreground">{state}</span>
                )}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Active microphone:{' '}
                <span className="font-medium text-foreground">
                  {microphoneLabel ?? (microphoneError ? 'Unavailable' : 'Detecting…')}
                </span>
              </p>
              {microphoneError && <p className="text-xs text-red-500">{microphoneError}</p>}
            </div>
            <div className="flex gap-2">
              {isRecording ? (
                <Button onClick={handleStop} variant="destructive">
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    void handleStart()
                  }}
                  variant="default"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              )}
            </div>
          </div>

          {/* Token Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-blue-50 p-3 dark:bg-blue-950">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">Total Tokens</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalTokenCount}
              </p>
            </div>
            <div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950">
              <p className="text-xs font-medium text-green-900 dark:text-green-100">Final Tokens</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {finalTokens.length}
              </p>
            </div>
            <div className="rounded-lg border bg-yellow-50 p-3 dark:bg-yellow-950">
              <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">
                Non-Final Tokens
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {nonFinalTokens.length}
              </p>
            </div>
          </div>

          {/* Non-Final Preview */}
          {nonFinalTokens.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                Preview (non-final tokens):
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                {nonFinalTokens.map((token) => token.text).join('')}
              </p>
            </div>
          )}

          {/* Transcribed Text */}
          <div>
            <label className="mb-2 block text-sm font-medium">Final Transcribed Text:</label>
            <Textarea
              value={transcribedText}
              readOnly
              placeholder="Start recording and speak... Your transcribed text will appear here."
              className="min-h-[200px] font-mono"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Characters: {transcribedText.length}
            </p>
          </div>

          {/* Audio Playback */}
          {audioURL && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <label className="mb-2 block text-sm font-medium">Recorded Audio:</label>
              <div className="flex items-center gap-4">
                <audio controls src={audioURL} className="flex-1">
                  Your browser does not support the audio element.
                </audio>
                <a
                  href={audioURL}
                  download={`transcription-${new Date().toISOString()}.webm`}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                >
                  Download Audio
                </a>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                💾 Audio saved successfully. You can play it back or download it.
              </p>
            </div>
          )}

          {/* Live Logs */}
          <div>
            <label className="mb-2 block text-sm font-medium">Live Logs:</label>
            <div className="max-h-[300px] overflow-y-auto rounded-lg border bg-black p-4 font-mono text-xs text-green-400">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Click "Start Recording" to begin.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold">How to Test:</h3>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Click "Start Recording" button</li>
              <li>Allow microphone access if prompted</li>
              <li>Speak clearly and LOUDLY into your microphone</li>
              <li>Watch the logs below and in the browser console (Cmd+Option+I)</li>
              <li>Non-final tokens appear in the blue preview box as you speak</li>
              <li>Final tokens appear in the textarea above</li>
              <li>Click "Stop" when done</li>
            </ol>
          </div>

          {/* Troubleshooting */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm dark:border-yellow-900 dark:bg-yellow-950">
            <strong>💡 Troubleshooting:</strong>
            <ul className="mt-2 list-inside list-disc space-y-1 text-yellow-900 dark:text-yellow-100">
              <li>
                <strong>No tokens?</strong> Speak MUCH louder, or check your microphone volume in
                System Settings
              </li>
              <li>
                <strong>Wrong microphone?</strong> Check System Settings → Sound → Input
              </li>
              <li>
                <strong>Permission denied?</strong> Check System Settings → Privacy → Microphone
              </li>
              <li>
                <strong>Still not working?</strong> Open DevTools (Cmd+Option+I) and check for
                errors
              </li>
            </ul>
          </div>

          {/* Console Reminder */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
            <strong>🔍 Debugging Tip:</strong> Open the browser console (Cmd+Option+I /
            Ctrl+Shift+I) to see detailed JSON responses from Soniox, including full token objects
            and audio processing info.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TranscriptionTestDirectPage
