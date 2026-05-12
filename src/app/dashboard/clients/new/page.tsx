'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    nationality: '',
    id_type: '',
    id_number: '',
    source_of_funds: '',
    property_interest: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('clients').insert([form])

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const fieldStyle = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#080808',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    color: '#ccccdd',
    fontSize: '13px',
    display: 'block' as const,
    marginBottom: '6px',
    fontWeight: '500' as const,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080808', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ backgroundColor: '#0D0D0D', borderBottom: '1px solid #1E1E1E', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: 0 }}>COMPLY.AE</h1>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#8888aa', fontSize: '14px', cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={{ padding: '40px 32px', maxWidth: '720px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>New Client KYC</h2>
        <p style={{ color: '#8888aa', fontSize: '14px', marginBottom: '32px' }}>Fill in the client details for compliance screening.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '28px', marginBottom: '24px' }}>
            <p style={{ color: '#C9963F', fontSize: '12px', fontWeight: '600', marginBottom: '20px', letterSpacing: '0.05em' }}>PERSONAL INFORMATION</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input name="full_name" value={form.full_name} onChange={handleChange} required style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nationality</label>
                <input name="nationality" value={form.nationality} onChange={handleChange} style={fieldStyle} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '28px', marginBottom: '24px' }}>
            <p style={{ color: '#C9963F', fontSize: '12px', fontWeight: '600', marginBottom: '20px', letterSpacing: '0.05em' }}>IDENTITY VERIFICATION</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>ID Type</label>
                <select name="id_type" value={form.id_type} onChange={handleChange} style={fieldStyle}>
                  <option value="">Select...</option>
                  <option value="passport">Passport</option>
                  <option value="emirates_id">Emirates ID</option>
                  <option value="national_id">National ID</option>
                  <option value="residence_visa">Residence Visa</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>ID Number</label>
                <input name="id_number" value={form.id_number} onChange={handleChange} style={fieldStyle} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '28px', marginBottom: '24px' }}>
            <p style={{ color: '#C9963F', fontSize: '12px', fontWeight: '600', marginBottom: '20px', letterSpacing: '0.05em' }}>AML INFORMATION</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Source of Funds</label>
                <select name="source_of_funds" value={form.source_of_funds} onChange={handleChange} style={fieldStyle}>
                  <option value="">Select...</option>
                  <option value="employment">Employment / Salary</option>
                  <option value="business">Business Income</option>
                  <option value="investment">Investment Returns</option>
                  <option value="inheritance">Inheritance</option>
                  <option value="savings">Personal Savings</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Property Interest</label>
                <select name="property_interest" value={form.property_interest} onChange={handleChange} style={fieldStyle}>
                  <option value="">Select...</option>
                  <option value="buy">Buy</option>
                  <option value="rent">Rent</option>
                  <option value="invest">Investment</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={labelStyle}>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ ...fieldStyle, resize: 'vertical' as const }} />
            </div>
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ padding: '12px 32px', backgroundColor: '#C9963F', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : 'Save Client'}
          </button>
        </form>
      </div>
    </div>
  )
}
