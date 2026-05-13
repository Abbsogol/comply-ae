'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const DARK = '#080808'
const CARD = '#0D0D0D'
const BORDER = '#1E1E1E'

type Property = {
  id: string
  created_at: string
  unit_number: string | null
  building_name: string | null
  area: string | null
  property_type: string | null
  bedrooms: string | null
  ejari_number: string | null
  ejari_expiry: string | null
  title_deed_number: string | null
  monthly_rent: number | null
  status: string | null
  notes: string | null
  tenant_id: string | null
}

const EMPTY_FORM = {
  unit_number: '',
  building_name: '',
  area: '',
  property_type: 'Apartment',
  bedrooms: '1BR',
  ejari_number: '',
  ejari_expiry: '',
  title_deed_number: '',
  monthly_rent: '',
  status: 'Vacant',
  notes: '',
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function EjariBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span style={{ color: '#444', fontSize: '12px' }}>—</span>
  const days = daysUntil(expiry)
  if (days === null) return null
  const date = new Date(expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  if (days < 0) return (
    <span style={{ fontSize: '11px', fontWeight: '700', color: '#C0392B', background: '#C0392B18', border: '1px solid #C0392B44', padding: '2px 8px', borderRadius: '4px' }}>
      EXPIRED
    </span>
  )
  if (days <= 30) return (
    <span style={{ fontSize: '11px', fontWeight: '700', color: '#E67E22', background: '#E67E2218', border: '1px solid #E67E2244', padding: '2px 8px', borderRadius: '4px' }}>
      {days}d left
    </span>
  )
  if (days <= 90) return (
    <span style={{ fontSize: '11px', fontWeight: '600', color: GOLD, background: `${GOLD}18`, border: `1px solid ${GOLD}44`, padding: '2px 8px', borderRadius: '4px' }}>
      {date}
    </span>
  )
  return <span style={{ fontSize: '12px', color: '#555' }}>{date}</span>
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status || 'Vacant'
  const map: Record<string, { color: string; bg: string; border: string }> = {
    'Occupied':         { color: '#4ade80', bg: '#0D1F0D', border: '#2a4a2a' },
    'Vacant':           { color: '#888',    bg: '#111',    border: '#222'    },
    'Under Maintenance':{ color: '#E67E22', bg: '#1F150A', border: '#5a3a10' },
  }
  const style = map[s] || map['Vacant']
  return (
    <span style={{
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em',
      color: style.color, background: style.bg, border: `1px solid ${style.border}`,
      padding: '3px 8px', borderRadius: '4px',
    }}>
      {s.toUpperCase()}
    </span>
  )
}

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setProperties(data)
    setLoading(false)
  }

  useEffect(() => { fetchProperties() }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      unit_number: form.unit_number || null,
      building_name: form.building_name || null,
      area: form.area || null,
      property_type: form.property_type || null,
      bedrooms: form.bedrooms || null,
      ejari_number: form.ejari_number || null,
      ejari_expiry: form.ejari_expiry || null,
      title_deed_number: form.title_deed_number || null,
      monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : null,
      status: form.status || 'Vacant',
      notes: form.notes || null,
    }

    const { error } = await supabase.from('properties').insert(payload)
    if (!error) {
      setForm(EMPTY_FORM)
      setShowForm(false)
      await fetchProperties()
    }
    setSaving(false)
  }

  const filtered = properties.filter(p => {
    const q = search.toLowerCase()
    return (
      (p.unit_number || '').toLowerCase().includes(q) ||
      (p.building_name || '').toLowerCase().includes(q) ||
      (p.area || '').toLowerCase().includes(q)
    )
  })

  // Stats
  const total = properties.length
  const occupied = properties.filter(p => p.status === 'Occupied').length
  const vacant = properties.filter(p => p.status === 'Vacant').length
  const expiringSoon = properties.filter(p => {
    const d = daysUntil(p.ejari_expiry)
    return d !== null && d >= 0 && d <= 90
  }).length

  const inp = (field: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.08em', marginBottom: '6px' }}>
        {label}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#111', border: `1px solid ${BORDER}`,
          borderRadius: '6px', padding: '9px 12px', color: '#F5F5F5',
          fontSize: '13.5px', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )

  const sel = (field: keyof typeof form, label: string, options: string[]) => (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.08em', marginBottom: '6px' }}>
        {label}
      </label>
      <select
        value={form[field]}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        style={{
          width: '100%', background: '#111', border: `1px solid ${BORDER}`,
          borderRadius: '6px', padding: '9px 12px', color: '#F5F5F5',
          fontSize: '13.5px', outline: 'none', boxSizing: 'border-box',
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{ padding: '40px 48px', minHeight: '100vh', backgroundColor: DARK }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '36px' }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '28px', fontWeight: '700', color: '#F5F5F5',
            margin: '0 0 6px 0', letterSpacing: '-0.02em',
          }}>
            Properties
          </h2>
          <p style={{ color: '#555', fontSize: '13.5px', margin: 0 }}>
            Manage your portfolio — units, Ejari, tenants, and rent.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: GOLD, color: '#000', border: 'none',
            borderRadius: '8px', padding: '11px 22px',
            fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          + Add Property
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: BORDER, borderRadius: '10px', overflow: 'hidden', marginBottom: '32px' }}>
        {[
          { label: 'Total Properties', value: total,        color: '#F5F5F5' },
          { label: 'Occupied',         value: occupied,     color: '#4ade80' },
          { label: 'Vacant',           value: vacant,       color: '#888'    },
          { label: 'Ejari Expiring',   value: expiringSoon, color: GOLD      },
        ].map((s, i) => (
          <div key={i} style={{ background: CARD, padding: '24px 28px' }}>
            <div style={{ fontSize: '30px', fontWeight: '700', color: s.color, fontFamily: 'var(--font-playfair), Georgia, serif', letterSpacing: '-0.02em' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px', fontWeight: '500' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by unit, building, or area..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: '8px',
            padding: '10px 16px', color: '#F5F5F5', fontSize: '13.5px',
            outline: 'none', width: '320px', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Properties Table */}
      {loading ? (
        <div style={{ color: '#444', padding: '48px 0', textAlign: 'center', fontSize: '14px' }}>Loading properties...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px',
          padding: '72px 48px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏠</div>
          <h3 style={{ color: '#F5F5F5', fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' }}>
            {search ? 'No properties match your search' : 'No properties yet'}
          </h3>
          <p style={{ color: '#555', fontSize: '14px', margin: '0 0 24px 0' }}>
            {search ? 'Try a different search term.' : 'Add your first property to start tracking Ejari, rent, and maintenance.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowForm(true)}
              style={{ background: GOLD, color: '#000', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              + Add your first property
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr 1.2fr 1.2fr',
            padding: '12px 24px', borderBottom: `1px solid ${BORDER}`,
            fontSize: '10px', fontWeight: '700', color: '#444', letterSpacing: '0.1em',
          }}>
            <span>PROPERTY</span>
            <span>AREA</span>
            <span>STATUS</span>
            <span>RENT (AED/mo)</span>
            <span>EJARI EXPIRY</span>
            <span>TYPE</span>
          </div>

          {filtered.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr 1.2fr 1.2fr',
                padding: '18px 24px',
                borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onClick={() => router.push(`/dashboard/properties/${p.id}`)}
              onMouseEnter={e => (e.currentTarget.style.background = '#111')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0F0F0', marginBottom: '2px' }}>
                  {p.unit_number || '—'}{p.unit_number && p.building_name ? ', ' : ''}{p.building_name || ''}
                </div>
                {p.title_deed_number && (
                  <div style={{ fontSize: '11px', color: '#444' }}>Deed: {p.title_deed_number}</div>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#888', alignSelf: 'center' }}>{p.area || '—'}</div>
              <div style={{ alignSelf: 'center' }}><StatusBadge status={p.status} /></div>
              <div style={{ fontSize: '13px', color: p.monthly_rent ? '#F0F0F0' : '#444', alignSelf: 'center', fontWeight: p.monthly_rent ? '600' : '400' }}>
                {p.monthly_rent ? p.monthly_rent.toLocaleString() : '—'}
              </div>
              <div style={{ alignSelf: 'center' }}><EjariBadge expiry={p.ejari_expiry} /></div>
              <div style={{ fontSize: '12px', color: '#555', alignSelf: 'center' }}>
                {[p.property_type, p.bedrooms].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{
            background: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '14px',
            padding: '36px 40px', width: '100%', maxWidth: '680px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <h3 style={{
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontSize: '22px', fontWeight: '700', color: '#F5F5F5', margin: 0,
              }}>
                Add Property
              </h3>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {inp('unit_number', 'UNIT NUMBER', 'text', 'e.g. Apt 1204')}
                {inp('building_name', 'BUILDING NAME', 'text', 'e.g. Marina Gate 1')}
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {inp('area', 'AREA / DISTRICT', 'text', 'e.g. Dubai Marina')}
                {sel('status', 'STATUS', ['Occupied', 'Vacant', 'Under Maintenance'])}
              </div>

              {/* Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {sel('property_type', 'PROPERTY TYPE', ['Apartment', 'Villa', 'Townhouse', 'Studio', 'Office', 'Retail'])}
                {sel('bedrooms', 'BEDROOMS', ['Studio', '1BR', '2BR', '3BR', '4BR', '5BR+'])}
              </div>

              {/* Row 4 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {inp('monthly_rent', 'MONTHLY RENT (AED)', 'number', 'e.g. 8500')}
                {inp('title_deed_number', 'TITLE DEED NUMBER', 'text', 'optional')}
              </div>

              {/* Ejari section */}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '18px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 14px 0' }}>EJARI</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {inp('ejari_number', 'EJARI NUMBER', 'text', 'optional')}
                  {inp('ejari_expiry', 'EJARI EXPIRY DATE', 'date')}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '0.08em', marginBottom: '6px' }}>NOTES</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={3}
                  style={{
                    width: '100%', background: '#111', border: `1px solid ${BORDER}`,
                    borderRadius: '6px', padding: '9px 12px', color: '#F5F5F5',
                    fontSize: '13.5px', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '8px', padding: '10px 22px', fontSize: '13.5px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ background: GOLD, color: '#000', border: 'none', borderRadius: '8px', padding: '10px 28px', fontSize: '13.5px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save Property'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
