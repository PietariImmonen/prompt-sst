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
  const [showingOriginal, setShowingOriginal] = useState(false)

  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasFlushedRef = useRef(false)
  const latestFinalTextRef = useRef('')
  const latestPreviewRef = useRef('')
  const textDisplayRef = useRef<HTMLDivElement>(null)

  // Language hints will be received from main process via IPC
  const [languageHints, setLanguageHints] = useState<string[]>(['en'])

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
      languageHints: languageHints,
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

  // Get preview text from non-final tokens (declare early to avoid hook order issues)
  const previewText = nonFinalTokens.map((token) => token.text).join('')

  useEffect(() => {
    latestFinalTextRef.current = finalText
    if (finalText.length > 0) {
      console.log(`📝 Current final text length: ${finalText.length}`)
    }
  }, [finalText])

  // Auto-scroll to bottom when text updates during transcription
  useEffect(() => {
    if (textDisplayRef.current && overlayState === 'transcribing') {
      textDisplayRef.current.scrollTop = textDisplayRef.current.scrollHeight
    }
  }, [finalText, previewText, overlayState])

  useEffect(() => {
    latestPreviewRef.current = previewText
  }, [previewText])

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

  const handleToggleVersion = useCallback(() => {
    setShowingOriginal(!showingOriginal)
    console.log(`🔄 Toggling to ${!showingOriginal ? 'original' : 'improved'} version`)
  }, [showingOriginal])

  const handleInsertCurrentVersion = useCallback(() => {
    if (overlayState === 'improved') {
      const textToInsert = showingOriginal
        ? `${latestFinalTextRef.current}${latestPreviewRef.current}`.trim()
        : improvedText

      if (textToInsert.length > 0) {
        console.log(`📤 Inserting ${showingOriginal ? 'original' : 'improved'} text:`, textToInsert)
        window.electron.ipcRenderer.send('transcription:insert-text', textToInsert)
      }
    }
  }, [overlayState, showingOriginal, improvedText])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key to insert (works in all states except improving)
      if (e.key === 'Enter' && overlayState !== 'improving') {
        e.preventDefault()
        if (overlayState === 'improved') {
          handleInsertCurrentVersion()
        } else {
          handleInsert()
        }
      }
      // Escape key to insert without improving (works in transcribing and finalized states)
      if (e.key === 'Escape' && (overlayState === 'transcribing' || overlayState === 'finalized')) {
        e.preventDefault()
        handleInsert()
      }
      // Cmd/Ctrl + B to toggle between original and improved (only in improved state)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 'b' &&
        overlayState === 'improved' &&
        improvedText.length > 0
      ) {
        e.preventDefault()
        handleToggleVersion()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [overlayState, handleInsert, handleInsertCurrentVersion, handleToggleVersion, improvedText])

  // Listen for start/stop commands and language hints from main process
  useEffect(() => {
    const handleStart = (_event: any, payload?: { languageHints?: string[] }) => {
      console.log('🎛️  Overlay received start command')

      // Update language hints if provided
      if (payload?.languageHints && Array.isArray(payload.languageHints)) {
        setLanguageHints(payload.languageHints)
        console.log('🌐 Received language hints:', payload.languageHints)
      }

      resetSession()
      setOverlayState('transcribing')
      setImprovedText('')
      setIsImproving(false)
      setShowingOriginal(false)
      startTranscription()
    }

    const handleStop = () => {
      console.log('🎛️  Overlay received stop command')
      stopTranscription()
      scheduleFlush(600)
    }

    const handleImproveComplete = (_event: any, payload: unknown) => {
      const improvedTextResult =
        typeof payload === 'string' ? payload : (payload as { text?: string })?.text

      if (!improvedTextResult) {
        console.warn('⚠️  Received improvement payload without text')
        setIsImproving(false)
        setOverlayState('finalized')
        return
      }

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

  // Show full text (no word limitation)
  const allText = `${finalText}${previewText}`

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

        {/* Transcribing state: Full text with scrolling */}
        {overlayState === 'transcribing' && (
          <>
            <div
              ref={textDisplayRef}
              className="mb-2 max-h-[120px] min-h-[120px] overflow-y-auto rounded bg-white/5 px-2 py-1.5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20"
            >
              {allText ? (
                <p className="whitespace-pre-wrap break-words text-sm text-white/80">{allText}</p>
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
            <div className="mb-2 max-h-[120px] min-h-[120px] overflow-y-auto rounded bg-white/5 px-2 py-1.5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20">
              <p className="whitespace-pre-wrap break-words text-sm text-white/80">{allText}</p>
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

        {/* Improved state: Show improved text with toggle and insert options */}
        {overlayState === 'improved' && (
          <>
            <div
              className={`mb-2 max-h-[120px] min-h-[120px] overflow-y-auto rounded px-2 py-1.5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 ${
                showingOriginal ? 'bg-white/5' : 'bg-purple-900/20'
              }`}
            >
              <p className="whitespace-pre-wrap break-words text-sm text-white/80">
                {showingOriginal ? allText : improvedText}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleToggleVersion} variant="outline" className="flex-1" size="sm">
                {showingOriginal ? '✨ Show Improved' : '↩️ Show Original'}
              </Button>
              <Button
                onClick={handleInsertCurrentVersion}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                Insert {showingOriginal ? 'Original' : 'Improved'}
              </Button>
            </div>
            <div className="mt-1 text-center text-[10px] text-white/30">
              Press Enter to insert • {process.platform === 'darwin' ? 'Cmd' : 'Ctrl'}+B to toggle
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TranscriptionOverlayPage
