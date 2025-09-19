import { Loader2 } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/auth'
import DashboardPage from './pages/dashboard'

const SplashScreen = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0E111A] text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        <p className="text-sm text-white/60">Starting Prompt Saver…</p>
      </div>
    </div>
  )
}

function App(): JSX.Element {
  const { initialized, loading, isAuthenticated } = useAuth()

  if (!initialized && loading) {
    return <SplashScreen />
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return <DashboardPage />
}

export default App
