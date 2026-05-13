'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type DocumentRow = {
  id: string
  created_at: string
  file_name: string
  file_path: string
  document_type: string
  client_id: string
  clients: {
    full_name: string
    nationality: string
  }
}

const DOC_TYPE_LABELS: Record<string, string> = {
  passport:          'Passport',
  emirates_id:       'Emirates ID',
  tenancy_contract:  'Tenancy Contract',
  noc:               'NOC',
  proof_of_address:  'Proof of Address',
  other:             'Other',
}

const DOC_TYPE_FILTERS = [
  { label: 'All',              value: 'all' },
  { label: 'Passport',         value: 'passport' },
  { label: 'Emirates ID',      value: 'emirates_id' },
  { label: 'Tenancy Contract', value: 'tenancy_contract' },
  { label: 'NOC',              value: 'noc' },
  { label: 'Other',            value: 'other' },
]

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('documents')
        .select('*, clients(full_name, nationality)')
        .order('created_at', { ascending: false })

      setDocuments(data || [])
      setLoading(false)
    }
    init()
  }, [router])

  const handleView = async (doc: DocumentRow) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const filtered = documents.filter(d => {
    const q = search.toLowerCase()
    const matchesSearch =
      d.file_name?.toLowerCase().includes(q) ||
      d.clients?.full_name?.toLowerCase().includes(q)
    const matchesType = typeFilter === 'all' || d.document_type === typeFilter
    return matchesSearch && matchesType
  })

  const statCards = [
    { label: 'Total Files',        value: documents.length },
    { label: 'Passports',          value: documents.filter(d => d.document_type === 'passport').length },
    { label: 'Emirates IDs',       value: documents.filter(d => d.document_type === 'emirates_id').length },
    { label: 'Tenancy Contracts',  value: documents.filter(d => d.document_type === 'tenancy_contract').length },
    { label: 'NOCs',               value: documents.filter(d => d.document_type === 'noc').length },
  ]

  return (
    <div style={{ padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Documents
        </h2>
        <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>All files uploaded across your tenants</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '18px 20px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{card.label}</p>
            <p style={{ color: GOLD, fontSize: '26px', fontWeight: '700', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>

        {/* Search + filter bar */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by file name or tenant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: '200px',
              padding: '8px 12px', backgroundColor: '#080808',
              border: `1px solid ${BORDER}`, borderRadius: '6px',
              color: '#F5F5F5', fontSize: '13px', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#444', fontSize: '11px' }}>Type:</span>
            {DOC_TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                style={{
                  padding: '5px 12px', borderRadius: '999px', fontSize: '12px',
                  fontWeight: '600', cursor: 'pointer', border: 'none',
                  backgroundColor: typeFilter === f.value ? GOLD : '#080808',
                  color: typeFilter === f.value ? '#fff' : '#555',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#444', padding: '24px', fontSize: '14px' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📄</div>
            <p style={{ color: '#444', fontSize: '14px', margin: 0 }}>
              {documents.length === 0 ? 'No documents uploaded yet. Upload files from a tenant profile.' : 'No documents match your search.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Tenant', 'Type', 'File Name', 'Uploaded', ''].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #111' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '13px 20px' }}>
                    <p
                      onClick={() => router.push('/dashboard/clients/' + doc.client_id)}
                      style={{ color: GOLD, fontSize: '14px', margin: '0 0 2px 0', cursor: 'pointer', fontWeight: '500' }}
                    >
                      {doc.clients?.full_name || '—'}
                    </p>
                    <p style={{ color: '#444', fontSize: '11px', margin: 0 }}>{doc.clients?.nationality || ''}</p>
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', backgroundColor: '#080808', border: `1px solid ${BORDER}`, color: GOLD }}>
                      {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </span>
                  </td>
                  <td style={{ padding: '13px 20px', color: '#F5F5F5', fontSize: '13px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.file_name}
                  </td>
                  <td style={{ padding: '13px 20px', color: '#444', fontSize: '12px' }}>
                    {new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <button
                      onClick={() => handleView(doc)}
                      style={{ padding: '5px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '5px', color: '#888', fontSize: '12px', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
