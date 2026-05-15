'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'

export default function AuthComplete() {
  const router = useRouter()

  useEffect(() => {
    const exchange = async () => {
      // Read code directly from the URL (avoids Suspense requirement)
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      // Confirm session exists before navigating
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      } else {
        // Exchange may have failed — send back to login
        router.replace('/login')
      }
    }

    exchange()
  }, [router])

  return (
    <div style={{
      background: '#080808',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      margin: 0,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: GOLD, fontSize: '15px', opacity: 0.8, margin: 0 }}>
          Signing you in…
        </p>
      </div>
    </div>
  )
}
