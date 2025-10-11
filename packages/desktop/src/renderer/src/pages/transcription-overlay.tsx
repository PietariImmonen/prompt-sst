import { useEffect, useRef } from 'react'
import { Loader2, Mic, MicOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import useTranscribe from '@/hooks/useTranscribe'
import { isActiveState } from '@soniox/speech-to-text-web'

const TranscriptionOverlayPage = () => {
  const finalTextRef = useRef('')

  // Get API key from environment
  const apiKey =
    import.meta.env.VITE_SONIOX_API_KEY ||
    'c476482a47b7e22b2de7629562deb30ed4ccc73d692eb06199b466b156e7ae56'

  // Use the transcription hook
  const { state, finalTokens, nonFinalTokens, startTranscription, stopTranscription, error } =
    useTranscribe({
      apiKey: apiKey,
      onStarted: () => {
        console.log('✅ Overlay: Transcription started')
      },
      onFinished: () => {
        console.log('✅ Overlay: Transcription finished')
        // Clear preview after finish
        setTimeout(() => {
          finalTextRef.current = ''
        }, 1000)
      }
    })

  // Send final tokens to main process for insertion
  useEffect(() => {
    finalTokens.forEach((token) => {
      if (token.text && token.text !== '<end>') {
        console.log('📤 Sending final token to main for insertion:', token.text)
        window.electron.ipcRenderer.send('transcription:insert-text', token.text)
        finalTextRef.current += token.text
      }
    })
  }, [finalTokens])

  // Listen for start/stop commands from main process
  useEffect(() => {
    const handleStart = () => {
      console.log('🎛️  Overlay received start command')
      startTranscription()
    }

    const handleStop = () => {
      console.log('🎛️  Overlay received stop command')
      stopTranscription()
    }

    window.electron.ipcRenderer.on('transcription:start', handleStart)
    window.electron.ipcRenderer.on('transcription:stop', handleStop)

    return () => {
      window.electron.ipcRenderer.removeListener('transcription:start', handleStart)
      window.electron.ipcRenderer.removeListener('transcription:stop', handleStop)
    }
  }, [startTranscription, stopTranscription])

  const handleManualStop = () => {
    console.log('🛑 Manual stop clicked in overlay')
    stopTranscription()
    window.electron.ipcRenderer.send('transcription:stop-manual')
  }

  const isRecording = isActiveState(state)

  // Get preview text from non-final tokens
  const previewText = nonFinalTokens.map((token) => token.text).join('')

  // Get last 5 words for compact display
  const allText = finalTextRef.current + previewText
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

        {/* Preview text */}
        <div className="min-h-[40px] rounded bg-white/5 px-2 py-1.5">
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

        {/* Keyboard hint */}
        <div className="mt-2 text-center text-[10px] text-white/30">
          Press {process.platform === 'darwin' ? 'Cmd+Shift+F' : 'Ctrl+Shift+F'} or Esc to stop
        </div>
      </div>
    </div>
  )
}

export default TranscriptionOverlayPage
