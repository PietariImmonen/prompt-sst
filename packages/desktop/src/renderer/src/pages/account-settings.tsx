import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'

const AccountSettingsPage = () => {
  const auth = useAuth()
  const account = auth.current

  const [accountName, setAccountName] = React.useState(account?.name || '')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (account?.name) {
      setAccountName(account.name)
    }
  }, [account?.name])

  const handleSave = React.useCallback(async () => {
    if (!account) return

    const name = accountName.trim()
    if (!name) {
      toast.error('Account name is required')
      return
    }

    if (name === account.name) {
      toast.info('No changes to save')
      return
    }

    setIsSaving(true)
    try {
      // TODO: Implement account name update via API
      // For now, we'll show a success message
      // In a real implementation, you'd call an API endpoint here

      // Example:
      // await fetch(`${import.meta.env.VITE_API_URL}account/update`, {
      //   method: 'PATCH',
      //   headers: {
      //     'Authorization': `Bearer ${account.token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ name })
      // })

      toast.success('Account name updated successfully')

      // Refresh auth state to get updated account info
      await auth.refresh()
    } catch (error) {
      console.error('Failed to update account name:', error)
      toast.error('Failed to update account name. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [account, accountName, auth])

  if (!account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-foreground">
        <p className="text-sm text-muted-foreground">Loading account information...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-foreground">
      <div className="flex flex-1 flex-col gap-4 max-w-full overflow-hidden">
        <div className="sticky top-0 z-10 bg-black shadow-sm border-b border-border/60 pb-4 pt-2">
          <div className="ml-4 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">Account Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account information</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          <Card className="bg-card/80 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>View and update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Your account name"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  This is your display name within the application
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={account.email} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-id">Account ID</Label>
                <Input
                  id="account-id"
                  value={account.id}
                  disabled
                  className="bg-muted/50 font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">Your unique account identifier</p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || accountName.trim() === account.name}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {account.workspaces && account.workspaces.length > 0 && (
            <Card className="bg-card/80 backdrop-blur border-border/60">
              <CardHeader>
                <CardTitle>Workspaces</CardTitle>
                <CardDescription>Your active workspaces</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {account.workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{workspace.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{workspace.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountSettingsPage
