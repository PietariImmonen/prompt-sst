import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Mic, MicOff, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import useTranscribe from '@/hooks/useTranscribe'
import { isActiveState } from '@soniox/speech-to-text-web'

type OverlayState = 'transcribing' | 'finalized' | 'improving' | 'improved'

const TranscriptionOverlayPage = () => {
  const [overlayState, setOverlayState] = useState<OverlayState>('transcribing')
  const [improvedText, setImprovedText] = useState('')
  const [isImproving, setIsImproving] = useState(false)

  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasFlushedRef = useRef(false)
  const latestFinalTextRef = useRef('')
  const latestPreviewRef = useRef('')

  const clearFlushTimer = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
  }, [])

  const sendTranscript = useCallback(
    (rawText: string | null) => {
      if (hasFlushedRef.current) {
        return
      }
      hasFlushedRef.current = true
      clearFlushTimer()

      const trimmed = rawText?.trim() ?? ''
      if (trimmed.length > 0) {
        console.log('📤 Transcription stopped, ready for action:', trimmed)
        setOverlayState('finalized')
      } else {
        console.log('⚠️  No text to insert, closing overlay')
        window.electron.ipcRenderer.send('transcription:stop-manual')
      }
    },
    [clearFlushTimer]
  )

  const handleInsertImproved = useCallback(() => {
    if (improvedText.length > 0) {
      console.log('📤 Inserting improved text:', improvedText)
      window.electron.ipcRenderer.send('transcription:insert-text', improvedText)
    }
  }, [improvedText])

  const flushCombinedTranscript = useCallback(() => {
    if (hasFlushedRef.current) {
      return
    }
    const combined = `${latestFinalTextRef.current}${latestPreviewRef.current}`.trim()
    if (combined.length > 0) {
      sendTranscript(combined)
    } else {
      sendTranscript(null)
    }
  }, [sendTranscript])

  const scheduleFlush = useCallback(
    (delay = 400) => {
      if (hasFlushedRef.current) {
        return
      }
      clearFlushTimer()
      flushTimerRef.current = setTimeout(() => {
        flushCombinedTranscript()
      }, delay)
    },
    [clearFlushTimer, flushCombinedTranscript]
  )

  const resetSession = useCallback(() => {
    hasFlushedRef.current = false
    latestFinalTextRef.current = ''
    latestPreviewRef.current = ''
    clearFlushTimer()
  }, [clearFlushTimer])

  // Dev mode: Use mock text for testing
  const handleUseMockText = useCallback(() => {
    const mockText =
      'um so like I want to uh create a feature that like you know improves the transcribed text and makes it uh clearer and more structured you know what I mean'
    console.log('🧪 Using mock text for testing:', mockText)
    latestFinalTextRef.current = mockText
    latestPreviewRef.current = ''
    setOverlayState('finalized')
    hasFlushedRef.current = true
  }, [])

  // Get API key from environment
  const apiKey = import.meta.env.VITE_SONIOX_API_KEY ?? ''
  const missingApiKey = apiKey.length === 0

  // Use the transcription hook
  const { state, finalText, nonFinalTokens, startTranscription, stopTranscription, error } =
    useTranscribe({
      apiKey,
      onStarted: () => {
        console.log('✅ Overlay: Transcription started')
      },
      onFinished: ({ finalText: finishedText }) => {
        console.log('✅ Overlay: Transcription finished')

        if (finishedText.trim().length > 0) {
          sendTranscript(finishedText)
        } else {
          console.log('⚠️  Soniox returned empty final text, using buffered tokens')
          flushCombinedTranscript()
        }
      }
    })

  useEffect(() => {
    latestFinalTextRef.current = finalText
    if (finalText.length > 0) {
      console.log(`📝 Current final text length: ${finalText.length}`)
    }
  }, [finalText])

  useEffect(() => {
    return () => {
      clearFlushTimer()
    }
  }, [clearFlushTimer])

  const handleImprove = useCallback(() => {
    const text = `${latestFinalTextRef.current}${latestPreviewRef.current}`.trim()
    if (text.length === 0) {
      console.log('⚠️  No text to improve')
      return
    }

    // If currently transcribing, stop first
    if (overlayState === 'transcribing') {
      console.log('🛑 Stopping transcription before improving')
      stopTranscription()
      // The text will be finalized, then we'll move to improving state
      setTimeout(() => {
        const finalText = `${latestFinalTextRef.current}${latestPreviewRef.current}`.trim()
        console.log('✨ Starting improvement for text:', finalText)
        setIsImproving(true)
        setImprovedText('')
        setOverlayState('improving')
        window.electron.ipcRenderer.send('transcription:improve', finalText)
      }, 200)
    } else {
      console.log('✨ Starting improvement for text:', text)
      setIsImproving(true)
      setImprovedText('')
      setOverlayState('improving')
      window.electron.ipcRenderer.send('transcription:improve', text)
    }
  }, [overlayState, stopTranscription])

  const handleInsert = useCallback(() => {
    const text = `${latestFinalTextRef.current}${latestPreviewRef.current}`.trim()

    // If currently transcribing, stop first then insert
    if (overlayState === 'transcribing') {
      console.log('🛑 Stopping transcription before inserting')
      stopTranscription()
      // Give it a moment to finalize, then insert
      setTimeout(() => {
        const finalText = `${latestFinalTextRef.current}${latestPreviewRef.current}`.trim()
        if (finalText.length > 0) {
          console.log('📤 Inserting text:', finalText)
          window.electron.ipcRenderer.send('transcription:insert-text', finalText)
        } else {
          window.electron.ipcRenderer.send('transcription:stop-manual')
        }
      }, 200)
    } else {
      if (text.length > 0) {
        console.log('📤 Inserting text:', text)
        window.electron.ipcRenderer.send('transcription:insert-text', text)
      } else {
        window.electron.ipcRenderer.send('transcription:stop-manual')
      }
    }
  }, [overlayState, stopTranscription])
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key to insert (works in all states except improving)
      if (e.key === 'Enter' && overlayState !== 'improving') {
        e.preventDefault()
        if (overlayState === 'improved') {
          handleInsertImproved()
        } else {
          handleInsert()
        }
      }
      // Escape key to insert without improving (works in transcribing and finalized states)
      if (e.key === 'Escape' && (overlayState === 'transcribing' || overlayState === 'finalized')) {
        e.preventDefault()
        handleInsert()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [overlayState, handleInsert, handleInsertImproved])

  // Listen for start/stop commands from main process
  useEffect(() => {
    const handleStart = () => {
      console.log('🎛️  Overlay received start command')
      resetSession()
      setOverlayState('transcribing')
      setImprovedText('')
      setIsImproving(false)
      startTranscription()
    }

    const handleStop = () => {
      console.log('🎛️  Overlay received stop command')
      stopTranscription()
      scheduleFlush(600)
    }

    const handleImproveComplete = (_event: any, improvedTextResult: string) => {
      console.log('✅ Improvement complete, received text length:', improvedTextResult.length)
      setImprovedText(improvedTextResult)
      setIsImproving(false)
      setOverlayState('improved')
    }

    const handleImproveError = (_event: any, error: string) => {
      console.error('❌ Improvement error:', error)
      setIsImproving(false)
      setOverlayState('finalized')
    }

    window.electron.ipcRenderer.on('transcription:start', handleStart)
    window.electron.ipcRenderer.on('transcription:stop', handleStop)
    window.electron.ipcRenderer.on('transcription:improve-complete', handleImproveComplete)
    window.electron.ipcRenderer.on('transcription:improve-error', handleImproveError)

    return () => {
      window.electron.ipcRenderer.removeListener('transcription:start', handleStart)
      window.electron.ipcRenderer.removeListener('transcription:stop', handleStop)
      window.electron.ipcRenderer.removeListener(
        'transcription:improve-complete',
        handleImproveComplete
      )
      window.electron.ipcRenderer.removeListener('transcription:improve-error', handleImproveError)
    }
  }, [resetSession, scheduleFlush, startTranscription, stopTranscription])

  const handleManualStop = () => {
    console.log('🛑 Manual stop clicked in overlay')

    // If we're in transcribing state, stop and finalize
    if (overlayState === 'transcribing') {
      clearFlushTimer()
      stopTranscription()
      flushCombinedTranscript()
    } else {
      // Otherwise just close the overlay
      window.electron.ipcRenderer.send('transcription:stop-manual')
    }
  }

  const isRecording = isActiveState(state)

  // Get preview text from non-final tokens
  const previewText = nonFinalTokens.map((token) => token.text).join('')

  useEffect(() => {
    latestPreviewRef.current = previewText
  }, [previewText])

  // Get last 5 words for compact display
  const allText = `${finalText}${previewText}`
  const words = allText.trim().split(/\s+/).slice(-5)
  const displayText = words.join(' ')

  const getStatusIcon = () => {
    switch (state) {
      case 'RequestingMedia':
      case 'OpeningWebSocket':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      case 'Running':
        return <Mic className="h-4 w-4 animate-pulse text-red-500" />
      case 'FinishingProcessing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'Error':
        return <MicOff className="h-4 w-4 text-red-600" />
      default:
        return <Mic className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = () => {
    if (error) return 'Error'

    switch (state) {
      case 'RequestingMedia':
      case 'OpeningWebSocket':
        return 'Connecting...'
      case 'Running':
        return 'Listening'
      case 'FinishingProcessing':
        return 'Finalizing...'
      case 'Error':
        return 'Error'
      default:
        return 'Ready'
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative w-full rounded-lg border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-sm">
        {/* Header with status and stop button */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-xs font-medium text-white/90">{getStatusText()}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualStop}
            className="h-6 w-6 p-0 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400">
            {error.status}: {error.message}
          </div>
        )}

        {missingApiKey && !error && (
          <div className="mb-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            Soniox API key is missing. Update your desktop environment configuration and restart the
            app.
          </div>
        )}

        {/* Transcribing state: Preview text with buttons */}
        {overlayState === 'transcribing' && (
          <>
            <div className="mb-2 min-h-[60px] rounded bg-white/5 px-2 py-1.5">
              {displayText ? (
                <p className="text-sm text-white/80">{displayText}</p>
              ) : isRecording ? (
                <p className="text-xs italic text-white/40">
                  🎤 Listening... Speak clearly and loudly into your mic
                </p>
              ) : (
                <p className="text-xs italic text-white/40">Start speaking...</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImprove} variant="outline" className="flex-1" size="sm">
                <Sparkles className="mr-1 h-3 w-3" />
                Improve
              </Button>
              <Button
                onClick={handleInsert}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                Insert
              </Button>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-[10px] text-white/30">Press Enter or Esc to insert</div>
              {import.meta.env.DEV && (
                <Button
                  onClick={handleUseMockText}
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-[10px] text-yellow-400 hover:bg-yellow-400/10"
                >
                  🧪 Mock
                </Button>
              )}
            </div>
          </>
        )}

        {/* Finalized state: Show Improve and Insert buttons */}
        {overlayState === 'finalized' && (
          <>
            <div className="mb-2 min-h-[60px] rounded bg-white/5 px-2 py-1.5">
              <p className="text-sm text-white/80">{allText}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleImprove}
                disabled={isImproving}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Improve
              </Button>
              <Button
                onClick={handleInsert}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                Insert
              </Button>
            </div>
            <div className="mt-1 text-center text-[10px] text-white/30">
              Press Enter or Esc to insert
            </div>
          </>
        )}

        {/* Improving state: Show loading spinner */}
        {overlayState === 'improving' && (
          <>
            <div className="mb-2 flex min-h-[80px] items-center justify-center rounded bg-purple-900/20">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                <p className="text-xs text-white/60">Improving text...</p>
              </div>
            </div>
          </>
        )}

        {/* Improved state: Show improved text with insert option */}
        {overlayState === 'improved' && (
          <>
            <div className="mb-2 min-h-[60px] rounded bg-purple-900/20 px-2 py-1.5">
              <p className="text-sm text-white/80">{improvedText}</p>
            </div>
            <Button
              onClick={handleInsertImproved}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              Insert
            </Button>
            <div className="mt-1 text-center text-[10px] text-white/30">Press Enter to insert</div>
          </>
        )}
      </div>
    </div>
  )
}

export default TranscriptionOverlayPage
