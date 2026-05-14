'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Payment = {
  id: string
  created_at: string
  period_label: string | null
  due_date: string | null
  payment_date: string | null
  expected_amount: number | null
  paid_amount: number | null
  status: string
  payment_method: string | null
  property_id: string | null
  tenant_id: string | null
  properties: { unit_number: string; building_name: string | null } | null
  clients: { full_name: string } | null
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  paid:        { color: '#4ade80', bg: '#052e16',    label: 'PAID' },
  outstanding: { color: '#60a5fa', bg: '#0a1628',    label: 'OUTSTANDING' },
  late:        { color: '#ef4444', bg: '#1c0000',    label: 'LATE' },
  partial:     { color: GOLD,      bg: `${GOLD}18`,  label: 'PARTIAL' },
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  cash:          'Cash',
  cheque:        'Cheque',
  online:        'Online',
}

export default function RentPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('rent_payments')
        .select('*, properties(unit_number, building_name), clients(full_name)')
        .order('due_date', { ascending: false })

      setPayments(data || [])
      setLoading(false)
    }
    init()
  }, [router])

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    const propName = p.properties
      ? `${p.properties.unit_number} ${p.properties.building_name || ''}`.toLowerCase()
      : ''
    const tenantName = p.clients?.full_name?.toLowerCase() || ''
    const period = p.period_label?.toLowerCase() || ''
    const matchSearch = propName.includes(q) || tenantName.includes(q) || period.includes(q)
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalCollected = payments
    .filter(p => p.status === 'paid' || p.status === 'partial')
    .reduce((sum, p) => sum + (p.paid_amount || 0), 0)

  const totalOutstanding = payments
    .filter(p => p.status === 'outstanding' || p.status === 'late' || p.status === 'partial')
    .reduce((sum, p) => sum + ((p.expected_amount || 0) - (p.paid_amount || 0)), 0)

  const statCards = [
    { label: 'Total Records',  value: payments.length,                                              color: GOLD },
    { label: 'Collected',      value: `AED ${totalCollected.toLocaleString()}`,                     color: '#4ade80' },
    { label: 'Outstanding',    value: `AED ${totalOutstanding.toLocaleString()}`,                   color: '#60a5fa' },
    { label: 'Late',           value: payments.filter(p => p.status === 'late').length,             color: '#ef4444' },
  ]

  const getPropName = (p: Payment) => {
    if (!p.properties) return '—'
    return `${p.properties.unit_number}${p.properties.building_name ? ', ' + p.properties.building_name : ''}`
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Rent & Payments
          </h2>
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            Track rent collection and outstanding balances across your properties
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/rent/new')}
          style={{ padding: '10px 20px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          + Log Payment
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '18px 20px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{card.label}</p>
            <p style={{ color: card.color, fontSize: typeof card.value === 'string' ? '18px' : '26px', fontWeight: '700', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>

        {/* Filters */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by property, tenant, period..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '13px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {[['All', 'all'], ['Paid', 'paid'], ['Outstanding', 'outstanding'], ['Late', 'late'], ['Partial', 'partial']].map(([label, value]) => (
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
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>💰</div>
            <p style={{ color: '#444', fontSize: '14px', margin: '0 0 16px 0' }}>
              {payments.length === 0 ? 'No payments logged yet. Start tracking rent collection.' : 'No records match your search.'}
            </p>
            {payments.length === 0 && (
              <button onClick={() => router.push('/dashboard/rent/new')}
                style={{ padding: '10px 20px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                + Log First Payment
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Property', 'Tenant', 'Period', 'Due Date', 'Expected', 'Paid', 'Method', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = STATUS_STYLES[p.status] || STATUS_STYLES.outstanding
                return (
                  <tr key={p.id}
                    onClick={() => router.push(`/dashboard/rent/${p.id}`)}
                    style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '13px 16px', color: GOLD, fontSize: '13px', fontWeight: '500' }}>{getPropName(p)}</td>
                    <td style={{ padding: '13px 16px', color: '#F5F5F5', fontSize: '13px' }}>{p.clients?.full_name || '—'}</td>
                    <td style={{ padding: '13px 16px', color: '#888', fontSize: '13px' }}>{p.period_label || '—'}</td>
                    <td style={{ padding: '13px 16px', color: '#888', fontSize: '13px' }}>{fmtDate(p.due_date)}</td>
                    <td style={{ padding: '13px 16px', color: '#888', fontSize: '13px' }}>
                      {p.expected_amount ? `AED ${p.expected_amount.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '600', color: p.paid_amount ? '#4ade80' : '#333' }}>
                      {p.paid_amount ? `AED ${p.paid_amount.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '13px 16px', color: '#555', fontSize: '13px' }}>
                      {METHOD_LABELS[p.payment_method || ''] || p.payment_method || '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', color: '#444', fontSize: '12px' }}>Open →</td>
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
