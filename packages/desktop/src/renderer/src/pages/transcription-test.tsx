import { useState, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

// Extend Window type for transcription API
declare global {
  interface Window {
    transcription?: {
      getStatus: () => Promise<{
        status: string
        isRecording: boolean
        hasApiKey: boolean
      }>
    }
  }
}

const TranscriptionTestPage = () => {
  const [testText, setTestText] = useState('')
  const [status, setStatus] = useState<string>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if transcription service is available
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      console.log('🔍 Checking transcription status...')

      // Check if window.transcription exists
      if (!window.transcription) {
        console.error('❌ window.transcription is not defined!')
        setError('Transcription API not available - check preload')
        return
      }

      const result = await window.transcription.getStatus()
      console.log('✅ Got transcription status:', result)

      setStatus(result.status)
      setIsRecording(result.isRecording)
      setHasApiKey(result.hasApiKey)
      setError(null)
    } catch (err) {
      setError(
        `Failed to get transcription status: ${err instanceof Error ? err.message : String(err)}`
      )
      console.error('❌ Status check error:', err)
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'recording':
        return 'bg-red-500'
      case 'connecting':
        return 'bg-yellow-500'
      case 'processing':
        return 'bg-blue-500'
      case 'error':
        return 'bg-red-600'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = () => {
    if (status === 'recording') {
      return <Mic className="h-5 w-5 animate-pulse" />
    }
    if (status === 'connecting' || status === 'processing') {
      return <Loader2 className="h-5 w-5 animate-spin" />
    }
    if (status === 'error') {
      return <MicOff className="h-5 w-5" />
    }
    return <Mic className="h-5 w-5" />
  }

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Transcription Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test the universal transcription feature in a controlled environment
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Service Status</span>
              <Badge className={getStatusColor()}>
                <span className="flex items-center gap-2">
                  {getStatusIcon()}
                  {status}
                </span>
              </Badge>
            </CardTitle>
            <CardDescription>Current state of the transcription service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">API Key:</span>
                <span
                  className={`ml-2 font-medium ${hasApiKey ? 'text-green-600' : 'text-red-600'}`}
                >
                  {hasApiKey ? '✓ Configured' : '✗ Not configured'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Recording:</span>
                <span
                  className={`ml-2 font-medium ${isRecording ? 'text-red-600' : 'text-gray-600'}`}
                >
                  {isRecording ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            {!hasApiKey && (
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <p className="font-medium">API Key Not Configured</p>
                <p className="mt-1">
                  Set your Soniox API key:{' '}
                  <code className="text-xs">bunx sst secret set SonioxApiKey "your-key"</code>
                </p>
              </div>
            )}

            <Button onClick={checkStatus} variant="outline" size="sm" className="w-full">
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        {/* Test Area Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Transcription</CardTitle>
            <CardDescription>
              Click in the text area below and press{' '}
              <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
                {process.platform === 'darwin' ? 'Cmd+Shift+F' : 'Ctrl+Shift+F'}
              </kbd>{' '}
              to start transcribing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Click here and press Cmd+Shift+F to start transcribing..."
              className="min-h-[200px] font-mono text-sm"
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{testText.length} characters</span>
              <span>{testText.split(/\s+/).filter(Boolean).length} words</span>
            </div>

            <Button onClick={() => setTestText('')} variant="outline" size="sm" className="w-full">
              Clear Text
            </Button>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>Ensure your Soniox API key is configured (see status above)</li>
              <li>Click into the text area above to focus it</li>
              <li>
                Press{' '}
                <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
                  {process.platform === 'darwin' ? 'Cmd+Shift+F' : 'Ctrl+Shift+F'}
                </kbd>{' '}
                to start transcription
              </li>
              <li>Speak clearly into your microphone</li>
              <li>Watch text appear in real-time in the text area</li>
              <li>
                Press{' '}
                <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
                  {process.platform === 'darwin' ? 'Cmd+Shift+F' : 'Ctrl+Shift+F'}
                </kbd>{' '}
                or{' '}
                <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
                  Esc
                </kbd>{' '}
                to stop
              </li>
            </ol>

            <div className="mt-4 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> Check the browser console (DevTools) for detailed logs about
                WebSocket connections, audio capture, and transcription events.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-xs">
              <div>
                <span className="text-muted-foreground">Platform:</span>{' '}
                <span className="font-medium">{process.platform}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Shortcut:</span>{' '}
                <span className="font-medium">
                  {process.platform === 'darwin' ? 'Cmd+Shift+F' : 'Ctrl+Shift+F'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Environment:</span>{' '}
                <span className="font-medium">
                  {import.meta.env.VITE_SONIOX_API_KEY ? 'API Key Present' : 'No API Key'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TranscriptionTestPage
