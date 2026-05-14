'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RoleProvider, useRole } from '@/lib/RoleContext'

const GOLD = '#C9963F'
const DARK = '#080808'
const BORDER = '#1E1E1E'

const navItems = [
  { label: 'Dashboard',   path: '/dashboard',              icon: '▦'  },
  { label: 'Properties',  path: '/dashboard/properties',   icon: '🏠' },
  { label: 'Tenants',     path: '/dashboard/clients',      icon: '👤' },
  { label: 'Inspections', path: '/dashboard/inspections',  icon: '📝' },
  { label: 'Documents',   path: '/dashboard/documents',    icon: '📄' },
  { label: 'Calendar',    path: '/dashboard/calendar',     icon: '📅' },
  { label: 'Vault',       path: '/dashboard/vault',        icon: '🔒' },
  { label: 'Reports',     path: '/dashboard/reports',      icon: '📊' },
  { label: 'Settings',    path: '/dashboard/settings',     icon: '⚙️' },
]

function SidebarContent() {
  const router = useRouter()
  const pathname = usePathname()
  const { role } = useRole()
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
    }
    getUser()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <div style={{
      width: '232px', flexShrink: 0,
      backgroundColor: '#060606',
      borderRight: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, height: '100vh',
    }}>

      {/* Logo */}
      <div style={{ padding: '28px 24px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{
          color: '#F5F5F5', fontSize: '17px', fontWeight: '800',
          margin: 0, letterSpacing: '0.06em', fontFamily: 'var(--font-playfair), Georgia, serif',
        }}>
          COMPLY<span style={{ color: GOLD }}>.AE</span>
        </h1>
        <p style={{ color: '#444', fontSize: '11px', margin: '5px 0 0 0', letterSpacing: '0.04em' }}>
          Property Platform
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {navItems.map(item => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 14px', borderRadius: '7px',
                border: 'none', cursor: 'pointer', marginBottom: '3px',
                textAlign: 'left', transition: 'all 0.2s ease',
                backgroundColor: active ? `${GOLD}14` : 'transparent',
                color: active ? GOLD : '#555',
                fontSize: '13.5px', fontWeight: active ? '600' : '400',
                borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent',
                letterSpacing: '0.01em',
              }}
            >
              <span style={{ fontSize: '14px', opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User section */}
      <div style={{ padding: '16px 12px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ padding: '10px 14px', marginBottom: '8px' }}>
          <div style={{ marginBottom: '6px' }}>
            <span style={{
              padding: '2px 8px', borderRadius: '4px',
              fontSize: '9px', fontWeight: '800', letterSpacing: '0.1em',
              backgroundColor: role === 'admin' ? `${GOLD}18` : '#0D150D',
              color: role === 'admin' ? GOLD : '#4ade80',
              border: `1px solid ${role === 'admin' ? `${GOLD}33` : '#2a4a2a'}`,
            }}>
              {role === 'admin' ? 'ADMIN' : 'AGENT'}
            </span>
          </div>
          <p style={{ color: '#444', fontSize: '11px', margin: '0 0 2px 0' }}>Signed in as</p>
          <p style={{ color: '#888', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '9px 12px',
            backgroundColor: 'transparent',
            border: `1px solid ${BORDER}`,
            borderRadius: '7px', color: '#444',
            fontSize: '13px', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.borderColor = `${GOLD}55`
            ;(e.target as HTMLButtonElement).style.color = '#888'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.borderColor = BORDER
            ;(e.target as HTMLButtonElement).style.color = '#444'
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <div style={{
        display: 'flex', minHeight: '100vh',
        backgroundColor: DARK,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#F5F5F5',
      }}>
        <SidebarContent />
        <div style={{ marginLeft: '232px', flex: 1, minHeight: '100vh' }}>
          {children}
        </div>
      </div>
    </RoleProvider>
  )
}
