'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardTour from '@/components/DashboardTour'

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
  ejari_expiry: string | null
  monthly_rent: number | null
  status: string | null
  tenant_id: string | null
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
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em',
      color: st.color, background: st.bg, border: `1px solid ${st.border}`,
      padding: '3px 8px', borderRadius: '4px',
    }}>
      {s.toUpperCase()}
    </span>
  )
}

function EjariChip({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span style={{ color: '#333', fontSize: '12px' }}>No Ejari set</span>
  const days = daysUntil(expiry)
  if (days === null) return null
  if (days < 0) return <span style={{ fontSize: '11px', fontWeight: '700', color: '#C0392B', background: '#C0392B18', border: '1px solid #C0392B44', padding: '2px 8px', borderRadius: '4px' }}>EXPIRED</span>
  if (days <= 30) return <span style={{ fontSize: '11px', fontWeight: '700', color: '#E67E22', background: '#E67E2218', border: '1px solid #E67E2244', padding: '2px 8px', borderRadius: '4px' }}>{days}d left</span>
  if (days <= 90) return <span style={{ fontSize: '11px', fontWeight: '600', color: GOLD, background: `${GOLD}18`, border: `1px solid ${GOLD}44`, padding: '2px 8px', borderRadius: '4px' }}>{days}d left</span>
  return <span style={{ fontSize: '12px', color: '#555' }}>{new Date(expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserName(user.email?.split('@')[0] || '')

      const { data } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
      setProperties(data || [])
      setLoading(false)
    }
    init()
  }, [router])

  // Stats
  const total      = properties.length
  const occupied   = properties.filter(p => p.status?.toLowerCase() === 'occupied').length
  const vacant     = properties.filter(p => p.status?.toLowerCase() === 'vacant').length
  const maintenance = properties.filter(p => p.status?.toLowerCase() === 'under maintenance').length

  // Ejari alerts — expired or expiring within 90 days
  const ejariAlerts = properties.filter(p => {
    const d = daysUntil(p.ejari_expiry)
    return d !== null && d <= 90
  }).sort((a, b) => {
    const da = daysUntil(a.ejari_expiry) ?? 999
    const db = daysUntil(b.ejari_expiry) ?? 999
    return da - db
  })

  // Vacant properties
  const vacantProps = properties.filter(p => p.status?.toLowerCase() === 'vacant')

  // Monthly rent total (occupied only)
  const monthlyRentTotal = properties
    .filter(p => p.status?.toLowerCase() === 'occupied' && p.monthly_rent)
    .reduce((sum, p) => sum + (p.monthly_rent || 0), 0)

  const propName = (p: Property) =>
    [p.unit_number, p.building_name].filter(Boolean).join(', ') || 'Unnamed Property'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: DARK, padding: '40px 48px' }}>
      <DashboardTour />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '28px', fontWeight: '700', color: '#F5F5F5',
            margin: '0 0 6px 0', letterSpacing: '-0.02em',
          }}>
            {getGreeting()}{userName ? `, ${userName}` : ''}.
          </h2>
          <p style={{ color: '#555', fontSize: '13.5px', margin: 0 }}>
            Here's what needs your attention today.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/properties')}
          style={{
            background: GOLD, color: '#000', border: 'none',
            borderRadius: '8px', padding: '11px 22px',
            fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
          }}
        >
          + Add Property
        </button>
      </div>

      {/* Stat cards */}
      <div data-tour="stat-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: BORDER, borderRadius: '12px', overflow: 'hidden', marginBottom: '28px' }}>
        {[
          { label: 'Total Properties',  value: total,       color: '#F5F5F5', sub: 'in your portfolio'    },
          { label: 'Occupied',          value: occupied,    color: '#4ade80', sub: 'generating rent'      },
          { label: 'Vacant',            value: vacant,      color: vacant > 0 ? '#E67E22' : '#555', sub: vacant > 0 ? 'losing rent daily' : 'all units occupied' },
          { label: 'Ejari Alerts',      value: ejariAlerts.length, color: ejariAlerts.length > 0 ? '#C0392B' : '#555', sub: ejariAlerts.length > 0 ? 'expired or expiring soon' : 'all clear' },
        ].map((s, i) => (
          <div key={i} style={{ background: CARD, padding: '28px' }}>
            <div style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: '36px', fontWeight: '700', color: s.color,
              letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '8px',
            }}>
              {loading ? '—' : s.value}
            </div>
            <div style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: '600', marginBottom: '3px' }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: '#444' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly rent banner — only show if occupied units exist */}
      {monthlyRentTotal > 0 && (
        <div style={{
          background: `${GOLD}08`, border: `1px solid ${GOLD}22`,
          borderRadius: '10px', padding: '16px 24px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>💰</span>
            <span style={{ fontSize: '13.5px', color: '#888' }}>Total monthly rent income from occupied units</span>
          </div>
          <span style={{ fontSize: '20px', fontWeight: '700', color: GOLD, fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            AED {monthlyRentTotal.toLocaleString()}
          </span>
        </div>
      )}

      {/* Alert panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>

        {/* Ejari Alerts */}
        <div data-tour="ejari-alerts" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <span style={{ fontSize: '15px' }}>🗓️</span>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Ejari Alerts</h3>
            {ejariAlerts.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#2d0f0f', color: '#f87171', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px' }}>
                {ejariAlerts.length}
              </span>
            )}
          </div>
          {ejariAlerts.length === 0 ? (
            <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>All Ejari registrations are up to date.</p>
          ) : (
            ejariAlerts.slice(0, 5).map(p => {
              const days = daysUntil(p.ejari_expiry)
              const expired = days !== null && days < 0
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', borderRadius: '8px', background: '#080808',
                    cursor: 'pointer', marginBottom: '8px', border: `1px solid ${BORDER}`,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#F0F0F0', marginBottom: '2px' }}>{propName(p)}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{p.area || '—'}</div>
                  </div>
                  <EjariChip expiry={p.ejari_expiry} />
                </div>
              )
            })
          )}
        </div>

        {/* Vacant Units */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <span style={{ fontSize: '15px' }}>🏚️</span>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Vacant Units</h3>
            {vacantProps.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#2d1f00', color: '#fbbf24', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px' }}>
                {vacantProps.length}
              </span>
            )}
          </div>
          {vacantProps.length === 0 ? (
            <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>All units are occupied. Great work.</p>
          ) : (
            vacantProps.slice(0, 5).map(p => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: '8px', background: '#080808',
                  cursor: 'pointer', marginBottom: '8px', border: `1px solid ${BORDER}`,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#F0F0F0', marginBottom: '2px' }}>{propName(p)}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{[p.area, p.property_type, p.bedrooms].filter(Boolean).join(' · ')}</div>
                </div>
                <span style={{ fontSize: '12px', color: '#E67E22', fontWeight: '600' }}>
                  {p.monthly_rent ? `AED ${p.monthly_rent.toLocaleString()}/mo` : 'No rent set'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Properties table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>All Properties</h3>
          <button
            onClick={() => router.push('/dashboard/properties')}
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#444', padding: '24px', fontSize: '13px' }}>Loading...</p>
        ) : properties.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏠</div>
            <p style={{ color: '#555', fontSize: '13.5px', margin: '0 0 16px 0' }}>No properties yet. Add your first property to get started.</p>
            <button
              onClick={() => router.push('/dashboard/properties')}
              style={{ background: GOLD, color: '#000', border: 'none', borderRadius: '7px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              + Add Property
            </button>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr 1.2fr',
              padding: '11px 24px', borderBottom: `1px solid ${BORDER}`,
              fontSize: '10px', fontWeight: '700', color: '#444', letterSpacing: '0.1em',
            }}>
              <span>PROPERTY</span><span>AREA</span><span>STATUS</span><span>RENT (AED/mo)</span><span>EJARI EXPIRY</span>
            </div>
            {properties.slice(0, 8).map((p, i) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr 1.2fr',
                  padding: '16px 24px', cursor: 'pointer',
                  borderBottom: i < Math.min(properties.length, 8) - 1 ? `1px solid ${BORDER}` : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#111')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#F0F0F0', marginBottom: '2px' }}>{propName(p)}</div>
                  <div style={{ fontSize: '11px', color: '#444' }}>{[p.property_type, p.bedrooms].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={{ fontSize: '13px', color: '#666', alignSelf: 'center' }}>{p.area || '—'}</div>
                <div style={{ alignSelf: 'center' }}><StatusBadge status={p.status} /></div>
                <div style={{ fontSize: '13px', color: p.monthly_rent ? '#F0F0F0' : '#333', fontWeight: p.monthly_rent ? '600' : '400', alignSelf: 'center' }}>
                  {p.monthly_rent ? p.monthly_rent.toLocaleString() : '—'}
                </div>
                <div style={{ alignSelf: 'center' }}><EjariChip expiry={p.ejari_expiry} /></div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
