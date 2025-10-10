import { useEffect, useState } from 'react'
import { Loader2, Mic, MicOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type TranscriptionStatus = 'idle' | 'connecting' | 'recording' | 'processing' | 'error'

interface StatusUpdate {
  status: TranscriptionStatus
  isRecording: boolean
  text: string
}

interface TokenUpdate {
  text: string
  isFinal: boolean
  accumulated: string
}

const TranscriptionOverlayPage = () => {
  const [status, setStatus] = useState<TranscriptionStatus>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [recentTokens, setRecentTokens] = useState<string[]>([])

  useEffect(() => {
    // Listen for status updates
    const handleStatus = (_event: any, data: StatusUpdate) => {
      setStatus(data.status)
      setIsRecording(data.isRecording)
    }

    // Listen for token updates
    const handleToken = (_event: any, data: TokenUpdate) => {
      // Keep only last 5 words for preview
      const words = data.accumulated.trim().split(/\s+/).slice(-5)
      setRecentTokens(words)
      setPreviewText(words.join(' '))
    }

    window.electron.ipcRenderer.on('transcription:status', handleStatus)
    window.electron.ipcRenderer.on('transcription:token', handleToken)

    return () => {
      window.electron.ipcRenderer.removeListener('transcription:status', handleStatus)
      window.electron.ipcRenderer.removeListener('transcription:token', handleToken)
    }
  }, [])

  const handleStop = () => {
    window.electron.ipcRenderer.send('transcription:stop-manual')
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      case 'recording':
        return <Mic className="h-4 w-4 text-red-500 animate-pulse" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'error':
        return <MicOff className="h-4 w-4 text-red-600" />
      default:
        return <Mic className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...'
      case 'recording':
        return 'Listening'
      case 'processing':
        return 'Finalizing...'
      case 'error':
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
            onClick={handleStop}
            className="h-6 w-6 p-0 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview text */}
        <div className="min-h-[40px] rounded bg-white/5 px-2 py-1.5">
          {previewText ? (
            <p className="text-sm text-white/80">{previewText}</p>
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
