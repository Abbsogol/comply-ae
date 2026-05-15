'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'

export default function AuthComplete() {
  const router = useRouter()

  useEffect(() => {
    // With implicit flow, Supabase auto-extracts tokens from the URL hash.
    // We listen for the SIGNED_IN event and redirect once the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe()
        router.replace('/dashboard')
      }
    })

    // Fallback: if already signed in (e.g. session already in storage), go now.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        router.replace('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
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
      <p style={{ color: GOLD, fontSize: '15px', opacity: 0.8 }}>
        Signing you in…
      </p>
    </div>
  )
}
