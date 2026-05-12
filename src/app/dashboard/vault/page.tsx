'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/RoleContext'

type Client = {
  id: string
  full_name: string
  nationality: string
  status: string
  risk_level: string
  created_at: string
  relationship_ended_at: string | null
}

type RetentionStatus = 'active' | 'retention' | 'approaching' | 'eligible'

function getRetention(client: Client): {
  status: RetentionStatus
  label: string
  startDate: Date
  deadline: Date
  daysLeft: number
  percentComplete: number
  color: string
  bg: string
  border: string
  description: string
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000

  // If relationship hasn't ended, it's still active
  if (!client.relationship_ended_at) {
    return {
      status: 'active',
      label: 'Active Relationship',
      startDate: new Date(client.created_at),
      deadline: new Date(new Date(client.created_at).getTime() + FIVE_YEARS_MS),
      daysLeft: 9999,
      percentComplete: 0,
      color: '#4ade80',
      bg: '#052e16',
      border: '#166534',
      description: 'Relationship is ongoing. Records must be retained. Set an end date when the relationship concludes.',
    }
  }

  const startDate = new Date(client.relationship_ended_at)
  startDate.setHours(0, 0, 0, 0)
  const deadline = new Date(startDate.getTime() + FIVE_YEARS_MS)
  const totalMs = FIVE_YEARS_MS
  const elapsedMs = today.getTime() - startDate.getTime()
  const percentComplete = Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100)
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) {
    return {
      status: 'eligible',
      label: 'Eligible for Disposal',
      startDate,
      deadline,
      daysLeft,
      percentComplete: 100,
      color: '#C9963F',
      bg: '#12100A',
      border: '#C9963F44',
      description: '5-year minimum retention period has been met. Records may now be securely disposed of in accordance with your data retention policy.',
    }
  }

  if (daysLeft <= 180) {
    return {
      status: 'approaching',
      label: 'Approaching Disposal Date',
      startDate,
      deadline,
      daysLeft,
      percentComplete,
      color: '#f59e0b',
      bg: '#12100A',
      border: '#92400e',
      description: `5-year retention period ends in ${daysLeft} days. Begin preparing for secure disposal or confirm continued retention if required.`,
    }
  }

  return {
    status: 'retention',
    label: 'In Retention',
    startDate,
    deadline,
    daysLeft,
    percentComplete,
    color: '#C9963F',
    bg: '#0D0D0D',
    border: '#1E1E1E',
    description: `Records must be retained until ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. ${daysLeft} days remaining.`,
  }
}

