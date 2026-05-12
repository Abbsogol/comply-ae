'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'

type Role = 'admin' | 'agent' | null

interface RoleContextType {
  role: Role
  isAdmin: boolean
  loading: boolean
}

const RoleContext = createContext<RoleContextType>({ role: null, isAdmin: false, loading: true })

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setRole((data?.role as Role) || 'agent')
      setLoading(false)
    }
    fetchRole()
  }, [])

  return (
    <RoleContext.Provider value={{ role, isAdmin: role === 'admin', loading }}>
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)
