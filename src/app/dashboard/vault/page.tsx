'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Property = { id: string; unit_number: string; building_name: string | null }

type PropertyDoc = {
  id: string
  created_at: string
  document_type: string
  file_name: string
  file_path: string
  file_size: number | null
  expiry_date: string | null
  notes: string | null
  property_id: string | null
}

const DOC_TYPES = [
  { value: 'title_deed',      label: 'Title Deed',      icon: '📜' },
  { value: 'noc',             label: 'NOC',             icon: '✅' },
  { value: 'insurance',       label: 'Insurance',       icon: '🛡️' },
  { value: 'service_charge',  label: 'Service Charge',  icon: '🧾' },
  { value: 'floor_plan',      label: 'Floor Plan',      icon: '📐' },
  { value: 'other',           label: 'Other',           icon: '📁' },
]

const TYPE_COLORS: Record<string, string> = {
  title_deed:     '#a78bfa',
  noc:            '#4ade80',
  insurance:      '#60a5fa',
  service_charge: GOLD,
  floor_plan:     '#f97316',
  other:          '#555',
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return null
  const diff = Math.floor((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  let color = '#888', bg = '#1a1a1a', label = fmtDate(date)!
  if (diff < 0)        { color = '#ef4444'; bg = '#1c0000'; label = 'EXPIRED' }
  else if (diff <= 30) { color = '#f97316'; bg = '#1c0a00' }
  else if (diff <= 90) { color = GOLD;      bg = `${GOLD}15` }
  return (
    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: diff < 0 ? '700' : '500', backgroundColor: bg, color }}>
      {label}
    </span>
  )
}