export default function VaultPage() {
  const router = useRouter()
  const { isAdmin } = useRole()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [filter, setFilter] = useState<'all' | RetentionStatus>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchClients()
    }
    init()
  }, [router])

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, nationality, status, risk_level, created_at, relationship_ended_at')
      .order('full_name')
    setClients(data || [])
    setLoading(false)
  }

  const saveEndDate = async (clientId: string) => {
    setSavingId(clientId)
    await supabase.from('clients').update({ relationship_ended_at: editDate || null }).eq('id', clientId)
    await fetchClients()
    setEditingId(null)
    setEditDate('')
    setSavingId(null)
  }

  const clearEndDate = async (clientId: string) => {
    setSavingId(clientId)
    await supabase.from('clients').update({ relationship_ended_at: null }).eq('id', clientId)
    await fetchClients()
    setSavingId(null)
  }

  const filtered = clients.filter(c => {
    const ret = getRetention(c)
    const matchesFilter = filter === 'all' || ret.status === filter
    const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.nationality.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const counts = {
    all: clients.length,
    active: clients.filter(c => getRetention(c).status === 'active').length,
    retention: clients.filter(c => getRetention(c).status === 'retention').length,
    approaching: clients.filter(c => getRetention(c).status === 'approaching').length,
    eligible: clients.filter(c => getRetention(c).status === 'eligible').length,
  }

  if (loading) return <div style={{ padding: '40px 32px' }}><p style={{ color: '#8888aa' }}>Loading...</p></div>

  const filterBtn = (label: string, value: typeof filter, count: number, color = '#8888aa') => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      style={{
        padding: '6px 16px',
        borderRadius: '999px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        border: 'none',
        backgroundColor: filter === value ? '#C9963F' : '#080808',
        color: filter === value ? '#ffffff' : color,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {label}
      <span style={{ fontSize: '11px', opacity: 0.8 }}>({count})</span>
    </button>
  )

  return (
    <div style={{ padding: '40px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0' }}>5-Year Records Vault</h2>
        <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>
          UAE AML Law — mandatory 5-year record retention tracker
        </p>
      </div>

      {/* Legal notice */}
      <div style={{ backgroundColor: '#0D0D07', border: '1px solid #C9963F44', borderRadius: '10px', padding: '16px 20px', marginBottom: '28px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px' }}>📜</span>
        <div>
          <p style={{ color: '#C9963F', fontSize: '13px', fontWeight: '700', margin: '0 0 4px 0' }}>
            UAE Federal Decree-Law No. 20 of 2018 — Article 14
          </p>
          <p style={{ color: '#8888aa', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
            All DNFBPs (including real estate brokers) must retain customer due diligence records, transaction records, and correspondence for a <strong style={{ color: '#ffffff' }}>minimum of 5 years</strong> from the date the business relationship ends or the transaction is completed. Failure to comply is a criminal offence.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Active Relationships', value: counts.active, color: '#4ade80', bg: '#052e16', border: '#166534' },
          { label: 'In Retention Window', value: counts.retention, color: '#C9963F', bg: '#0D0D0D', border: '#1E1E1E' },
          { label: 'Approaching Disposal', value: counts.approaching, color: '#f59e0b', bg: '#12100A', border: '#92400e' },
          { label: 'Eligible for Disposal', value: counts.eligible, color: '#C9963F', bg: '#12100A', border: '#C9963F44' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: card.bg, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 8px 0' }}>{card.label}</p>
            <p style={{ color: card.color, fontSize: '32px', fontWeight: '800', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E1E1E', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px 14px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {filterBtn('All', 'all', counts.all)}
            {filterBtn('Active', 'active', counts.active, '#4ade80')}
            {filterBtn('In Retention', 'retention', counts.retention, '#C9963F')}
            {filterBtn('Approaching', 'approaching', counts.approaching, '#f59e0b')}
            {filterBtn('Eligible', 'eligible', counts.eligible, '#C9963F')}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p style={{ color: '#8888aa', padding: '32px 24px', margin: 0 }}>No clients match your filter.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 140px 1fr 160px', gap: '16px', padding: '12px 24px', borderBottom: '1px solid #1E1E1E' }}>
              {['CLIENT', 'ADDED', 'REL. ENDED', 'DEADLINE', 'RETENTION PROGRESS', 'STATUS'].map(h => (
                <span key={h} style={{ color: '#8888aa', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>{h}</span>
              ))}
            </div>

            {filtered.map(client => {
              const ret = getRetention(client)
              const isEditing = editingId === client.id

              return (
                <div key={client.id} style={{ borderBottom: '1px solid #111111' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 140px 1fr 160px', gap: '16px', padding: '16px 24px', alignItems: 'center' }}>
                    {/* Client name */}
                    <div>
                      <p
                        onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                        style={{ color: '#C9963F', fontSize: '14px', fontWeight: '600', margin: '0 0 2px 0', cursor: 'pointer' }}
                      >
                        {client.full_name}
                      </p>
                      <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>{client.nationality}</p>
                    </div>

                    {/* Added date */}
                    <p style={{ color: '#8888aa', fontSize: '13px', margin: 0 }}>
                      {new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    {/* Relationship ended */}
                    <div>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                          autoFocus
                          style={{ width: '100%', padding: '5px 8px', backgroundColor: '#080808', border: '1px solid #C9963F', borderRadius: '6px', color: '#ffffff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <p
                          onClick={() => isAdmin ? (setEditingId(client.id), setEditDate(client.relationship_ended_at || '')) : undefined}
                          style={{ color: client.relationship_ended_at ? '#ffffff' : '#8888aa', fontSize: '13px', margin: 0, cursor: isAdmin ? 'pointer' : 'default', fontStyle: client.relationship_ended_at ? 'normal' : 'italic' }}
                          title={isAdmin ? 'Click to set end date' : ''}
                        >
                          {client.relationship_ended_at
                            ? new Date(client.relationship_ended_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : isAdmin ? '+ Set date' : 'Not set'}
                        </p>
                      )}
                    </div>

                    {/* Deadline */}
                    <p style={{ color: ret.status === 'active' ? '#8888aa' : ret.color, fontSize: '13px', margin: 0 }}>
                      {ret.status === 'active'
                        ? '—'
                        : ret.deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    {/* Progress bar */}
                    <div>
                      {ret.status === 'active' ? (
                        <p style={{ color: '#4ade80', fontSize: '12px', margin: 0 }}>Relationship ongoing</p>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#8888aa', fontSize: '11px' }}>
                              {ret.status === 'eligible' ? 'Complete' : `${Math.round(ret.percentComplete)}%`}
                            </span>
                            <span style={{ color: ret.color, fontSize: '11px', fontWeight: '600' }}>
                              {ret.daysLeft <= 0 ? '✓ Done' : `${ret.daysLeft}d left`}
                            </span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: '#080808', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${ret.percentComplete}%`, backgroundColor: ret.color, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status badge + actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: ret.bg, color: ret.color, border: `1px solid ${ret.border}`, whiteSpace: 'nowrap' }}>
                        {ret.label}
                      </span>
                      {isEditing && isAdmin && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => saveEndDate(client.id)}
                            disabled={savingId === client.id}
                            style={{ padding: '3px 10px', backgroundColor: '#C9963F', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                          >
                            {savingId === client.id ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditDate('') }}
                            style={{ padding: '3px 10px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '5px', color: '#8888aa', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {!isEditing && client.relationship_ended_at && isAdmin && (
                        <button
                          onClick={() => clearEndDate(client.id)}
                          disabled={savingId === client.id}
                          style={{ padding: '2px 8px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '4px', color: '#8888aa', fontSize: '10px', cursor: 'pointer' }}
                        >
                          Clear date
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded description */}
                  {(ret.status === 'approaching' || ret.status === 'eligible') && (
                    <div style={{ margin: '0 24px 12px', padding: '10px 14px', backgroundColor: ret.bg, border: `1px solid ${ret.border}`, borderRadius: '8px' }}>
                      <p style={{ color: ret.color, fontSize: '12px', margin: 0 }}>{ret.description}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
