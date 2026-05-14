'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Report = {
  id: string
  created_at: string
  report_type: string
  inspection_date: string | null
  apartment_type: string | null
  tenant_name: string | null
  status: string
  property_id: string | null
  properties: { unit_number: string; building_name: string | null } | null
}

const TYPE_LABELS: Record<string, string> = {
  move_in:  'Move-In',
  move_out: 'Move-Out',
  periodic: 'Periodic',
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  draft:    { color: GOLD,      bg: `${GOLD}18` },
  complete: { color: '#4ade80', bg: '#052e16'   },
}

export default function InspectionsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading]  = useState(true)
  const [search, setSearch]    = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('condition_reports')
        .select('*, properties(unit_number, building_name)')
        .order('created_at', { ascending: false })

      setReports(data || [])
      setLoading(false)
    }
    init()
  }, [router])

  const filtered = reports.filter(r => {
    const q = search.toLowerCase()
    const propName = r.properties
      ? `${r.properties.unit_number} ${r.properties.building_name || ''}`.toLowerCase()
      : ''
    const matchSearch =
      propName.includes(q) ||
      r.tenant_name?.toLowerCase().includes(q) ||
      r.apartment_type?.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || r.report_type === typeFilter
    return matchSearch && matchType
  })

  const statCards = [
    { label: 'Total Reports', value: reports.length },
    { label: 'Move-Ins',      value: reports.filter(r => r.report_type === 'move_in').length },
    { label: 'Move-Outs',     value: reports.filter(r => r.report_type === 'move_out').length },
    { label: 'Drafts',        value: reports.filter(r => r.status === 'draft').length },
  ]

  const getPropName = (r: Report) => {
    if (!r.properties) return '—'
    return `${r.properties.unit_number}${r.properties.building_name ? ', ' + r.properties.building_name : ''}`
  }

  return (
    <div style={{ padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Inspections
          </h2>
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            Move-in, move-out, and periodic condition reports
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/inspections/new')}
          style={{ padding: '10px 20px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          + New Report
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '18px 20px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{card.label}</p>
            <p style={{ color: GOLD, fontSize: '26px', fontWeight: '700', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>

        {/* Filters */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by property, tenant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '13px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {[['All', 'all'], ['Move-In', 'move_in'], ['Move-Out', 'move_out'], ['Periodic', 'periodic']].map(([label, value]) => (
              <button key={value} onClick={() => setTypeFilter(value)}
                style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: typeFilter === value ? GOLD : '#080808', color: typeFilter === value ? '#fff' : '#555' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#444', padding: '24px', fontSize: '14px' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📝</div>
            <p style={{ color: '#444', fontSize: '14px', margin: '0 0 16px 0' }}>
              {reports.length === 0 ? 'No reports yet. Start by creating your first inspection report.' : 'No reports match your search.'}
            </p>
            {reports.length === 0 && (
              <button onClick={() => router.push('/dashboard/inspections/new')}
                style={{ padding: '10px 20px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                + Create First Report
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Property', 'Type', 'Date', 'Tenant', 'Apt Type', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const statusStyle = STATUS_STYLES[r.status] || STATUS_STYLES.draft
                return (
                  <tr key={r.id}
                    onClick={() => router.push(`/dashboard/inspections/${r.id}`)}
                    style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '13px 20px', color: GOLD, fontSize: '14px', fontWeight: '500' }}>{getPropName(r)}</td>
                    <td style={{ padding: '13px 20px', color: '#888', fontSize: '13px' }}>{TYPE_LABELS[r.report_type] || r.report_type}</td>
                    <td style={{ padding: '13px 20px', color: '#888', fontSize: '13px' }}>
                      {r.inspection_date ? new Date(r.inspection_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '13px 20px', color: '#F5F5F5', fontSize: '13px' }}>{r.tenant_name || '—'}</td>
                    <td style={{ padding: '13px 20px', color: '#888', fontSize: '13px' }}>{r.apartment_type || '—'}</td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                        {r.status === 'complete' ? 'COMPLETE' : 'DRAFT'}
                      </span>
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
