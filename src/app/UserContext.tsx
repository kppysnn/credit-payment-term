import React, { createContext, useContext, useState } from 'react'
import type { CurrentUser, UserRole } from '../features/credit-payment-term/types/user'
import { MOCK_USERS, getMockUser } from '../features/credit-payment-term/data/mockUsers'

interface UserContextValue {
  currentUser: CurrentUser
  setRole: (role: UserRole) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => getMockUser('sales'))

  function setRole(role: UserRole) {
    setCurrentUser(getMockUser(role))
  }

  return (
    <UserContext.Provider value={{ currentUser, setRole }}>
      {children}
    </UserContext.Provider>
  )
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useCurrentUser must be inside UserProvider')
  return ctx
}

export { MOCK_USERS }
