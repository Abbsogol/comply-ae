'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

// ── Types ──────────────────────────────────────────────────────────
type Property = {
  id: string
  unit_number: string
  building_name: string | null
  area: string | null
  status: string
  monthly_rent: number | null
  ejari_expiry: string | null
  tenant_id: string | null
}

type Client = {
  id: string
  full_name: string
  passport_expiry: string | null
  emirates_id_expiry: string | null
}

type RentPayment = {
  id: string
  status: string
  expected_amount: number | null
  paid_amount: number | null
  period_label: string | null
  property_id: string | null
}

type MaintenanceRequest = {
  id: string
  status: string
  category: string | null
  actual_cost: number | null
  title: string
  priority: string
  property_id: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────
function diffDays(dateStr: string | null) {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EjariBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span style={{ color: '#333' }}>—</span>
  const diff = diffDays(expiry)!
  let color = '#4ade80', label = fmtDate(expiry)
  if (diff < 0)        { color = '#ef4444'; label = 'EXPIRED' }
  else if (diff <= 30) { color = '#f97316' }
  else if (diff <= 90) { color = GOLD }
  else                 { color = '#555' }
  return <span style={{ color, fontSize: '13px', fontWeight: diff <= 90 ? '600' : '400' }}>{label}</span>
}

function ExpiryBadge({ date, label }: { date: string | null; label: string }) {
  if (!date) return null
  const diff = diffDays(date)!
  if (diff > 90) return null
  let color = GOLD, bg = `${GOLD}15`
  if (diff < 0)        { color = '#ef4444'; bg = '#1c0000' }
  else if (diff <= 30) { color = '#f97316'; bg = '#1c0a00' }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: bg, border: `1px solid ${color}22`, borderRadius: '8px', marginBottom: '8px' }}>
      <span style={{ color: '#888', fontSize: '13px' }}>{label}</span>
      <span style={{ color, fontSize: '12px', fontWeight: '600' }}>
        {diff < 0 ? 'EXPIRED' : `${diff}d left`} · {fmtDate(date)}
      </span>
    </div>
  )
}

