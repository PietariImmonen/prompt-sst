import {
  SonioxClient,
  type ErrorStatus,
  type RecorderState,
  type Token,
  type TranslationConfig
} from '@soniox/speech-to-text-web'
import { useCallback, useEffect, useRef, useState } from 'react'

const END_TOKEN = '<end>'

interface UseTranscribeParameters {
  apiKey: string | (() => Promise<string>)
  translationConfig?: TranslationConfig
  onStarted?: () => void
  onFinished?: () => void
}

type TranscriptionError = {
  status: ErrorStatus
  message: string
  errorCode: number | undefined
}

/**
 * useTranscribe hook wraps Soniox speech-to-text-web SDK
 *
 * This hook manages the transcription lifecycle and provides
 * real-time access to final and non-final tokens.
 */
export default function useTranscribe({
  apiKey,
  translationConfig,
  onStarted,
  onFinished
}: UseTranscribeParameters) {
  const sonioxClient = useRef<SonioxClient | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Initialize client only once, handle async API key
  useEffect(() => {
    const initClient = async () => {
      if (sonioxClient.current == null) {
        const key = typeof apiKey === 'function' ? await apiKey() : apiKey

        if (!key) {
          console.error('❌ No API key provided to useTranscribe')
          return
        }

        console.log('🔧 Creating SonioxClient with key:', key.substring(0, 10) + '...')
        sonioxClient.current = new SonioxClient({ apiKey: key })
      }
    }

    initClient()
  }, [apiKey])

  const [state, setState] = useState<RecorderState>('Init')
  const [finalTokens, setFinalTokens] = useState<Token[]>([])
  const [nonFinalTokens, setNonFinalTokens] = useState<Token[]>([])
  const [error, setError] = useState<TranscriptionError | null>(null)
  const [audioURL, setAudioURL] = useState<string | null>(null)

  const startTranscription = useCallback(async () => {
    if (!sonioxClient.current) {
      console.error('❌ SonioxClient not initialized')
      return
    }

    console.log('🎙️ Starting transcription...')
    setFinalTokens([])
    setNonFinalTokens([])
    setError(null)
    setAudioURL(null)
    audioChunksRef.current = []

    sonioxClient.current.start({
      model: 'stt-rt-preview',
      languageHints: ['en'],
      enableLanguageIdentification: true,
      enableSpeakerDiarization: false,
      enableEndpointDetection: true,

      translation: translationConfig || undefined,

      // Microphone constraints - use browser defaults for best compatibility
      audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        sampleSize: 16,
        channelCount: 1
        // Let browser choose optimal sampleRate (usually 48000 Hz)
        // Soniox SDK handles resampling if needed
      },

      onFinished: () => {
        console.log('🏁 Transcription finished')
        onFinished?.()
      },

      onStarted: async () => {
        console.log('✅ Transcription started')
        onStarted?.()

        // Start recording audio after Soniox has acquired the stream
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          })

          // Try different codecs until one works
          const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
          ]

          let selectedMimeType = 'audio/webm'
          for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedMimeType = mimeType
              console.log('📼 Using MIME type:', mimeType)
              break
            }
          }

          const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType })
          mediaRecorderRef.current = mediaRecorder

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data)
              console.log('🎵 Audio chunk recorded:', event.data.size, 'bytes')
            }
          }

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType })
            const url = URL.createObjectURL(audioBlob)
            setAudioURL(url)
            console.log('💾 Audio saved, size:', audioBlob.size, 'bytes')
            stream.getTracks().forEach((track) => track.stop())
          }

          mediaRecorder.start(100) // Capture in 100ms chunks for smoother recording
          console.log('📼 MediaRecorder started')
        } catch (err) {
          console.error('❌ Failed to start MediaRecorder:', err)
        }
      },

      onError: (status: ErrorStatus, message: string, errorCode: number | undefined) => {
        console.error('❌ Transcription error:', { status, message, errorCode })
        setError({ status, message, errorCode })
      },

      onStateChange: ({ newState }) => {
        console.log('🔄 State changed to:', newState)
        setState(newState)
      },

      // Add detailed logging to debug token reception
      onPartialResult(result) {
        console.log('📨 ========== RECEIVED RESULT ==========')
        console.log('📨 Token count:', result.tokens?.length || 0)
        console.log('📨 Full result:', JSON.stringify(result, null, 2))

        if (!result.tokens || result.tokens.length === 0) {
          console.warn('⚠️ Received result with 0 tokens')
          console.log('=======================================')
          return
        }

        const newFinalTokens: Token[] = []
        const newNonFinalTokens: Token[] = []

        for (const token of result.tokens) {
          // Ignore endpoint detection tokens
          if (token.text === END_TOKEN) {
            continue
          }

          console.log(`🔹 Token: "${token.text}" (final: ${token.is_final})`)

          if (token.is_final) {
            newFinalTokens.push(token)
          } else {
            newNonFinalTokens.push(token)
          }
        }

        if (newFinalTokens.length > 0) {
          console.log(`✅ Adding ${newFinalTokens.length} final tokens`)
          setFinalTokens((previousTokens) => [...previousTokens, ...newFinalTokens])
        }

        if (newNonFinalTokens.length > 0) {
          console.log(`⏸️ Setting ${newNonFinalTokens.length} non-final tokens`)
        }
        setNonFinalTokens(newNonFinalTokens)

        console.log('=======================================')
      }
    })
  }, [onFinished, onStarted, translationConfig])

  const stopTranscription = useCallback(() => {
    console.log('🛑 Stopping transcription')
    sonioxClient.current?.stop()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      console.log('📼 MediaRecorder stopped')
    }
  }, [])

  useEffect(() => {
    return () => {
      sonioxClient.current?.cancel()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL)
      }
    }
  }, [audioURL])

  return {
    startTranscription,
    stopTranscription,
    state,
    finalTokens,
    nonFinalTokens,
    error,
    audioURL
  }
}
