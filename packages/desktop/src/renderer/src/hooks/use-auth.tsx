import * as React from 'react'

import { AuthContext } from '@/providers/auth-provider/auth-context'

export function useAuth() {
  const result = React.useContext(AuthContext)
  if (!result) throw new Error('useAuth must be used within an AuthProvider')
  return result
}
