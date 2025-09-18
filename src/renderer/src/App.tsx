import { useEffect, useState } from 'react'
import { Button } from './components/ui/button'

function App(): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize app
    console.log('Prompt Saver App initialized')

    // Simulate loading for development
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading Prompt Saver...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Prompt Saver</h1>
        <p className="text-xl text-gray-600 mb-8">Your AI prompt management companion</p>
        <div className="space-y-4">
          <p className="text-gray-700">
            ✅ Project structure created
            <br />
            ✅ Supabase integration ready
            <br />
            ✅ Zustand state management configured
            <br />✅ TypeScript compilation successful
          </p>
          <Button>Ready for Development</Button>
        </div>
        <div className="mt-8 text-sm text-gray-500">
          Next: Implement authentication UI and connect to Supabase
        </div>
      </div>
    </div>
  )
}

export default App
