'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const DARK = '#080808'
const CARD = '#0D0D0D'
const BORDER = '#1E1E1E'

type Property = {
  id: string
  unit_number: string | null
  building_name: string | null
  area: string | null
  property_type: string | null
  bedrooms: string | null
  ejari_number: string | null
  ejari_expiry: string | null
  title_deed_number: string | null
  tenant_id: string | null
  monthly_rent: number | null
  status: string | null
  notes: string | null
  created_at: string
}

type Tenant = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  nationality: string | null
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status || 'Vacant'
  const map: Record<string, { color: string; bg: string; border: string }> = {
    'Occupied':          { color: '#4ade80', bg: '#0D1F0D', border: '#2a4a2a' },
    'Vacant':            { color: '#888',    bg: '#111',    border: '#222'    },
    'Under Maintenance': { color: '#E67E22', bg: '#1F150A', border: '#5a3a10' },
  }
  const st = map[s] || map['Vacant']
  return (
    <span style={{
      fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em',
      color: st.color, background: st.bg, border: `1px solid ${st.border}`,
      padding: '4px 10px', borderRadius: '5px',
    }}>
      {s.toUpperCase()}
    </span>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: '12px', color: '#555', fontWeight: '500', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '13.5px', color: highlight ? GOLD : '#F0F0F0', fontWeight: highlight ? '600' : '400' }}>
        {value || '—'}
      </span>
    </div>
  )
}