export default function VaultPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropId, setSelectedPropId] = useState<string>('all')
  const [docs, setDocs] = useState<PropertyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')

  const [form, setForm] = useState({
    property_id:   '',
    document_type: 'title_deed',
    expiry_date:   '',
    notes:         '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const loadDocs = async () => {
    let query = supabase
      .from('property_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (selectedPropId !== 'all') {
      query = query.eq('property_id', selectedPropId)
    }

    const { data } = await query
    setDocs(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: props } = await supabase
        .from('properties')
        .select('id, unit_number, building_name')
        .order('unit_number')
      setProperties(props || [])
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!loading) loadDocs()
  }, [selectedPropId, loading])

  const getPropName = (id: string) => {
    const p = properties.find(p => p.id === id)
    if (!p) return '—'
    return `${p.unit_number}${p.building_name ? ', ' + p.building_name : ''}`
  }

  const getDocTypeInfo = (type: string) => DOC_TYPES.find(d => d.value === type) || { label: type, icon: '📁' }

  const filtered = docs.filter(d => typeFilter === 'all' || d.document_type === typeFilter)

  const handleUpload = async () => {
    if (!selectedFile) { alert('Please select a file.'); return }
    if (!form.property_id) { alert('Please select a property.'); return }

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const ext = selectedFile.name.split('.').pop()
    const path = `property-docs/${form.property_id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(path, selectedFile, { upsert: false })

    if (uploadErr) {
      setUploading(false)
      alert('Upload failed. Please try again.')
      return
    }

    const { error: dbErr } = await supabase.from('property_documents').insert({
      user_id:       user.id,
      property_id:   form.property_id,
      document_type: form.document_type,
      file_name:     selectedFile.name,
      file_path:     path,
      file_size:     selectedFile.size,
      expiry_date:   form.expiry_date || null,
      notes:         form.notes.trim() || null,
    })

    if (dbErr) {
      setUploading(false)
      alert('Error saving document record.')
      return
    }

    setUploading(false)
    setShowModal(false)
    setSelectedFile(null)
    setForm({ property_id: '', document_type: 'title_deed', expiry_date: '', notes: '' })
    loadDocs()
  }

  const handleView = async (doc: PropertyDoc) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (doc: PropertyDoc) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('property_documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  const needsExpiry = (type: string) => type === 'insurance' || type === 'noc'

  const statCards = DOC_TYPES.slice(0, 4).map(t => ({
    label: t.label,
    value: docs.filter(d => d.document_type === t.value).length,
    color: TYPE_COLORS[t.value],
  }))

  return (
    <div style={{ padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Vault
          </h2>
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            Title deeds, NOCs, insurance, and all property-level documents
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 20px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          + Upload Document
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '18px 20px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{card.label}</p>
            <p style={{ color: card.color, fontSize: '26px', fontWeight: '700', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedPropId}
            onChange={e => setSelectedPropId(e.target.value)}
            style={{ padding: '8px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '13px', outline: 'none' }}
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.unit_number}{p.building_name ? `, ${p.building_name}` : ''}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setTypeFilter('all')}
              style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: typeFilter === 'all' ? GOLD : '#080808', color: typeFilter === 'all' ? '#fff' : '#555' }}>
              All
            </button>
            {DOC_TYPES.map(t => (
              <button key={t.value} onClick={() => setTypeFilter(t.value)}
                style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: typeFilter === t.value ? GOLD : '#080808', color: typeFilter === t.value ? '#fff' : '#555' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#444', padding: '24px', fontSize: '14px' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
            <p style={{ color: '#444', fontSize: '14px', margin: '0 0 16px 0' }}>
              {docs.length === 0 ? 'No documents yet. Upload your first property document.' : 'No documents match your filter.'}
            </p>
            {docs.length === 0 && (
              <button onClick={() => setShowModal(true)}
                style={{ padding: '10px 20px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                + Upload First Document
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Property', 'Type', 'File Name', 'Size', 'Expiry', 'Uploaded', ''].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const typeInfo = getDocTypeInfo(doc.document_type)
                const typeColor = TYPE_COLORS[doc.document_type] || '#555'
                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #111' }}>
                    <td style={{ padding: '13px 20px', color: GOLD, fontSize: '13px', fontWeight: '500' }}>
                      {doc.property_id ? getPropName(doc.property_id) : '—'}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{typeInfo.icon}</span>
                        <span style={{ color: typeColor, fontSize: '12px', fontWeight: '600' }}>{typeInfo.label}</span>
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#F5F5F5', fontSize: '13px', maxWidth: '220px' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</span>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#444', fontSize: '12px' }}>{fmtSize(doc.file_size)}</td>
                    <td style={{ padding: '13px 20px' }}>
                      {doc.expiry_date ? <ExpiryBadge date={doc.expiry_date} /> : <span style={{ color: '#333', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 20px', color: '#444', fontSize: '12px' }}>
                      {new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleView(doc)}
                          style={{ padding: '5px 12px', backgroundColor: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          View
                        </button>
                        <button onClick={() => handleDelete(doc)}
                          style={{ padding: '5px 10px', backgroundColor: 'transparent', color: '#333', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '32px', width: '100%', maxWidth: '500px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: '#F5F5F5', fontSize: '18px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>Upload Document</h3>
              <button onClick={() => { setShowModal(false); setSelectedFile(null) }}
                style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#888', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Property *</p>
              <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '7px', color: '#F5F5F5', fontSize: '14px', outline: 'none' }}>
                <option value="">— Select property —</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.unit_number}{p.building_name ? `, ${p.building_name}` : ''}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#888', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Document Type</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {DOC_TYPES.map(t => (
                  <button key={t.value} onClick={() => setForm(f => ({ ...f, document_type: t.value }))}
                    style={{
                      padding: '8px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      border: `1px solid ${form.document_type === t.value ? TYPE_COLORS[t.value] : BORDER}`,
                      backgroundColor: form.document_type === t.value ? `${TYPE_COLORS[t.value]}15` : 'transparent',
                      color: form.document_type === t.value ? TYPE_COLORS[t.value] : '#555',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {needsExpiry(form.document_type) && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#888', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Expiry Date</p>
                <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '7px', color: '#F5F5F5', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#888', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Notes (optional)</p>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Policy number, issuing authority..."
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '7px', color: '#F5F5F5', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#888', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>File *</p>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1px dashed ${selectedFile ? GOLD : BORDER}`, borderRadius: '8px', padding: '20px',
                  textAlign: 'center', cursor: 'pointer', backgroundColor: selectedFile ? `${GOLD}08` : 'transparent',
                }}
              >
                {selectedFile ? (
                  <div>
                    <p style={{ color: GOLD, fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>{selectedFile.name}</p>
                    <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>{fmtSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#444', fontSize: '14px', margin: '0 0 4px 0' }}>Click to select file</p>
                    <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>PDF, JPG, PNG supported</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                style={{ display: 'none' }}
                onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleUpload} disabled={uploading}
                style={{ flex: 1, padding: '11px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button onClick={() => { setShowModal(false); setSelectedFile(null) }}
                style={{ padding: '11px 20px', backgroundColor: 'transparent', color: '#555', border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
