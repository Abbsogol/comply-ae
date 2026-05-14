'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Request = {
  id: string
  created_at: string
  title: string
  category: string | null
  priority: string
  status: string
  reported_date: string | null
  actual_cost: number | null
  assigned_to: string | null
  property_id: string | null
  properties: { unit_number: string; building_name: string | null } | null
}

const PRIORITY_STYLES: Record<string, { color: string; bg: string }> = {
  low:    { color: '#888',     bg: '#1a1a1a' },
  medium: { color: GOLD,      bg: `${GOLD}18` },
  high:   { color: '#f97316', bg: '#1c0a00' },
  urgent: { color: '#ef4444', bg: '#1c0000' },
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  open:        { color: '#60a5fa', bg: '#0a1628' },
  in_progress: { color: GOLD,      bg: `${GOLD}18` },
  completed:   { color: '#4ade80', bg: '#052e16' },
  cancelled:   { color: '#555',    bg: '#111' },
}

const CATEGORY_LABELS: Record<string, string> = {
  plumbing:   'Plumbing',
  electrical: 'Electrical',
  ac:         'AC / HVAC',
  structural: 'Structural',
  general:    'General',
  pest:       'Pest Control',
  painting:   'Painting',
  other:      'Other',
}

export default function MaintenancePage() {
  const router = useRouter()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('maintenance_requests')
        .select('*, properties(unit_number, building_name)')
        .order('created_at', { ascending: false })

      setRequests(data || [])
      setLoading(false)
    }
    init()
  }, [router])

  const filtered = requests.filter(r => {
    const q = search.toLowerCase()
    const propName = r.properties
      ? `${r.properties.unit_number} ${r.properties.building_name || ''}`.toLowerCase()
      : ''
    const matchSearch =
      propName.includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.assigned_to?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const statCards = [
    { label: 'Total',       value: requests.length },
    { label: 'Open',        value: requests.filter(r => r.status === 'open').length,        color: '#60a5fa' },
    { label: 'In Progress', value: requests.filter(r => r.status === 'in_progress').length, color: GOLD },
    { label: 'Completed',   value: requests.filter(r => r.status === 'completed').length,   color: '#4ade80' },
  ]

  const getPropName = (r: Request) => {
    if (!r.properties) return '—'
    return `${r.properties.unit_number}${r.properties.building_name ? ', ' + r.properties.building_name : ''}`
  }

  const totalCost = requests
    .filter(r => r.status === 'completed' && r.actual_cost)
    .reduce((sum, r) => sum + (r.actual_cost || 0), 0)

  return (
    <div style={{ padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Maintenance
          </h2>
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            Track and manage property maintenance requests
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/maintenance/new')}
          style={{ padding: '10px 20px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          + New Request
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '18px 20px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{card.label}</p>
            <p style={{ color: card.color || GOLD, fontSize: '26px', fontWeight: '700', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Cost banner */}
      {totalCost > 0 && (
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '14px 20px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>Total maintenance spend (completed jobs)</p>
          <p style={{ color: GOLD, fontSize: '18px', fontWeight: '700', margin: 0 }}>AED {totalCost.toLocaleString()}</p>
        </div>
      )}
      {totalCost === 0 && <div style={{ marginBottom: '28px' }} />}

      {/* Table */}
      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>

        {/* Filters */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by property, issue, contractor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '13px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {[['All', 'all'], ['Open', 'open'], ['In Progress', 'in_progress'], ['Completed', 'completed']].map(([label, value]) => (
              <button key={value} onClick={() => setStatusFilter(value)}
                style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: statusFilter === value ? GOLD : '#080808', color: statusFilter === value ? '#fff' : '#555' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#444', padding: '24px', fontSize: '14px' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔧</div>
            <p style={{ color: '#444', fontSize: '14px', margin: '0 0 16px 0' }}>
              {requests.length === 0 ? 'No maintenance requests yet. Log your first issue.' : 'No requests match your search.'}
            </p>
            {requests.length === 0 && (
              <button onClick={() => router.push('/dashboard/maintenance/new')}
                style={{ padding: '10px 20px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                + Log First Request
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Property', 'Issue', 'Category', 'Priority', 'Status', 'Date', 'Cost', ''].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const priorityStyle = PRIORITY_STYLES[r.priority] || PRIORITY_STYLES.medium
                const statusStyle   = STATUS_STYLES[r.status]     || STATUS_STYLES.open
                return (
                  <tr key={r.id}
                    onClick={() => router.push(`/dashboard/maintenance/${r.id}`)}
                    style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '13px 20px', color: GOLD, fontSize: '13px', fontWeight: '500' }}>{getPropName(r)}</td>
                    <td style={{ padding: '13px 20px', color: '#F5F5F5', fontSize: '13px', maxWidth: '200px' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#888', fontSize: '13px' }}>{CATEGORY_LABELS[r.category || ''] || r.category || '—'}</td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: priorityStyle.bg, color: priorityStyle.color }}>
                        {r.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                        {r.status === 'in_progress' ? 'IN PROGRESS' : r.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#888', fontSize: '13px' }}>
                      {r.reported_date ? new Date(r.reported_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '13px 20px', color: '#888', fontSize: '13px' }}>
                      {r.actual_cost ? `AED ${r.actual_cost.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '13px 20px', color: '#444', fontSize: '12px' }}>Open →</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
