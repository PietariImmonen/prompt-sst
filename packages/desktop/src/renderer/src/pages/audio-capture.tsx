import { useEffect, useRef, useState } from 'react'

const AudioCapturePage = () => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  useEffect(() => {
    // Listen for start command from main process
    const handleStart = () => {
      startCapture()
    }

    // Listen for stop command from main process
    const handleStop = () => {
      stopCapture()
    }

    window.electron.ipcRenderer.on('transcription:start', handleStart)
    window.electron.ipcRenderer.on('transcription:stop', handleStop)

    return () => {
      stopCapture()
      window.electron.ipcRenderer.removeListener('transcription:start', handleStart)
      window.electron.ipcRenderer.removeListener('transcription:stop', handleStop)
    }
  }, [])

  const startCapture = async () => {
    try {
      console.log('🎙️ Requesting microphone access...')

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz for Soniox
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      mediaStreamRef.current = stream
      console.log('✅ Microphone access granted')

      // Create audio context for processing
      audioContextRef.current = new AudioContext({
        sampleRate: 16000
      })

      // Create source from stream
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)

      // Create script processor for audio chunks
      // Note: ScriptProcessorNode is deprecated but still widely used
      // TODO: Migrate to AudioWorklet for better performance
      const bufferSize = 4096
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1)

      processorRef.current.onaudioprocess = (event) => {
        if (!isCapturing) return

        const inputData = event.inputBuffer.getChannelData(0)

        // Convert float32 audio data to int16 PCM
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          // Convert from [-1, 1] to [-32768, 32767]
          const sample = Math.max(-1, Math.min(1, inputData[i]))
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        }

        // Send to main process
        window.electron.ipcRenderer.send('transcription:audio-chunk', pcmData.buffer)
      }

      // Connect nodes
      sourceRef.current.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)

      setIsCapturing(true)
      setError(null)
      console.log('✅ Audio capture started')
    } catch (err) {
      console.error('Failed to start audio capture:', err)
      setError(err instanceof Error ? err.message : 'Failed to access microphone')
      setIsCapturing(false)
    }
  }

  const stopCapture = () => {
    console.log('🛑 Stopping audio capture...')

    // Disconnect and clean up audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Stop all tracks in the media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    setIsCapturing(false)
    console.log('✅ Audio capture stopped')
  }

  return (
    <div style={{ display: 'none' }}>
      {/* Hidden audio capture page */}
      {error && <div>Error: {error}</div>}
      {isCapturing ? 'Capturing...' : 'Idle'}
    </div>
  )
}

export default AudioCapturePage
