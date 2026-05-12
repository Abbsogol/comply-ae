'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080808',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#0D0D0D',
        border: '1px solid #1E1E1E',
        borderRadius: '12px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px'
      }}>
        <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
          COMPLY.AE
        </h1>
        <p style={{ color: '#8888aa', fontSize: '14px', marginBottom: '32px' }}>
          Sign in to your compliance dashboard
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#ccccdd', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#080808',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#ccccdd', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#080808',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#C9963F',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
