'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

const docTypeLabels: Record<string, string> = {
  passport: 'Passport',
  emirates_id: 'Emirates ID',
  proof_of_address: 'Proof of Address',
  source_of_funds: 'Source of Funds',
  other: 'Other',
}

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const filtered = documents.filter(d => {
    const matchesSearch =
      d.file_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.clients?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || d.document_type === typeFilter
    return matchesSearch && matchesType
  })

  const filterBtn = (label: string, value: string) => (
    <button
      key={value}
      onClick={() => setTypeFilter(value)}
      style={{
        padding: '5px 14px', borderRadius: '999px', fontSize: '13px',
        fontWeight: '600', cursor: 'pointer', border: 'none',
        backgroundColor: typeFilter === value ? '#C9963F' : '#080808',
        color: typeFilter === value ? '#ffffff' : '#8888aa',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding: '40px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0' }}>Documents</h2>
        <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>All uploaded files across all clients</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Files', value: documents.length, color: '#C9963F' },
          { label: 'Passports', value: documents.filter(d => d.document_type === 'passport').length, color: '#4ade80' },
          { label: 'Emirates IDs', value: documents.filter(d => d.document_type === 'emirates_id').length, color: '#C9963F' },
          { label: 'Proof of Address', value: documents.filter(d => d.document_type === 'proof_of_address').length, color: '#f59e0b' },
          { label: 'Source of Funds', value: documents.filter(d => d.document_type === 'source_of_funds').length, color: '#f87171' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 8px 0' }}>{card.label}</p>
            <p style={{ color: card.color, fontSize: '28px', fontWeight: '700', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Search and filter */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E1E1E', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by file name or client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1', minWidth: '220px', padding: '8px 14px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#8888aa', fontSize: '12px', marginRight: '4px' }}>Type:</span>
            {filterBtn('All', 'all')}
            {filterBtn('Passport', 'passport')}
            {filterBtn('Emirates ID', 'emirates_id')}
            {filterBtn('Proof of Address', 'proof_of_address')}
            {filterBtn('Source of Funds', 'source_of_funds')}
            {filterBtn('Other', 'other')}
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#8888aa', padding: '24px' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#8888aa', padding: '24px' }}>
            {documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your search.'}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                {['Client', 'Document Type', 'File Name', 'Uploaded', ''].map(h => (
                  <th key={h} style={{ padding: '12px 24px', textAlign: 'left', color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #111111' }}>
                  <td style={{ padding: '14px 24px' }}>
                    <p
                      onClick={() => router.push('/dashboard/clients/' + doc.client_id)}
                      style={{ color: '#C9963F', fontSize: '14px', margin: '0 0 2px 0', cursor: 'pointer', fontWeight: '500' }}
                    >
                      {doc.clients?.full_name || '—'}
                    </p>
                    <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>{doc.clients?.nationality || ''}</p>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', color: '#C9963F' }}>
                      {docTypeLabels[doc.document_type] || doc.document_type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px', color: '#ffffff', fontSize: '14px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.file_name}
                  </td>
                  <td style={{ padding: '14px 24px', color: '#8888aa', fontSize: '13px' }}>
                    {new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <button
                      onClick={() => handleView(doc)}
                      style={{ padding: '5px 14px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#8888aa', fontSize: '12px', cursor: 'pointer' }}
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
