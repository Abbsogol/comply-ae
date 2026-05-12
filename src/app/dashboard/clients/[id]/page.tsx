'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/RoleContext'

type Client = {
  id: string
  created_at: string
  full_name: string
  email: string
  phone: string
  nationality: string
  id_type: string
  id_number: string
  source_of_funds: string
  property_interest: string
  risk_level: string
  status: string
  notes: string
  passport_expiry: string | null
  emirates_id_expiry: string | null
}

type Document = {
  id: string
  created_at: string
  file_name: string
  file_path: string
  document_type: string
}

type AuditLog = {
  id: string
  created_at: string
  action: string
  details: string
  user_email: string
}

type CashTransaction = {
  id: string
  created_at: string
  client_id: string
  amount: number
  transaction_date: string
  description: string
  payment_reference: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAdmin } = useRole()
  const [client, setClient] = useState<Client | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [cashTxns, setCashTxns] = useState<CashTransaction[]>([])
  const [addingCash, setAddingCash] = useState(false)
  const [cashForm, setCashForm] = useState({ amount: '', transaction_date: new Date().toISOString().split('T')[0], description: '', payment_reference: '' })
  const [savingCash, setSavingCash] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('passport')
  const [uploadError, setUploadError] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  useEffect(() => {
    const fetchClient = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserEmail(user.email || '')

      const { data, error } = await supabase
        .from('clients').select('*').eq('id', params.id).single()

      if (error || !data) { router.push('/dashboard'); return }

      setClient(data)
      setNotesValue(data.notes || '')
      fetchDocuments(data.id)
      fetchAuditLogs(data.id)
      fetchCashTxns(data.id)
      setLoading(false)
    }
    fetchClient()
  }, [params.id, router])

  const fetchDocuments = async (clientId: string) => {
    const { data } = await supabase
      .from('documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    setDocuments(data || [])
  }

  const fetchAuditLogs = async (clientId: string) => {
    const { data } = await supabase
      .from('audit_logs').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    setAuditLogs(data || [])
  }

  const fetchCashTxns = async (clientId: string) => {
    const { data } = await supabase
      .from('cash_transactions').select('*').eq('client_id', clientId).order('transaction_date', { ascending: false })
    setCashTxns(data || [])
  }

  const saveCashTxn = async () => {
    if (!client || !cashForm.amount || !cashForm.transaction_date) return
    setSavingCash(true)
    const { error } = await supabase.from('cash_transactions').insert([{
      client_id: client.id,
      amount: Number(cashForm.amount),
      transaction_date: cashForm.transaction_date,
      description: cashForm.description,
      payment_reference: cashForm.payment_reference,
    }])
    if (!error) {
      await fetchCashTxns(client.id)
      await logAction(client.id, 'Cash transaction recorded', `AED ${Number(cashForm.amount).toLocaleString()} on ${cashForm.transaction_date}`)
      setCashForm({ amount: '', transaction_date: new Date().toISOString().split('T')[0], description: '', payment_reference: '' })
      setAddingCash(false)
    }
    setSavingCash(false)
  }

  const deleteCashTxn = async (txnId: string, amount: number) => {
    if (!client) return
    await supabase.from('cash_transactions').delete().eq('id', txnId)
    await fetchCashTxns(client.id)
    await logAction(client.id, 'Cash transaction removed', `AED ${amount.toLocaleString()} removed`)
  }

  const logAction = async (clientId: string, action: string, details?: string) => {
    await supabase.from('audit_logs').insert([{
      client_id: clientId,
      action,
      details: details || null,
      user_email: currentUserEmail,
    }])
    fetchAuditLogs(clientId)
  }

  const updateField = async (field: string, value: string) => {
    if (!client) return
    const { error } = await supabase.from('clients').update({ [field]: value }).eq('id', client.id)
    if (!error) {
      setClient({ ...client, [field]: value })
      const label = field === 'status' ? 'KYC status' : 'Risk level'
      await logAction(client.id, `${label} changed to "${value}"`)
    }
  }

  const saveNotes = async () => {
    if (!client) return
    setSavingNotes(true)
    const { error } = await supabase.from('clients').update({ notes: notesValue }).eq('id', client.id)
    if (!error) {
      setClient({ ...client, notes: notesValue })
      setEditingNotes(false)
      await logAction(client.id, 'Notes updated')
    }
    setSavingNotes(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!client || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploading(true)
    setUploadError('')

    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
    const filePath = `${client.id}/${Date.now()}_${safeName}`

    const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file)
    if (uploadErr) { setUploadError('Upload failed: ' + uploadErr.message); setUploading(false); return }

    const { error: dbError } = await supabase.from('documents').insert([{
      client_id: client.id,
      file_name: file.name,
      file_path: filePath,
      document_type: docType,
    }])
    if (dbError) { setUploadError('Failed to save document record.'); setUploading(false); return }

    await logAction(client.id, `Document uploaded`, `${docType}: ${file.name}`)
    await fetchDocuments(client.id)
    setUploading(false)
    e.target.value = ''
  }

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (doc: Document) => {
    if (!client) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    await logAction(client.id, `Document deleted`, `${doc.document_type}: ${doc.file_name}`)
    fetchDocuments(client.id)
  }

  const generatePDF = async () => {
    if (!client) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 20

    const line = () => { doc.setDrawColor(220, 220, 220); doc.line(margin, y, pageW - margin, y); y += 6 }
    const section = (title: string) => {
      y += 4
      doc.setFontSize(9); doc.setTextColor(120, 120, 140); doc.setFont('helvetica', 'bold')
      doc.text(title.toUpperCase(), margin, y); y += 6
      line()
    }
    const field = (label: string, value: string) => {
      doc.setFontSize(9); doc.setTextColor(120, 120, 140); doc.setFont('helvetica', 'normal')
      doc.text(label, margin, y)
      doc.setFontSize(11); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal')
      doc.text(value || '—', margin, y + 5); y += 14
    }

    // Header
    doc.setFontSize(9); doc.setTextColor(120, 120, 140); doc.setFont('helvetica', 'bold')
    doc.text('COMPLY.AE', margin, y)
    doc.setFontSize(9); doc.setTextColor(120, 120, 140); doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageW - margin, y, { align: 'right' })
    y += 8

    doc.setFontSize(20); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold')
    doc.text('KYC Compliance Report', margin, y); y += 8

    doc.setFontSize(13); doc.setTextColor(60, 60, 80); doc.setFont('helvetica', 'normal')
    doc.text(client.full_name, margin, y); y += 6

    doc.setFontSize(9); doc.setTextColor(120, 120, 140)
    doc.text(`Status: ${client.status.toUpperCase()}   Risk: ${client.risk_level.toUpperCase()}`, margin, y); y += 10
    line()

    // Personal Info
    section('Personal Information')
    const half = (pageW - margin * 2) / 2
    doc.setFontSize(9); doc.setTextColor(120, 120, 140); doc.setFont('helvetica', 'normal')
    doc.text('Full Name', margin, y); doc.text('Email', margin + half, y)
    doc.setFontSize(11); doc.setTextColor(30, 30, 30)
    doc.text(client.full_name || '—', margin, y + 5); doc.text(client.email || '—', margin + half, y + 5); y += 14
    doc.setFontSize(9); doc.setTextColor(120, 120, 140)
    doc.text('Phone', margin, y); doc.text('Nationality', margin + half, y)
    doc.setFontSize(11); doc.setTextColor(30, 30, 30)
    doc.text(client.phone || '—', margin, y + 5); doc.text(client.nationality || '—', margin + half, y + 5); y += 16

    // Identity
    section('Identity Verification')
    doc.setFontSize(9); doc.setTextColor(120, 120, 140)
    doc.text('ID Type', margin, y); doc.text('ID Number', margin + half, y)
    doc.setFontSize(11); doc.setTextColor(30, 30, 30)
    doc.text(client.id_type || '—', margin, y + 5); doc.text(client.id_number || '—', margin + half, y + 5); y += 16

    // AML
    section('AML Information')
    field('Source of Funds', client.source_of_funds)
    field('Property Interest', client.property_interest)
    if (client.notes) field('Notes', client.notes)

    // Checklist
    section('Compliance Checklist')
    const docTypes = new Set(documents.map(d => d.document_type))
    const checklist = [
      { label: 'KYC intake form completed', done: true },
      { label: 'Passport uploaded', done: docTypes.has('passport') },
      { label: 'Emirates ID uploaded', done: docTypes.has('emirates_id') },
      { label: 'Proof of address uploaded', done: docTypes.has('proof_of_address') },
      { label: 'Source of funds document uploaded', done: docTypes.has('source_of_funds') },
      { label: 'Risk level assessed', done: !!client.risk_level },
      { label: 'KYC status reviewed', done: client.status === 'active' || client.status === 'rejected' },
    ]
    const completed = checklist.filter(i => i.done).length
    doc.setFontSize(10); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold')
    doc.text(`${Math.round((completed / checklist.length) * 100)}% Complete (${completed}/${checklist.length} items)`, margin, y); y += 8
    checklist.forEach(item => {
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      // Draw checkbox square
      doc.setDrawColor(item.done ? 34 : 180, item.done ? 197 : 180, item.done ? 94 : 180)
      doc.setFillColor(item.done ? 34 : 255, item.done ? 197 : 255, item.done ? 94 : 255)
      doc.rect(margin + 2, y - 4, 4, 4, item.done ? 'FD' : 'D')
      // Label
      doc.setTextColor(item.done ? 30 : 150, item.done ? 30 : 150, item.done ? 30 : 150)
      doc.text(item.label, margin + 9, y); y += 7
    })

    // Documents
    if (documents.length > 0) {
      y += 4; section('Uploaded Documents')
      documents.forEach(d => {
        doc.setFontSize(10); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal')
        doc.text(`• ${d.document_type}: ${d.file_name}`, margin + 2, y)
        doc.setFontSize(9); doc.setTextColor(120, 120, 140)
        doc.text(new Date(d.created_at).toLocaleDateString('en-GB'), pageW - margin, y, { align: 'right' })
        y += 7
      })
    }

    // Footer
    y = doc.internal.pageSize.getHeight() - 14
    doc.setFontSize(8); doc.setTextColor(150, 150, 160)
    doc.text('COMPLY.AE — UAE Real Estate Compliance Platform — Confidential', pageW / 2, y, { align: 'center' })

    doc.save(`KYC_Report_${client.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
    await logAction(client.id, 'KYC report downloaded')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8888aa', fontFamily: 'system-ui, sans-serif' }}>Loading client...</p>
      </div>
    )
  }

  if (!client) return null

  const statusOptions = ['pending', 'active', 'rejected']
  const riskOptions = ['low', 'medium', 'high']

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

  const docTypeLabels: Record<string, string> = {
    passport: 'Passport',
    emirates_id: 'Emirates ID',
    proof_of_address: 'Proof of Address',
    source_of_funds: 'Source of Funds',
    other: 'Other',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080808', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '40px 32px', maxWidth: '900px', margin: '0 auto' }}>
        <button onClick={() => router.push('/dashboard/clients')} style={{ marginBottom: '24px', padding: '7px 14px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#8888aa', fontSize: '13px', cursor: 'pointer' }}>
          ← Back to Clients
        </button>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0' }}>{client.full_name}</h2>
            <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>Added {new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push(`/dashboard/clients/${client.id}/risk`)}
              style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#C9963F', border: '1px solid #C9963F', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              🛡️ Risk Assessment
            </button>
            <button
              onClick={() => router.push(`/dashboard/clients/${client.id}/rear`)}
              style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#C9963F', border: '1px solid #C9963F', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              📋 REAR Report
            </button>
            <button
              onClick={() => router.push(`/dashboard/clients/${client.id}/screen`)}
              style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#C9963F', border: '1px solid #1E1E1E', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              🔍 PEP/Sanctions
            </button>
            <button
              onClick={() => router.push(`/dashboard/clients/${client.id}/str`)}
              style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              🚨 File STR
            </button>
            <button
              onClick={generatePDF}
              style={{ padding: '10px 20px', backgroundColor: '#C9963F', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              ↓ Download KYC Report
            </button>
          </div>
        </div>

        {/* Compliance Checklist */}
        {(() => {
          const docTypes = new Set(documents.map(d => d.document_type))
          const checklist = [
            { label: 'KYC intake form completed', done: true },
            { label: 'Passport uploaded', done: docTypes.has('passport') },
            { label: 'Emirates ID uploaded', done: docTypes.has('emirates_id') },
            { label: 'Proof of address uploaded', done: docTypes.has('proof_of_address') },
            { label: 'Source of funds document uploaded', done: docTypes.has('source_of_funds') },
            { label: 'Risk level assessed', done: client.risk_level !== null },
            { label: 'KYC status reviewed', done: client.status === 'active' || client.status === 'rejected' },
          ]
          const completed = checklist.filter(i => i.done).length
          const pct = Math.round((completed / checklist.length) * 100)
          const barColor = pct === 100 ? '#4ade80' : pct >= 50 ? '#f59e0b' : '#ef4444'

          return (
            <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: 0 }}>COMPLIANCE CHECKLIST</p>
                <span style={{ color: barColor, fontSize: '13px', fontWeight: '700' }}>{pct}% complete</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: '6px', backgroundColor: '#080808', borderRadius: '999px', marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '999px', transition: 'width 0.3s ease' }} />
              </div>
              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {checklist.map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: item.done ? '#052e16' : '#111111', border: `1px solid ${item.done ? '#4ade80' : '#1E1E1E'}` }}>
                      {item.done && <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                    </div>
                    <span style={{ color: item.done ? '#ffffff' : '#8888aa', fontSize: '14px', textDecoration: item.done ? 'none' : 'none' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Status & Risk Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px' }}>
            <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>KYC STATUS</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {statusOptions.map(s => (
                <button key={s} onClick={() => isAdmin && updateField('status', s)} style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: isAdmin ? 'pointer' : 'not-allowed', border: client.status === s ? '2px solid #C9963F' : '2px solid transparent', backgroundColor: statusColors[s].bg, color: statusColors[s].text, opacity: isAdmin ? 1 : 0.5 }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              {!isAdmin && <span style={{ color: '#8888aa', fontSize: '11px', alignSelf: 'center' }}>Admin only</span>}
            </div>
          </div>

          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px' }}>
            <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>RISK LEVEL</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {riskOptions.map(r => (
                <button key={r} onClick={() => isAdmin && updateField('risk_level', r)} style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: isAdmin ? 'pointer' : 'not-allowed', border: client.risk_level === r ? '2px solid #C9963F' : '2px solid transparent', backgroundColor: riskColors[r].bg, color: riskColors[r].text, opacity: isAdmin ? 1 : 0.5 }}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
              {!isAdmin && <span style={{ color: '#8888aa', fontSize: '11px', alignSelf: 'center' }}>Admin only</span>}
            </div>
          </div>
        </div>

        {/* Document Upload */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 20px 0' }}>DOCUMENTS</p>

          {/* Upload row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              style={{ padding: '8px 12px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', cursor: 'pointer' }}
            >
              {Object.entries(docTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <label style={{ padding: '8px 16px', backgroundColor: '#C9963F', color: '#ffffff', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Uploading...' : '+ Upload File'}
              <input type="file" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" />
            </label>

            <span style={{ color: '#8888aa', fontSize: '12px' }}>PDF, JPG, PNG accepted</span>
          </div>

          {uploadError && (
            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{uploadError}</p>
          )}

          {/* Document list */}
          {documents.length === 0 ? (
            <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>No documents uploaded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#080808', borderRadius: '8px', border: '1px solid #1E1E1E' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ padding: '2px 8px', backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '4px', color: '#C9963F', fontSize: '11px', fontWeight: '600' }}>
                      {docTypeLabels[doc.document_type] || doc.document_type}
                    </span>
                    <span style={{ color: '#ffffff', fontSize: '14px' }}>{doc.file_name}</span>
                    <span style={{ color: '#8888aa', fontSize: '12px' }}>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleDownload(doc)} style={{ padding: '5px 12px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '5px', color: '#8888aa', fontSize: '12px', cursor: 'pointer' }}>
                      View
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(doc)} style={{ padding: '5px 12px', backgroundColor: 'transparent', border: '1px solid #2d0f0f', borderRadius: '5px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personal Info */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 20px 0' }}>PERSONAL INFORMATION</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              { label: 'Full Name', value: client.full_name },
              { label: 'Email', value: client.email },
              { label: 'Phone', value: client.phone },
              { label: 'Nationality', value: client.nationality },
            ].map(field => (
              <div key={field.label}>
                <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>{field.label}</p>
                <p style={{ color: '#ffffff', fontSize: '15px', margin: 0 }}>{field.value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Identity Verification */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 20px 0' }}>IDENTITY VERIFICATION</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {[
              { label: 'ID Type', value: client.id_type },
              { label: 'ID Number', value: client.id_number },
            ].map(field => (
              <div key={field.label}>
                <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>{field.label}</p>
                <p style={{ color: '#ffffff', fontSize: '15px', margin: 0 }}>{field.value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Expiry dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              { label: 'Passport Expiry Date', field: 'passport_expiry', value: client.passport_expiry },
              { label: 'Emirates ID Expiry Date', field: 'emirates_id_expiry', value: client.emirates_id_expiry },
            ].map(item => {
              const today = new Date()
              const expiry = item.value ? new Date(item.value) : null
              const daysLeft = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
              const isExpired = daysLeft !== null && daysLeft < 0
              const isWarning = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
              const badgeColor = isExpired ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80'
              const badgeBg = isExpired ? '#2d0f0f' : isWarning ? '#2d1f00' : '#052e16'
              const badgeText = isExpired ? 'EXPIRED' : isWarning ? `${daysLeft}d left` : expiry ? 'Valid' : null

              return (
                <div key={item.field}>
                  <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 6px 0' }}>{item.label}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="date"
                      value={item.value || ''}
                      onChange={async e => {
                        const val = e.target.value
                        const { error } = await supabase.from('clients').update({ [item.field]: val || null }).eq('id', client.id)
                        if (!error) {
                          setClient({ ...client, [item.field]: val || null } as Client)
                          await logAction(client.id, `${item.label} set to ${val}`)
                        }
                      }}
                      style={{ padding: '6px 10px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                    />
                    {badgeText && (
                      <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: badgeBg, color: badgeColor }}>
                        {badgeText}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AML Information */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 20px 0' }}>AML INFORMATION</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              { label: 'Source of Funds', value: client.source_of_funds },
              { label: 'Property Interest', value: client.property_interest },
            ].map(field => (
              <div key={field.label}>
                <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>{field.label}</p>
                <p style={{ color: '#ffffff', fontSize: '15px', margin: 0 }}>{field.value || '—'}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>Notes</p>
              {!editingNotes ? (
                <button
                  onClick={() => setEditingNotes(true)}
                  style={{ padding: '3px 10px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '5px', color: '#8888aa', fontSize: '12px', cursor: 'pointer' }}
                >
                  Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setEditingNotes(false); setNotesValue(client.notes || '') }}
                    style={{ padding: '3px 10px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '5px', color: '#8888aa', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    style={{ padding: '3px 10px', backgroundColor: '#C9963F', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '12px', cursor: 'pointer', opacity: savingNotes ? 0.6 : 1 }}
                  >
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            {editingNotes ? (
              <textarea
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                rows={4}
                placeholder="Add notes about this client..."
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#080808', border: '1px solid #C9963F', borderRadius: '6px', color: '#ffffff', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            ) : (
              <p style={{ color: client.notes ? '#ffffff' : '#8888aa', fontSize: '15px', margin: 0, lineHeight: '1.6' }}>
                {client.notes || 'No notes yet. Click Edit to add one.'}
              </p>
            )}
          </div>
        </div>

        {/* Cash Transaction Tracker */}
        {(() => {
          const totalCash = cashTxns.reduce((sum, t) => sum + Number(t.amount), 0)
          const threshold = 55000
          const pct = Math.min((totalCash / threshold) * 100, 100)
          const exceeded = totalCash >= threshold
          return (
            <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${exceeded ? '#7f1d1d' : '#1E1E1E'}`, borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>CASH TRANSACTION TRACKER</p>
                  <p style={{ color: '#ffffff', fontSize: '13px', margin: 0 }}>AED 55,000 Threshold Monitor</p>
                </div>
                <button
                  onClick={() => setAddingCash(!addingCash)}
                  style={{ padding: '6px 14px', backgroundColor: '#C9963F', border: 'none', borderRadius: '7px', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  + Add Transaction
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: exceeded ? '#f87171' : '#8888aa', fontSize: '13px', fontWeight: '600' }}>
                    Total Cash: AED {totalCash.toLocaleString()}
                  </span>
                  <span style={{ color: '#8888aa', fontSize: '12px' }}>Threshold: AED 55,000</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#080808', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: exceeded ? '#f87171' : pct > 70 ? '#f59e0b' : '#C9963F', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                </div>
              </div>

              {/* Alert when exceeded */}
              {exceeded && (
                <div style={{ backgroundColor: '#2d0f0f', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#f87171', fontSize: '13px', fontWeight: '700', margin: '0 0 2px 0' }}>⚠️ AED 55,000 threshold exceeded — REAR report is legally required</p>
                    <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>Total cash received: AED {totalCash.toLocaleString()}. File immediately via goAML.</p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/clients/${client?.id}/rear`)}
                    style={{ padding: '7px 16px', backgroundColor: '#f87171', border: 'none', borderRadius: '7px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, marginLeft: '16px' }}
                  >
                    Generate REAR →
                  </button>
                </div>
              )}

              {/* Add transaction form */}
              {addingCash && (
                <div style={{ backgroundColor: '#0D0D07', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600', margin: '0 0 12px 0' }}>New Cash Transaction</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ color: '#8888aa', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>AMOUNT (AED) *</label>
                      <input
                        type="number"
                        value={cashForm.amount}
                        onChange={e => setCashForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="e.g. 30000"
                        style={{ width: '100%', padding: '8px 10px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#8888aa', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>DATE *</label>
                      <input
                        type="date"
                        value={cashForm.transaction_date}
                        onChange={e => setCashForm(p => ({ ...p, transaction_date: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#8888aa', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>DESCRIPTION</label>
                      <input
                        value={cashForm.description}
                        onChange={e => setCashForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="e.g. Deposit for Villa purchase"
                        style={{ width: '100%', padding: '8px 10px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#8888aa', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>PAYMENT REFERENCE</label>
                      <input
                        value={cashForm.payment_reference}
                        onChange={e => setCashForm(p => ({ ...p, payment_reference: e.target.value }))}
                        placeholder="Receipt or ref number"
                        style={{ width: '100%', padding: '8px 10px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setAddingCash(false)} style={{ padding: '7px 14px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#8888aa', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={saveCashTxn} disabled={savingCash} style={{ padding: '7px 14px', backgroundColor: '#C9963F', border: 'none', borderRadius: '6px', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: savingCash ? 0.6 : 1 }}>
                      {savingCash ? 'Saving...' : 'Save Transaction'}
                    </button>
                  </div>
                </div>
              )}

              {/* Transaction list */}
              {cashTxns.length === 0 ? (
                <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>No cash transactions recorded yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                      {['Date', 'Amount', 'Description', 'Reference', ''].map(h => (
                        <th key={h} style={{ padding: '8px 0', textAlign: 'left', color: '#8888aa', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cashTxns.map(txn => (
                      <tr key={txn.id} style={{ borderBottom: '1px solid #111111' }}>
                        <td style={{ padding: '10px 0', color: '#8888aa', fontSize: '13px' }}>{new Date(txn.transaction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '10px 0', color: '#4ade80', fontSize: '14px', fontWeight: '700' }}>AED {Number(txn.amount).toLocaleString()}</td>
                        <td style={{ padding: '10px 0', color: '#ffffff', fontSize: '13px' }}>{txn.description || '—'}</td>
                        <td style={{ padding: '10px 0', color: '#8888aa', fontSize: '13px' }}>{txn.payment_reference || '—'}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <button
                            onClick={() => deleteCashTxn(txn.id, txn.amount)}
                            style={{ padding: '3px 10px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '5px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })()}

        {/* Audit Log */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 20px 0' }}>ACTIVITY LOG</p>
          {auditLogs.length === 0 ? (
            <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>No activity recorded yet.</p>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* vertical line */}
              <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '1px', backgroundColor: '#1E1E1E' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {auditLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: '#C9963F', flexShrink: 0, marginTop: '2px', zIndex: 1 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#ffffff', fontSize: '14px', margin: '0 0 2px 0', fontWeight: '500' }}>{log.action}</p>
                      {log.details && <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 2px 0' }}>{log.details}</p>}
                      <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>
                        {log.user_email} · {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
