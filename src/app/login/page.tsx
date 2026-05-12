'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const GOLD = '#C9963F'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setLoading(false)
        setMode('signin')
        setPassword('')
        setConfirmPassword('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        router.push('/dashboard')
      }
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://comply-ae.vercel.app/dashboard',
      },
    })
  }

  const handleAppleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: 'https://comply-ae.vercel.app/dashboard',
      },
    })
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#080808',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }

  const socialBtnStyle = {
    width: '100%',
    padding: '11px',
    backgroundColor: '#0D0D0D',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    color: '#ccccdd',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080808',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        backgroundColor: '#0D0D0D',
        border: '1px solid #1E1E1E',
        borderRadius: '12px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px',
      }}>
        {/* Logo */}
        <h1 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', marginBottom: '4px', letterSpacing: '0.05em' }}>
          COMPLY<span style={{ color: GOLD }}>.AE</span>
        </h1>
        <p style={{ color: '#555', fontSize: '13px', marginBottom: '32px', letterSpacing: '0.03em' }}>
          UAE Real Estate Compliance Platform
        </p>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <button onClick={handleGoogleLogin} style={socialBtnStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button onClick={handleAppleLogin} style={socialBtnStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1E1E1E' }} />
          <span style={{ color: '#444', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1E1E1E' }} />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#080808',
          border: '1px solid #1E1E1E',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '28px',
        }}>
          {(['signin', 'signup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setMode(tab); setError(''); setSuccess('') }}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: '600',
                transition: 'all 0.2s',
                backgroundColor: mode === tab ? GOLD : 'transparent',
                color: mode === tab ? '#ffffff' : '#555',
              }}
            >
              {tab === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#aaaabb', fontSize: '13px', display: 'block', marginBottom: '7px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: mode === 'signup' ? '16px' : '24px' }}>
            <label style={{ color: '#aaaabb', fontSize: '13px', display: 'block', marginBottom: '7px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
          </div>

          {mode === 'signup' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#aaaabb', fontSize: '13px', display: 'block', marginBottom: '7px' }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
            </div>
          )}

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', backgroundColor: '#2d0f0f', padding: '10px 12px', borderRadius: '6px' }}>{error}</p>
          )}
          {success && (
            <p style={{ color: '#4ade80', fontSize: '13px', marginBottom: '16px', backgroundColor: '#052e16', padding: '10px 12px', borderRadius: '6px' }}>{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              backgroundColor: GOLD, color: '#ffffff',
              border: 'none', borderRadius: '8px',
              fontSize: '15px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p style={{ color: '#444', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }} style={{ color: GOLD, cursor: 'pointer', fontWeight: '600' }}>
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  )
}
