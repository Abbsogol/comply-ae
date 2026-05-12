'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  created_at: string
  full_name: string
  email: string
  nationality: string
  status: string
  risk_level: string
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientsWithDocs, setClientsWithDocs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: clientData } = await supabase
        .from('clients').select('*').order('created_at', { ascending: false })
      setClients(clientData || [])

      const { data: docData } = await supabase.from('documents').select('client_id')
      const ids = new Set((docData || []).map((d: { client_id: string }) => d.client_id))
      setClientsWithDocs(ids)
      setLoading(false)
    }
    init()
  }, [router])

  const filtered = clients.filter(c => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.nationality?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesRisk = riskFilter === 'all' || c.risk_level === riskFilter
    return matchesSearch && matchesStatus && matchesRisk
  })

  const filterBtn = (label: string, value: string, current: string, setter: (v: string) => void, activeColor: string) => (
    <button key={value} onClick={() => setter(value)} style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: current === value ? activeColor : '#080808', color: current === value ? '#ffffff' : '#8888aa' }}>
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

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>Clients</h2>
          <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>{clients.length} total clients</p>
        </div>
        <button onClick={() => router.push('/dashboard/clients/new')} style={{ padding: '10px 20px', backgroundColor: '#C9963F', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          + New Client KYC
        </button>
      </div>

      <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E1E1E', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <input type="text" placeholder="Search by name, email, nationality..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '1', minWidth: '220px', padding: '8px 14px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none' }} />
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
          <p style={{ color: '#8888aa', padding: '24px' }}>{clients.length === 0 ? 'No clients yet.' : 'No clients match your search.'}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                {['Name', 'Email', 'Nationality', 'Status', 'Risk', 'Docs', 'Added'].map(h => (
                  <th key={h} style={{ padding: '12px 24px', textAlign: 'left', color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <tr key={client.id} onClick={() => router.push('/dashboard/clients/' + client.id)} style={{ borderBottom: '1px solid #111111', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111111')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <td style={{ padding: '14px 24px', color: '#ffffff', fontSize: '14px' }}>{client.full_name}</td>
                  <td style={{ padding: '14px 24px', color: '#8888aa', fontSize: '14px' }}>{client.email || '—'}</td>
                  <td style={{ padding: '14px 24px', color: '#8888aa', fontSize: '14px' }}>{client.nationality || '—'}</td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: statusColors[client.status]?.bg || '#2d1f00', color: statusColors[client.status]?.text || '#fbbf24' }}>{client.status}</span>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: riskColors[client.risk_level]?.bg || '#0D0D0D', color: riskColors[client.risk_level]?.text || '#94a3b8' }}>{client.risk_level}</span>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {clientsWithDocs.has(client.id) ? <span style={{ color: '#4ade80', fontSize: '13px' }}>✓ Uploaded</span> : <span style={{ color: '#f87171', fontSize: '13px' }}>✗ Missing</span>}
                  </td>
                  <td style={{ padding: '14px 24px', color: '#8888aa', fontSize: '13px' }}>{new Date(client.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
