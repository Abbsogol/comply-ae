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
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#aaaabb', fontSize: '13px', display: 'block', marginBottom: '7px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: mode === 'signup' ? '16px' : '24px' }}>
            <label style={{ color: '#aaaabb', fontSize: '13px', display: 'block', marginBottom: '7px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#aaaabb', fontSize: '13px', display: 'block', marginBottom: '7px' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', backgroundColor: '#2d0f0f', padding: '10px 12px', borderRadius: '6px' }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ color: '#4ade80', fontSize: '13px', marginBottom: '16px', backgroundColor: '#052e16', padding: '10px 12px', borderRadius: '6px' }}>
              {success}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: GOLD,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              letterSpacing: '0.02em',
            }}
          >
            {loading
              ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Switch mode link */}
        <p style={{ color: '#444', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <span
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
            style={{ color: GOLD, cursor: 'pointer', fontWeight: '600' }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  )
}
