'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Client = {
  id: string
  created_at: string
  full_name: string
  email: string
  nationality: string
  status: string
  risk_level: string
  passport_expiry: string | null
  emirates_id_expiry: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientsWithDocs, setClientsWithDocs] = useState<Set<string>>(new Set())
  const [docsByClient, setDocsByClient] = useState<Record<string, Set<string>>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
      setClients(clientData || [])

      const { data: docData } = await supabase
        .from('documents')
        .select('client_id, document_type')
      const ids = new Set((docData || []).map((d: { client_id: string }) => d.client_id))
      setClientsWithDocs(ids)
      const byClient: Record<string, Set<string>> = {}
      ;(docData || []).forEach((d: { client_id: string; document_type: string }) => {
        if (!byClient[d.client_id]) byClient[d.client_id] = new Set()
        byClient[d.client_id].add(d.document_type)
      })
      setDocsByClient(byClient)

      setLoading(false)
    }
    init()
  }, [router])

  const pending = clients.filter(c => c.status === 'pending').length
  const active = clients.filter(c => c.status === 'active').length
  const highRisk = clients.filter(c => c.risk_level === 'high').length
  const missingDocs = clients.filter(c => !clientsWithDocs.has(c.id))
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const today = new Date()

  const needsAttention = clients.filter(c =>
    c.risk_level === 'high' ||
    (c.status === 'pending' && new Date(c.created_at) < sevenDaysAgo)
  )

  const expiryAlerts = clients.filter(c => {
    const passportExpiry = c.passport_expiry ? new Date(c.passport_expiry) : null
    const emiratesExpiry = c.emirates_id_expiry ? new Date(c.emirates_id_expiry) : null
    return (passportExpiry && passportExpiry <= thirtyDaysFromNow) ||
           (emiratesExpiry && emiratesExpiry <= thirtyDaysFromNow)
  })

  const getExpiryTag = (c: Client) => {
    const passportExpiry = c.passport_expiry ? new Date(c.passport_expiry) : null
    const emiratesExpiry = c.emirates_id_expiry ? new Date(c.emirates_id_expiry) : null
    if (passportExpiry && passportExpiry < today) return 'Passport Expired'
    if (emiratesExpiry && emiratesExpiry < today) return 'Emirates ID Expired'
    if (passportExpiry && passportExpiry <= thirtyDaysFromNow) return 'Passport Expiring'
    if (emiratesExpiry && emiratesExpiry <= thirtyDaysFromNow) return 'Emirates ID Expiring'
    return ''
  }

  const filtered = clients.filter(c => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.nationality?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesRisk = riskFilter === 'all' || c.risk_level === riskFilter
    return matchesSearch && matchesStatus && matchesRisk
  })

  const getChecklist = (client: Client) => {
    const docTypes = docsByClient[client.id] || new Set()
    const items = [
      true,
      docTypes.has('passport'),
      docTypes.has('emirates_id'),
      docTypes.has('proof_of_address'),
      docTypes.has('source_of_funds'),
      client.risk_level !== null,
      client.status === 'active' || client.status === 'rejected',
    ]
    const done = items.filter(Boolean).length
    return Math.round((done / items.length) * 100)
  }

  const filterBtn = (label: string, value: string, current: string, setter: (v: string) => void, activeColor: string) => (
    <button
      key={value}
      onClick={() => setter(value)}
      style={{
        padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '600',
        cursor: 'pointer', border: 'none',
        backgroundColor: current === value ? activeColor : '#080808',
        color: current === value ? '#ffffff' : '#8888aa',
      }}
    >
      {label}
    </button>
  )

  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#2d1f00', text: '#fbbf24' },
    active: { bg: '#052e16', text: '#4ade80' },
    rejected: { bg: '#2d0f0f', text: '#f87171' },
  }

  const riskColors: Record<string, { bg: string; text: string }> = {
    low: { bg: '#052e16', text: '#4ade80' },
    medium: { bg: '#0D0D0D', text: '#94a3b8' },
    high: { bg: '#2d0f0f', text: '#f87171' },
  }

  const AlertRow = ({ client, tag, tagColor }: { client: Client; tag: string; tagColor: string }) => (
    <div
      onClick={() => router.push('/dashboard/clients/' + client.id)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#080808', cursor: 'pointer', marginBottom: '8px', border: '1px solid #1E1E1E' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#C9963F')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E1E')}
    >
      <div>
        <p style={{ color: '#ffffff', fontSize: '14px', margin: '0 0 2px 0', fontWeight: '500' }}>{client.full_name}</p>
        <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>{client.nationality || '—'} · Added {new Date(client.created_at).toLocaleDateString()}</p>
      </div>
      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: tagColor === 'red' ? '#2d0f0f' : '#2d1f00', color: tagColor === 'red' ? '#f87171' : '#fbbf24' }}>
        {tag}
      </span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080808', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '40px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0' }}>Dashboard</h2>
            <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>UAE Real Estate Compliance Platform</p>
          </div>
          <button onClick={() => router.push('/dashboard/clients/new')} style={{ padding: '10px 20px', backgroundColor: '#C9963F', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            + New Client KYC
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Total Clients', value: clients.length, color: '#C9963F', sub: 'all time' },
            { label: 'Active', value: active, color: '#4ade80', sub: 'KYC approved' },
            { label: 'Pending KYC', value: pending, color: '#f59e0b', sub: 'awaiting review' },
            { label: 'High Risk', value: highRisk, color: '#ef4444', sub: 'requires attention' },
          ].map((card) => (
            <div key={card.label} style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px' }}>
              <p style={{ color: '#8888aa', fontSize: '13px', margin: '0 0 12px 0' }}>{card.label}</p>
              <p style={{ color: card.color, fontSize: '36px', fontWeight: '700', margin: '0 0 4px 0', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Alert panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

          {/* Needs Attention */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Needs Attention</h3>
              {needsAttention.length > 0 && (
                <span style={{ marginLeft: 'auto', backgroundColor: '#2d0f0f', color: '#f87171', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px' }}>
                  {needsAttention.length}
                </span>
              )}
            </div>
            {needsAttention.length === 0 ? (
              <p style={{ color: '#8888aa', fontSize: '13px', margin: 0 }}>No clients require attention right now.</p>
            ) : (
              needsAttention.slice(0, 4).map(c => (
                <AlertRow
                  key={c.id}
                  client={c}
                  tag={c.risk_level === 'high' ? 'High Risk' : 'Pending 7d+'}
                  tagColor={c.risk_level === 'high' ? 'red' : 'yellow'}
                />
              ))
            )}
          </div>

          {/* Missing Documents */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px' }}>📄</span>
              <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Missing Documents</h3>
              {missingDocs.length > 0 && (
                <span style={{ marginLeft: 'auto', backgroundColor: '#2d1f00', color: '#fbbf24', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px' }}>
                  {missingDocs.length}
                </span>
              )}
            </div>
            {missingDocs.length === 0 ? (
              <p style={{ color: '#8888aa', fontSize: '13px', margin: 0 }}>All clients have documents uploaded.</p>
            ) : (
              missingDocs.slice(0, 4).map(c => (
                <AlertRow
                  key={c.id}
                  client={c}
                  tag="No Docs"
                  tagColor="yellow"
                />
              ))
            )}
          </div>
        </div>

        {/* Expiry Alerts */}
        {expiryAlerts.length > 0 && (
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px' }}>🗓️</span>
              <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Document Expiry Alerts</h3>
              <span style={{ marginLeft: 'auto', backgroundColor: '#2d0f0f', color: '#f87171', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px' }}>
                {expiryAlerts.length}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
              {expiryAlerts.map(c => {
                const tag = getExpiryTag(c)
                const isExpired = tag.includes('Expired')
                return (
                  <div
                    key={c.id}
                    onClick={() => router.push('/dashboard/clients/' + c.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#080808', cursor: 'pointer', border: '1px solid #1E1E1E' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#C9963F')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E1E')}
                  >
                    <div>
                      <p style={{ color: '#ffffff', fontSize: '14px', margin: '0 0 2px 0', fontWeight: '500' }}>{c.full_name}</p>
                      <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>{c.nationality || '—'}</p>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: isExpired ? '#2d0f0f' : '#2d1f00', color: isExpired ? '#f87171' : '#fbbf24', whiteSpace: 'nowrap' }}>
                      {tag}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Client list */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E1E1E', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by name, email, nationality..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: '1', minWidth: '220px', padding: '8px 14px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: '#8888aa', fontSize: '12px', marginRight: '4px' }}>Status:</span>
              {filterBtn('All', 'all', statusFilter, setStatusFilter, '#C9963F')}
              {filterBtn('Pending', 'pending', statusFilter, setStatusFilter, '#b45309')}
              {filterBtn('Active', 'active', statusFilter, setStatusFilter, '#15803d')}
              {filterBtn('Rejected', 'rejected', statusFilter, setStatusFilter, '#b91c1c')}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: '#8888aa', fontSize: '12px', marginRight: '4px' }}>Risk:</span>
              {filterBtn('All', 'all', riskFilter, setRiskFilter, '#C9963F')}
              {filterBtn('Low', 'low', riskFilter, setRiskFilter, '#15803d')}
              {filterBtn('Medium', 'medium', riskFilter, setRiskFilter, '#4b5563')}
              {filterBtn('High', 'high', riskFilter, setRiskFilter, '#b91c1c')}
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#8888aa', padding: '24px' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#8888aa', padding: '24px' }}>
              {clients.length === 0 ? 'No clients yet. Add your first client using the button above.' : 'No clients match your search.'}
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                  {['Name', 'Email', 'Nationality', 'Status', 'Risk', 'Checklist', 'Added'].map(h => (
                    <th key={h} style={{ padding: '12px 24px', textAlign: 'left', color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} onClick={() => router.push('/dashboard/clients/' + client.id)} style={{ borderBottom: '1px solid #111111', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111111')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td style={{ padding: '14px 24px', color: '#ffffff', fontSize: '14px' }}>{client.full_name}</td>
                    <td style={{ padding: '14px 24px', color: '#8888aa', fontSize: '14px' }}>{client.email || '—'}</td>
                    <td style={{ padding: '14px 24px', color: '#8888aa', fontSize: '14px' }}>{client.nationality || '—'}</td>
                    <td style={{ padding: '14px 24px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: statusColors[client.status]?.bg || '#2d1f00', color: statusColors[client.status]?.text || '#fbbf24' }}>
                        {client.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: riskColors[client.risk_level]?.bg || '#0D0D0D', color: riskColors[client.risk_level]?.text || '#94a3b8' }}>
                        {client.risk_level}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      {(() => {
                        const pct = getChecklist(client)
                        const color = pct === 100 ? '#4ade80' : pct >= 50 ? '#f59e0b' : '#ef4444'
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '5px', backgroundColor: '#080808', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '999px' }} />
                            </div>
                            <span style={{ color, fontSize: '12px', fontWeight: '600' }}>{pct}%</span>
                          </div>
                        )
                      })()}
                    </td>
                    <td style={{ padding: '14px 24px', color: '#8888aa', fontSize: '13px' }}>{new Date(client.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
