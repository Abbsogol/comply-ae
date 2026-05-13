'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Tenant = {
  id: string
  created_at: string
  full_name: string
  email: string
  phone: string
  nationality: string
  passport_expiry: string | null
  emirates_id_expiry: string | null
}

type LinkedProperty = {
  tenant_id: string
  unit_number: string
  building_name: string
  area: string
}

function ExpiryBadge({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span style={{ color: '#444', fontSize: '13px' }}>—</span>

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(dateStr)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let color = '#555'
  let bg = 'transparent'
  let text = expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  if (diffDays < 0) {
    color = '#f87171'; bg = '#2d0f0f'; text = 'EXPIRED'
  } else if (diffDays <= 30) {
    color = '#fb923c'; bg = '#2d1500'; text = `${diffDays}d left`
  } else if (diffDays <= 90) {
    color = GOLD; bg = '#1a1100'; text = `${diffDays}d left`
  }

  return (
    <span style={{
      padding: diffDays < 90 ? '2px 8px' : '0',
      borderRadius: '4px', fontSize: '12px',
      fontWeight: diffDays < 90 ? '600' : '400',
      backgroundColor: bg, color,
    }}>
      {text}
    </span>
  )
}

export default function TenantsPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [linkedProps, setLinkedProps] = useState<LinkedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', nationality: '',
    passport_expiry: '', emirates_id_expiry: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: tenantData } = await supabase
        .from('clients')
        .select('id, created_at, full_name, email, phone, nationality, passport_expiry, emirates_id_expiry')
        .order('created_at', { ascending: false })
      setTenants(tenantData || [])

      const { data: propData } = await supabase
        .from('properties')
        .select('tenant_id, unit_number, building_name, area')
        .not('tenant_id', 'is', null)
      setLinkedProps(propData || [])

      setLoading(false)
    }
    init()
  }, [router])

  const getLinkedProperty = (tenantId: string) => {
    const prop = linkedProps.find(p => p.tenant_id === tenantId)
    if (!prop) return null
    return `${prop.unit_number}${prop.building_name ? ', ' + prop.building_name : ''}${prop.area ? ' · ' + prop.area : ''}`
  }

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase()
    return (
      t.full_name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.nationality?.toLowerCase().includes(q) ||
      t.phone?.toLowerCase().includes(q)
    )
  })

  const handleAdd = async () => {
    if (!form.full_name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('clients').insert({
      user_id: user.id,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      nationality: form.nationality.trim() || null,
      passport_expiry: form.passport_expiry || null,
      emirates_id_expiry: form.emirates_id_expiry || null,
      notes: form.notes.trim() || null,
      status: 'active',
      risk_level: 'low',
    }).select().single()
    setSaving(false)
    if (!error && data) {
      setTenants(prev => [data, ...prev])
      setShowModal(false)
      setForm({ full_name: '', email: '', phone: '', nationality: '', passport_expiry: '', emirates_id_expiry: '', notes: '' })
    }
  }

  return (
    <div style={{ padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{
            color: '#F5F5F5', fontSize: '26px', fontWeight: '700',
            margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif',
          }}>
            Tenants
          </h2>
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} in your portfolio
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 20px', backgroundColor: GOLD,
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}
        >
          + Add Tenant
        </button>
      </div>

      {/* Table card */}
      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <input
            type="text"
            placeholder="Search by name, email, nationality, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', maxWidth: '400px',
              padding: '8px 14px', backgroundColor: '#080808',
              border: `1px solid ${BORDER}`, borderRadius: '6px',
              color: '#F5F5F5', fontSize: '13px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {loading ? (
          <p style={{ color: '#444', padding: '24px', fontSize: '14px' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👤</div>
            <p style={{ color: '#444', fontSize: '14px', margin: '0 0 16px 0' }}>
              {tenants.length === 0 ? 'No tenants yet. Add your first tenant.' : 'No tenants match your search.'}
            </p>
            {tenants.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: '10px 20px', backgroundColor: GOLD,
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                + Add your first tenant
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Tenant', 'Nationality', 'Phone', 'Linked Property', 'Passport Expiry', 'Emirates ID Expiry', 'Added'].map(h => (
                  <th key={h} style={{
                    padding: '11px 20px', textAlign: 'left',
                    color: '#444', fontSize: '11px', fontWeight: '600',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tenant => {
                const linkedProp = getLinkedProperty(tenant.id)
                return (
                  <tr
                    key={tenant.id}
                    onClick={() => router.push('/dashboard/clients/' + tenant.id)}
                    style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: '500' }}>{tenant.full_name}</div>
                      {tenant.email && <div style={{ color: '#444', fontSize: '12px', marginTop: '2px' }}>{tenant.email}</div>}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#888', fontSize: '13px' }}>{tenant.nationality || '—'}</td>
                    <td style={{ padding: '14px 20px', color: '#888', fontSize: '13px' }}>{tenant.phone || '—'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      {linkedProp
                        ? <span style={{ color: GOLD, fontSize: '13px' }}>{linkedProp}</span>
                        : <span style={{ color: '#333', fontSize: '13px' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <ExpiryBadge dateStr={tenant.passport_expiry} />
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <ExpiryBadge dateStr={tenant.emirates_id_expiry} />
                    </td>
                    <td style={{ padding: '14px 20px', color: '#444', fontSize: '13px' }}>
                      {new Date(tenant.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Tenant Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`,
            borderRadius: '14px', width: '100%', maxWidth: '520px',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ padding: '24px 28px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{
                color: '#F5F5F5', margin: 0, fontSize: '18px', fontWeight: '700',
                fontFamily: 'var(--font-playfair), Georgia, serif',
              }}>Add Tenant</h3>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Full Name *', key: 'full_name', placeholder: 'e.g. Ahmed Al Rashidi', type: 'text' },
                { label: 'Email', key: 'email', placeholder: 'tenant@email.com', type: 'email' },
                { label: 'Phone', key: 'phone', placeholder: '+971 50 000 0000', type: 'text' },
                { label: 'Nationality', key: 'nationality', placeholder: 'e.g. Emirati, British, Indian', type: 'text' },
                { label: 'Passport Expiry', key: 'passport_expiry', placeholder: '', type: 'date' },
                { label: 'Emirates ID Expiry', key: 'emirates_id_expiry', placeholder: '', type: 'date' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{
                    display: 'block', color: '#888', fontSize: '11px',
                    fontWeight: '600', letterSpacing: '0.05em',
                    marginBottom: '6px', textTransform: 'uppercase',
                  }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px', backgroundColor: '#080808',
                      border: `1px solid ${BORDER}`, borderRadius: '7px',
                      color: '#F5F5F5', fontSize: '14px', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{
                  display: 'block', color: '#888', fontSize: '11px',
                  fontWeight: '600', letterSpacing: '0.05em',
                  marginBottom: '6px', textTransform: 'uppercase',
                }}>Notes</label>
                <textarea
                  rows={3}
                  placeholder="Any notes about this tenant..."
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', backgroundColor: '#080808',
                    border: `1px solid ${BORDER}`, borderRadius: '7px',
                    color: '#F5F5F5', fontSize: '14px', outline: 'none',
                    resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div style={{
              padding: '16px 28px', borderTop: `1px solid ${BORDER}`,
              display: 'flex', gap: '10px', justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => {
                  setShowModal(false)
                  setForm({ full_name: '', email: '', phone: '', nationality: '', passport_expiry: '', emirates_id_expiry: '', notes: '' })
                }}
                style={{
                  padding: '9px 18px', backgroundColor: 'transparent',
                  border: `1px solid ${BORDER}`, borderRadius: '7px',
                  color: '#888', fontSize: '14px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.full_name.trim()}
                style={{
                  padding: '9px 18px',
                  backgroundColor: form.full_name.trim() ? GOLD : '#333',
                  border: 'none', borderRadius: '7px', color: '#fff',
                  fontSize: '14px', fontWeight: '600',
                  cursor: form.full_name.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Saving...' : 'Add Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
