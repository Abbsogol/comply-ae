'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

const AREAS = ['Dubai Marina', 'Downtown Dubai', 'Business Bay', 'Jumeirah Village Circle', 'Palm Jumeirah', 'Arabian Ranches', 'Dubai Hills Estate', 'Jumeirah Lake Towers', 'Al Barsha', 'Deira', 'Bur Dubai', 'Mirdif', 'Sports City', 'Motor City', 'Other']
const PROP_TYPES = ['Apartment', 'Villa', 'Townhouse', 'Studio', 'Penthouse', 'Office', 'Retail']

const inputStyle = {
  width: '100%', padding: '11px 13px',
  backgroundColor: '#0A0A0A',
  border: `1px solid ${BORDER}`,
  borderRadius: '8px', color: '#F5F5F5',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
}

const labelStyle = {
  color: '#888', fontSize: '12px', fontWeight: '600' as const,
  letterSpacing: '0.04em', textTransform: 'uppercase' as const,
  display: 'block', marginBottom: '7px',
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={labelStyle}>{children}</p>
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1=welcome, 2=property, 3=tenant, 4=done

  // Property form
  const [prop, setProp] = useState({
    unit_number: '', building_name: '', area: '', property_type: 'Apartment',
    bedrooms: '', monthly_rent: '', status: 'vacant',
  })

  // Tenant form
  const [tenant, setTenant] = useState({
    full_name: '', email: '', phone: '', nationality: '',
  })

  const [saving, setSaving] = useState(false)
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null)
  const [tenantAdded, setTenantAdded] = useState(false)

  const handleAddProperty = async () => {
    if (!prop.unit_number.trim()) { alert('Unit number is required.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase.from('properties').insert({
      user_id:       user.id,
      unit_number:   prop.unit_number.trim(),
      building_name: prop.building_name.trim() || null,
      area:          prop.area || null,
      property_type: prop.property_type.toLowerCase(),
      bedrooms:      prop.bedrooms ? parseInt(prop.bedrooms) : null,
      monthly_rent:  prop.monthly_rent ? parseFloat(prop.monthly_rent) : null,
      status:        prop.status,
    }).select().single()

    setSaving(false)
    if (error) { alert('Failed to save property. Please try again.'); return }
    setCreatedPropertyId(data.id)
    setStep(3)
  }

  const handleAddTenant = async () => {
    if (!tenant.full_name.trim()) { alert('Tenant name is required.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: clientData, error } = await supabase.from('clients').insert({
      user_id:     user.id,
      full_name:   tenant.full_name.trim(),
      email:       tenant.email.trim() || null,
      phone:       tenant.phone.trim() || null,
      nationality: tenant.nationality.trim() || null,
      status:      'active',
    }).select().single()

    if (!error && clientData && createdPropertyId) {
      await supabase.from('properties')
        .update({ tenant_id: clientData.id, status: 'occupied' })
        .eq('id', createdPropertyId)
    }

    setSaving(false)
    if (error) { alert('Failed to save tenant.'); return }
    setTenantAdded(true)
    setStep(4)
  }

  const handleSkipTenant = () => {
    setTenantAdded(false)
    setStep(4)
  }

  // ─── Step 1: Welcome ──────────────────────────────────────────────────────
  if (step === 1) return (
    <Screen>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: '800', letterSpacing: '0.06em', margin: '0 0 6px 0' }}>
          COMPLY<span style={{ color: GOLD }}>.AE</span>
        </h1>
        <p style={{ color: '#444', fontSize: '12px', margin: 0, letterSpacing: '0.04em' }}>Property Platform</p>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏙️</div>
        <h2 style={{ color: '#F5F5F5', fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0' }}>
          Welcome to COMPLY.AE
        </h2>
        <p style={{ color: '#888', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
          Let's get your account set up in under 2 minutes.<br />
          We'll add your first property and tenant together.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {['Add your first property', 'Link your first tenant', 'Start managing everything in one place'].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: `${GOLD}20`, border: `1px solid ${GOLD}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: GOLD, fontSize: '11px', fontWeight: '700' }}>{i + 1}</span>
            </div>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>{item}</p>
          </div>
        ))}
      </div>

      <button onClick={() => setStep(2)} style={primaryBtn}>
        Get Started →
      </button>
    </Screen>
  )

  // ─── Step 2: Add Property ─────────────────────────────────────────────────
  if (step === 2) return (
    <Screen>
      <StepHeader step={1} total={2} title="Your first property" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Unit Number *</Label>
          <input value={prop.unit_number} onChange={e => setProp(p => ({ ...p, unit_number: e.target.value }))}
            placeholder="e.g. 204, Villa 12" style={inputStyle} />
        </div>
        <div>
          <Label>Building Name</Label>
          <input value={prop.building_name} onChange={e => setProp(p => ({ ...p, building_name: e.target.value }))}
            placeholder="e.g. Marina Gate" style={inputStyle} />
        </div>
        <div>
          <Label>Area</Label>
          <select value={prop.area} onChange={e => setProp(p => ({ ...p, area: e.target.value }))} style={inputStyle}>
            <option value="">— Select area —</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <Label>Property Type</Label>
          <select value={prop.property_type} onChange={e => setProp(p => ({ ...p, property_type: e.target.value }))} style={inputStyle}>
            {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label>Bedrooms</Label>
          <select value={prop.bedrooms} onChange={e => setProp(p => ({ ...p, bedrooms: e.target.value }))} style={inputStyle}>
            <option value="">—</option>
            {['Studio', '1', '2', '3', '4', '5+'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <Label>Monthly Rent (AED)</Label>
          <input type="number" value={prop.monthly_rent} onChange={e => setProp(p => ({ ...p, monthly_rent: e.target.value }))}
            placeholder="e.g. 85000" style={inputStyle} />
        </div>
        <div>
          <Label>Status</Label>
          <select value={prop.status} onChange={e => setProp(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>
      </div>

      <button onClick={handleAddProperty} disabled={saving} style={primaryBtn}>
        {saving ? 'Saving…' : 'Next — Add Tenant →'}
      </button>
    </Screen>
  )

  // ─── Step 3: Add Tenant ───────────────────────────────────────────────────
  if (step === 3) return (
    <Screen>
      <StepHeader step={2} total={2} title="Your first tenant" />
      <p style={{ color: '#555', fontSize: '13px', margin: '0 0 24px 0' }}>
        Link a tenant to <strong style={{ color: '#888' }}>{prop.unit_number}{prop.building_name ? `, ${prop.building_name}` : ''}</strong>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Full Name *</Label>
          <input value={tenant.full_name} onChange={e => setTenant(t => ({ ...t, full_name: e.target.value }))}
            placeholder="e.g. Ahmed Al Mansouri" style={inputStyle} />
        </div>
        <div>
          <Label>Email</Label>
          <input type="email" value={tenant.email} onChange={e => setTenant(t => ({ ...t, email: e.target.value }))}
            placeholder="tenant@email.com" style={inputStyle} />
        </div>
        <div>
          <Label>Phone</Label>
          <input value={tenant.phone} onChange={e => setTenant(t => ({ ...t, phone: e.target.value }))}
            placeholder="+971 50 000 0000" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Nationality</Label>
          <input value={tenant.nationality} onChange={e => setTenant(t => ({ ...t, nationality: e.target.value }))}
            placeholder="e.g. UAE, Indian, British" style={inputStyle} />
        </div>
      </div>

      <button onClick={handleAddTenant} disabled={saving} style={primaryBtn}>
        {saving ? 'Saving…' : 'Add Tenant & Finish →'}
      </button>
      <button onClick={handleSkipTenant} style={ghostBtn}>
        Skip for now
      </button>
    </Screen>
  )

  // ─── Step 4: Done ─────────────────────────────────────────────────────────
  return (
    <Screen>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ color: '#F5F5F5', fontSize: '24px', fontWeight: '700', margin: '0 0 10px 0' }}>
          You're all set!
        </h2>
        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
          Here's what we set up for you:
        </p>
      </div>

      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: tenantAdded ? '12px' : 0 }}>
          <span style={{ color: '#4ade80', fontSize: '16px' }}>✓</span>
          <div>
            <p style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: '600', margin: 0 }}>
              {prop.unit_number}{prop.building_name ? `, ${prop.building_name}` : ''}
            </p>
            <p style={{ color: '#555', fontSize: '12px', margin: '2px 0 0 0' }}>Property added</p>
          </div>
        </div>
        {tenantAdded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: `1px solid ${BORDER}` }}>
            <span style={{ color: '#4ade80', fontSize: '16px' }}>✓</span>
            <div>
              <p style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: '600', margin: 0 }}>{tenant.full_name}</p>
              <p style={{ color: '#555', fontSize: '12px', margin: '2px 0 0 0' }}>Tenant linked to property</p>
            </div>
          </div>
        )}
      </div>

      <button onClick={() => router.push('/dashboard')} style={primaryBtn}>
        Go to Dashboard →
      </button>
    </Screen>
  )
}

// ─── Shared layout components ──────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`,
        borderRadius: '14px', padding: '40px', width: '100%', maxWidth: '520px',
      }}>
        {children}
      </div>
    </div>
  )
}

function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          Step {step} of {total}
        </p>
        <div style={{ display: 'flex', gap: '6px' }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: '24px', height: '3px', borderRadius: '2px', backgroundColor: i < step ? GOLD : '#1E1E1E' }} />
          ))}
        </div>
      </div>
      <h2 style={{ color: '#F5F5F5', fontSize: '22px', fontWeight: '700', margin: 0 }}>{title}</h2>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '12px',
  backgroundColor: GOLD, color: '#fff',
  border: 'none', borderRadius: '8px',
  fontSize: '15px', fontWeight: '600',
  cursor: 'pointer', marginBottom: '10px',
}

const ghostBtn: React.CSSProperties = {
  width: '100%', padding: '11px',
  backgroundColor: 'transparent', color: '#555',
  border: `1px solid ${BORDER}`, borderRadius: '8px',
  fontSize: '14px', cursor: 'pointer',
}
