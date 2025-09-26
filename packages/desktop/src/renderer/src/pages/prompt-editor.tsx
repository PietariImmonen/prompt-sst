import { useNavigate, useParams } from 'react-router-dom'

import { PromptEditor } from '@/components/prompt-editor/prompt-editor'
import { useSubscribe } from '@/hooks/use-replicache'
import { PromptStore } from '@/data/prompt-store'
import { Button } from '@/components/ui/button'

const noopQuery = async () => undefined

export default function PromptEditorPage() {
  const { promptId } = useParams<{ promptId: string }>()
  const navigate = useNavigate()

  const prompt = useSubscribe(
    promptId ? PromptStore.fromID(promptId) : noopQuery,
    { default: undefined, dependencies: [promptId] }
  )

  if (!promptId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">No prompt selected.</p>
          <Button variant="outline" onClick={() => navigate('/sessions')}>
            Back to prompts
          </Button>
        </div>
      </div>
    )
  }

  if (!prompt) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Loading prompt…</p>
          <Button variant="outline" onClick={() => navigate('/sessions')}>
            Back to prompts
          </Button>
        </div>
      </div>
    )
  }

  return <PromptEditor prompt={prompt} onDismiss={() => navigate('/sessions')} />
}