export default function PropertyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [linkingTenant, setLinkingTenant] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const fetchProperty = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) { router.push('/dashboard/properties'); return }
    setProperty(data)
    setNotes(data.notes || '')
    setNewStatus(data.status || 'Vacant')

    if (data.tenant_id) {
      const { data: t } = await supabase.from('clients').select('id, full_name, email, phone, nationality').eq('id', data.tenant_id).single()
      if (t) setTenant(t)
    }
    setLoading(false)
  }

  const fetchAllTenants = async () => {
    const { data } = await supabase.from('clients').select('id, full_name, email, phone, nationality').order('full_name')
    if (data) setAllTenants(data)
  }

  useEffect(() => {
    fetchProperty()
    fetchAllTenants()
  }, [id])

  const saveNotes = async () => {
    setSavingNotes(true)
    await supabase.from('properties').update({ notes }).eq('id', id)
    setProperty(p => p ? { ...p, notes } : p)
    setEditingNotes(false)
    setSavingNotes(false)
  }

  const saveStatus = async () => {
    await supabase.from('properties').update({ status: newStatus }).eq('id', id)
    setProperty(p => p ? { ...p, status: newStatus } : p)
    setEditingStatus(false)
  }

  const linkTenant = async () => {
    if (!selectedTenantId) return
    await supabase.from('properties').update({ tenant_id: selectedTenantId }).eq('id', id)
    const found = allTenants.find(t => t.id === selectedTenantId)
    if (found) setTenant(found)
    setProperty(p => p ? { ...p, tenant_id: selectedTenantId } : p)
    setLinkingTenant(false)
    setSelectedTenantId('')
  }

  const unlinkTenant = async () => {
    await supabase.from('properties').update({ tenant_id: null }).eq('id', id)
    setTenant(null)
    setProperty(p => p ? { ...p, tenant_id: null } : p)
  }

  if (loading) return (
    <div style={{ padding: '48px', color: '#444', fontSize: '14px' }}>Loading property...</div>
  )
  if (!property) return null

  const ejariDays = daysUntil(property.ejari_expiry)
  const ejariExpired = ejariDays !== null && ejariDays < 0
  const ejariUrgent = ejariDays !== null && ejariDays >= 0 && ejariDays <= 30
  const ejariWarning = ejariDays !== null && ejariDays > 30 && ejariDays <= 90

  const ejariColor = ejariExpired ? '#C0392B' : ejariUrgent ? '#E67E22' : ejariWarning ? GOLD : '#4ade80'

  const ejariLabel = ejariDays === null ? '—'
    : ejariExpired ? `EXPIRED ${Math.abs(ejariDays)}d ago`
    : ejariDays === 0 ? 'Expires TODAY'
    : `${ejariDays} days left`

  const propertyTitle = [property.unit_number, property.building_name].filter(Boolean).join(', ') || 'Unnamed Property'

  return (
    <div style={{ padding: '40px 48px', minHeight: '100vh', backgroundColor: DARK }}>

      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/properties')}
        style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: '0', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        ← Back to Properties
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
            <h2 style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: '28px', fontWeight: '700', color: '#F5F5F5',
              margin: 0, letterSpacing: '-0.02em',
            }}>
              {propertyTitle}
            </h2>
            {editingStatus ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '4px 8px', color: '#F5F5F5', fontSize: '12px' }}
                >
                  {['Occupied', 'Vacant', 'Under Maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={saveStatus} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingStatus(false)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ cursor: 'pointer' }} onClick={() => setEditingStatus(true)}>
                <StatusBadge status={property.status} />
              </div>
            )}
          </div>
          <p style={{ color: '#555', fontSize: '13.5px', margin: 0 }}>
            {[property.area, property.property_type, property.bedrooms].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Ejari Alert Banner */}
      {property.ejari_expiry && (ejariExpired || ejariUrgent || ejariWarning) && (
        <div style={{
          background: `${ejariColor}10`,
          border: `1px solid ${ejariColor}33`,
          borderRadius: '10px', padding: '16px 20px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '18px' }}>{ejariExpired ? '🚨' : ejariUrgent ? '⚠️' : '📅'}</span>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '700', color: ejariColor, marginBottom: '2px' }}>
              {ejariExpired ? 'Ejari has expired' : ejariUrgent ? 'Ejari expiring very soon' : 'Ejari expiring in under 90 days'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#888' }}>
              {ejariExpired
                ? `Expired ${Math.abs(ejariDays!)} days ago. Renew immediately to avoid fines up to AED 50,000.`
                : `${ejariDays} days remaining. Tenant must receive 90-day notice before renewal.`}
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Property Details */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>PROPERTY DETAILS</h3>
          <div>
            <InfoRow label="Monthly Rent" value={property.monthly_rent ? `AED ${property.monthly_rent.toLocaleString()}` : null} highlight={!!property.monthly_rent} />
            <InfoRow label="Property Type" value={property.property_type} />
            <InfoRow label="Bedrooms" value={property.bedrooms} />
            <InfoRow label="Area" value={property.area} />
            <InfoRow label="Title Deed No." value={property.title_deed_number} />
            <InfoRow label="Added" value={new Date(property.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </div>
        </div>

        {/* Ejari Details */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>EJARI & COMPLIANCE</h3>
          <div>
            <InfoRow label="Ejari Number" value={property.ejari_number} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '12px', color: '#555', fontWeight: '500' }}>Ejari Expiry</span>
              <span style={{ fontSize: '13.5px', color: ejariColor, fontWeight: '600' }}>
                {property.ejari_expiry
                  ? new Date(property.ejari_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '12px', color: '#555', fontWeight: '500' }}>Status</span>
              <span style={{ fontSize: '13px', color: ejariColor, fontWeight: '700' }}>{ejariLabel}</span>
            </div>
            <InfoRow label="90-Day Notice Due" value={
              property.ejari_expiry
                ? new Date(new Date(property.ejari_expiry).getTime() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null
            } />
          </div>
        </div>
      </div>

      {/* Tenant Section */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: 0 }}>LINKED TENANT</h3>
          {tenant && (
            <button onClick={unlinkTenant} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
              Unlink
            </button>
          )}
        </div>

        {tenant ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `${GOLD}18`, border: `1px solid ${GOLD}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: GOLD, fontWeight: '700' }}>
                {tenant.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0F0F0', marginBottom: '2px' }}>{tenant.full_name}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{[tenant.nationality, tenant.email].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/dashboard/clients/${tenant.id}`)}
              style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}
            >
              View Profile →
            </button>
          </div>
        ) : (
          <div>
            {linkingTenant ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                  style={{ flex: 1, background: '#111', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '9px 12px', color: '#F5F5F5', fontSize: '13.5px', outline: 'none' }}
                >
                  <option value="">Select a tenant...</option>
                  {allTenants.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
                <button onClick={linkTenant} disabled={!selectedTenantId} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Link</button>
                <button onClick={() => setLinkingTenant(false)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13.5px', color: '#444' }}>No tenant linked to this property.</span>
                <button
                  onClick={() => setLinkingTenant(true)}
                  style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}
                >
                  + Link Tenant
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: 0 }}>NOTES</h3>
          {!editingNotes && (
            <button onClick={() => setEditingNotes(true)} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about this property..."
              style={{ width: '100%', background: '#111', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '10px 12px', color: '#F5F5F5', fontSize: '13.5px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button onClick={saveNotes} disabled={savingNotes} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditingNotes(false); setNotes(property.notes || '') }} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '13.5px', color: notes ? '#888' : '#333', margin: 0, lineHeight: '1.6' }}>
            {notes || 'No notes added yet.'}
          </p>
        )}
      </div>

    </div>
  )
}