// ── Section wrapper ─────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <h3 style={{ color: '#F5F5F5', fontSize: '15px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>{title}</h3>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────
export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const [properties,    setProperties]    = useState<Property[]>([])
  const [clients,       setClients]       = useState<Client[]>([])
  const [rentPayments,  setRentPayments]  = useState<RentPayment[]>([])
  const [maintenance,   setMaintenance]   = useState<MaintenanceRequest[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [p, c, r, m] = await Promise.all([
        supabase.from('properties').select('id,unit_number,building_name,area,status,monthly_rent,ejari_expiry,tenant_id'),
        supabase.from('clients').select('id,full_name,passport_expiry,emirates_id_expiry'),
        supabase.from('rent_payments').select('id,status,expected_amount,paid_amount,period_label,property_id'),
        supabase.from('maintenance_requests').select('id,status,category,actual_cost,title,priority,property_id'),
      ])

      setProperties(p.data || [])
      setClients(c.data || [])
      setRentPayments(r.data || [])
      setMaintenance(m.data || [])
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return <div style={{ padding: '40px 32px', color: '#444' }}>Loading reports...</div>

  // ── Derived data ──────────────────────────────────────────────────

  // Portfolio
  const occupied  = properties.filter(p => p.status === 'occupied')
  const vacant    = properties.filter(p => p.status === 'vacant')
  const totalRent = occupied.reduce((s, p) => s + (p.monthly_rent || 0), 0)
  const occupancyRate = properties.length ? Math.round((occupied.length / properties.length) * 100) : 0

  // Ejari
  const ejariExpired  = properties.filter(p => p.ejari_expiry && diffDays(p.ejari_expiry)! < 0)
  const ejariUrgent   = properties.filter(p => p.ejari_expiry && diffDays(p.ejari_expiry)! >= 0 && diffDays(p.ejari_expiry)! <= 30)
  const ejariWarning  = properties.filter(p => p.ejari_expiry && diffDays(p.ejari_expiry)! > 30 && diffDays(p.ejari_expiry)! <= 90)
  const ejariAlert    = [...ejariExpired, ...ejariUrgent, ...ejariWarning].sort((a, b) => (diffDays(a.ejari_expiry) || 999) - (diffDays(b.ejari_expiry) || 999))

  // Rent
  const totalExpected   = rentPayments.reduce((s, r) => s + (r.expected_amount || 0), 0)
  const totalCollected  = rentPayments.filter(r => r.status === 'paid' || r.status === 'partial').reduce((s, r) => s + (r.paid_amount || 0), 0)
  const totalOutstanding = rentPayments.filter(r => r.status !== 'paid').reduce((s, r) => s + ((r.expected_amount || 0) - (r.paid_amount || 0)), 0)
  const collectionRate  = totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0

  // Maintenance
  const mainOpen       = maintenance.filter(m => m.status === 'open')
  const mainInProgress = maintenance.filter(m => m.status === 'in_progress')
  const mainCompleted  = maintenance.filter(m => m.status === 'completed')
  const mainTotalCost  = mainCompleted.reduce((s, m) => s + (m.actual_cost || 0), 0)

  const categoryCount: Record<string, number> = {}
  maintenance.forEach(m => { if (m.category) categoryCount[m.category] = (categoryCount[m.category] || 0) + 1 })
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 4)

  // Doc expiry — clients with anything expiring ≤90 days
  const docAlerts = clients.filter(c =>
    (c.passport_expiry && diffDays(c.passport_expiry)! <= 90) ||
    (c.emirates_id_expiry && diffDays(c.emirates_id_expiry)! <= 90)
  )

  const getPropName = (id: string | null) => {
    if (!id) return '—'
    const p = properties.find(p => p.id === id)
    return p ? `${p.unit_number}${p.building_name ? ', ' + p.building_name : ''}` : '—'
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: '980px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Reports
        </h2>
        <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
          Live snapshot of your portfolio — updated in real time
        </p>
      </div>

      {/* ── 1. Portfolio Overview ── */}
      <Section title="Portfolio Overview" icon="🏘️">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Total Properties', value: properties.length,         color: GOLD },
            { label: 'Occupied',         value: `${occupied.length} (${occupancyRate}%)`, color: '#4ade80' },
            { label: 'Vacant',           value: vacant.length,             color: vacant.length > 0 ? '#f97316' : '#555' },
            { label: 'Monthly Income',   value: `AED ${totalRent.toLocaleString()}`, color: GOLD },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{c.label}</p>
              <p style={{ color: c.color, fontSize: '18px', fontWeight: '700', margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {properties.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Property', 'Area', 'Status', 'Rent/mo', 'Ejari Expiry'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map(p => (
                <tr key={p.id}
                  onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                  style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '10px 12px', color: GOLD, fontSize: '13px', fontWeight: '500' }}>
                    {p.unit_number}{p.building_name ? `, ${p.building_name}` : ''}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{p.area || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: p.status === 'occupied' ? '#052e16' : '#1a1a1a',
                      color: p.status === 'occupied' ? '#4ade80' : '#555',
                    }}>
                      {p.status === 'occupied' ? 'OCCUPIED' : 'VACANT'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#888', fontSize: '13px' }}>
                    {p.monthly_rent ? `AED ${p.monthly_rent.toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}><EjariBadge expiry={p.ejari_expiry} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {properties.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No properties added yet.</p>}
      </Section>

      {/* ── 2. Ejari Compliance ── */}
      <Section title="Ejari Compliance" icon="📋">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: ejariAlert.length > 0 ? '20px' : '0' }}>
          {[
            { label: 'Expired',  value: ejariExpired.length,  color: '#ef4444' },
            { label: '≤30 Days', value: ejariUrgent.length,   color: '#f97316' },
            { label: '≤90 Days', value: ejariWarning.length,  color: GOLD },
            { label: 'OK',       value: properties.length - ejariExpired.length - ejariUrgent.length - ejariWarning.length, color: '#4ade80' },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{c.label}</p>
              <p style={{ color: c.color, fontSize: '22px', fontWeight: '700', margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {ejariAlert.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Property', 'Ejari Expiry', 'Days'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ejariAlert.map(p => {
                const diff = diffDays(p.ejari_expiry)!
                return (
                  <tr key={p.id}
                    onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                    style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 12px', color: GOLD, fontSize: '13px' }}>{p.unit_number}{p.building_name ? `, ${p.building_name}` : ''}</td>
                    <td style={{ padding: '10px 12px' }}><EjariBadge expiry={p.ejari_expiry} /></td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', color: diff < 0 ? '#ef4444' : diff <= 30 ? '#f97316' : GOLD, fontWeight: '600' }}>
                      {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d remaining`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {ejariAlert.length === 0 && properties.length > 0 && (
          <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>✓ All Ejari registrations are up to date.</p>
        )}
        {properties.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No properties added yet.</p>}
      </Section>

      {/* ── 3. Rent Collection ── */}
      <Section title="Rent Collection" icon="💰">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: rentPayments.length > 0 ? '20px' : '0' }}>
          {[
            { label: 'Total Expected',  value: `AED ${totalExpected.toLocaleString()}`,   color: '#888' },
            { label: 'Collected',       value: `AED ${totalCollected.toLocaleString()}`,  color: '#4ade80' },
            { label: 'Outstanding',     value: `AED ${totalOutstanding.toLocaleString()}`, color: totalOutstanding > 0 ? '#ef4444' : '#555' },
            { label: 'Collection Rate', value: `${collectionRate}%`,                       color: collectionRate >= 80 ? '#4ade80' : collectionRate >= 50 ? GOLD : '#ef4444' },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{c.label}</p>
              <p style={{ color: c.color, fontSize: '18px', fontWeight: '700', margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {rentPayments.filter(r => r.status !== 'paid').length > 0 && (
          <>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 10px 0' }}>Outstanding / Unpaid</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Property', 'Period', 'Expected', 'Paid', 'Balance', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rentPayments.filter(r => r.status !== 'paid').map(r => {
                  const balance = (r.expected_amount || 0) - (r.paid_amount || 0)
                  const statusColor = r.status === 'late' ? '#ef4444' : r.status === 'partial' ? GOLD : '#60a5fa'
                  return (
                    <tr key={r.id}
                      onClick={() => router.push(`/dashboard/rent/${r.id}`)}
                      style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', color: GOLD, fontSize: '13px' }}>{getPropName(r.property_id)}</td>
                      <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{r.period_label || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#888', fontSize: '13px' }}>{r.expected_amount ? `AED ${r.expected_amount.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#555', fontSize: '13px' }}>{r.paid_amount ? `AED ${r.paid_amount.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>{balance > 0 ? `AED ${balance.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', color: statusColor, backgroundColor: `${statusColor}18` }}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
        {rentPayments.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No rent records yet. Add payments in the Rent tab.</p>}
        {rentPayments.length > 0 && rentPayments.every(r => r.status === 'paid') && (
          <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>✓ All rent payments are up to date.</p>
        )}
      </Section>

      {/* ── 4. Maintenance ── */}
      <Section title="Maintenance Summary" icon="🔧">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: maintenance.length > 0 ? '20px' : '0' }}>
          {[
            { label: 'Open',        value: mainOpen.length,       color: '#60a5fa' },
            { label: 'In Progress', value: mainInProgress.length, color: GOLD },
            { label: 'Completed',   value: mainCompleted.length,  color: '#4ade80' },
            { label: 'Total Spend', value: `AED ${mainTotalCost.toLocaleString()}`, color: GOLD },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{c.label}</p>
              <p style={{ color: c.color, fontSize: '22px', fontWeight: '700', margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {topCategories.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 10px 0' }}>By Category</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {topCategories.map(([cat, count]) => (
                <div key={cat} style={{ padding: '6px 14px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '999px' }}>
                  <span style={{ color: '#888', fontSize: '12px' }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <span style={{ color: GOLD, fontSize: '12px', fontWeight: '700', marginLeft: '8px' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mainOpen.length > 0 && (
          <>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 10px 0' }}>Open Issues</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Property', 'Issue', 'Priority'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mainOpen.map(m => {
                  const pColor = m.priority === 'urgent' ? '#ef4444' : m.priority === 'high' ? '#f97316' : m.priority === 'medium' ? GOLD : '#555'
                  return (
                    <tr key={m.id}
                      onClick={() => router.push(`/dashboard/maintenance/${m.id}`)}
                      style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', color: GOLD, fontSize: '13px' }}>{getPropName(m.property_id)}</td>
                      <td style={{ padding: '10px 12px', color: '#F5F5F5', fontSize: '13px' }}>{m.title}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: pColor, fontSize: '11px', fontWeight: '700' }}>{m.priority.toUpperCase()}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
        {maintenance.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No maintenance requests logged yet.</p>}
      </Section>

      {/* ── 5. Document Expiry Alerts ── */}
      <Section title="Document Expiry Alerts" icon="⚠️">
        {docAlerts.length === 0 ? (
          <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>✓ No tenant documents expiring within the next 90 days.</p>
        ) : (
          docAlerts.map(c => (
            <div key={c.id}
              onClick={() => router.push(`/dashboard/clients/${c.id}`)}
              style={{ marginBottom: '12px', padding: '14px 16px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${GOLD}44`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
            >
              <p style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>{c.full_name}</p>
              <ExpiryBadge date={c.passport_expiry} label="Passport" />
              <ExpiryBadge date={c.emirates_id_expiry} label="Emirates ID" />
            </div>
          ))
        )}
        {clients.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No tenants added yet.</p>}
      </Section>

    </div>
  )
}
