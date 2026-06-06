'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Tenant = {
  id: string
  created_at: string
  full_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  passport_expiry: string | null
  emirates_id_expiry: string | null
  notes: string | null
}

type LinkedProperty = {
  id: string
  unit_number: string
  building_name: string | null
  area: string | null
  status: string
  monthly_rent: number | null
  ejari_expiry: string | null
}

type Document = {
  id: string
  created_at: string
  file_name: string
  file_path: string
  document_type: string
}

function ExpiryAlert({ label, dateStr }: { label: string; dateStr: string | null }) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(dateStr)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 90) return null

  const expired = diffDays < 0
  const bg = expired ? '#1a0505' : '#1a1100'
  const border = expired ? '#5a1a1a' : '#3a2a00'
  const color = expired ? '#f87171' : GOLD
  const icon = expired ? '🚨' : '⚠️'
  const msg = expired
    ? `${label} expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago. Renewal required.`
    : `${label} expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}.`

  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ color, fontSize: '13px', fontWeight: '600' }}>{msg}</span>
    </div>
  )
}

function ExpiryField({ label, dateStr, clientId, field, onUpdate }: {
  label: string; dateStr: string | null; clientId: string; field: string
  onUpdate: (field: string, value: string | null) => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = dateStr ? new Date(dateStr) : null
  const diffDays = expiry ? Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null

  let badgeColor = '#4ade80'
  let badgeBg = '#052e16'
  let badgeText = 'Valid'
  if (diffDays === null) { badgeText = '—'; badgeColor = '#444'; badgeBg = 'transparent' }
  else if (diffDays < 0) { badgeText = 'EXPIRED'; badgeColor = '#f87171'; badgeBg = '#2d0f0f' }
  else if (diffDays <= 30) { badgeText = `${diffDays}d left`; badgeColor = '#fb923c'; badgeBg = '#2d1500' }
  else if (diffDays <= 90) { badgeText = `${diffDays}d left`; badgeColor = GOLD; badgeBg = '#1a1100' }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null
    await supabase.from('clients').update({ [field]: val }).eq('id', clientId)
    onUpdate(field, val)
  }

  return (
    <div>
      <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="date"
          value={dateStr || ''}
          onChange={handleChange}
          style={{
            padding: '7px 10px', backgroundColor: '#080808',
            border: `1px solid ${BORDER}`, borderRadius: '6px',
            color: '#F5F5F5', fontSize: '13px', outline: 'none', cursor: 'pointer',
          }}
        />
        <span style={{
          padding: '3px 8px', borderRadius: '4px', fontSize: '11px',
          fontWeight: '600', backgroundColor: badgeBg, color: badgeColor,
        }}>{badgeText}</span>
      </div>
    </div>
  )
}

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  emirates_id: 'Emirates ID',
  tenancy_contract: 'Tenancy Contract',
  noc: 'NOC',
  proof_of_address: 'Proof of Address',
  other: 'Other',
}

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [linkedProperty, setLinkedProperty] = useState<LinkedProperty | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('passport')
  const [uploadError, setUploadError] = useState('')
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({ full_name: '', email: '', phone: '', nationality: '' })
  const [savingInfo, setSavingInfo] = useState(false)

  // Pre-tenancy checks
  type PreTenancyCheck = {
    id: string | null
    aecb_check: boolean
    employment_verified: boolean
    previous_landlord_ref: boolean
    salary_verified: boolean
    notes: string
  }
  const [checks, setChecks] = useState<PreTenancyCheck>({
    id: null, aecb_check: false, employment_verified: false,
    previous_landlord_ref: false, salary_verified: false, notes: '',
  })
  const [savingChecks, setSavingChecks] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('clients').select('*').eq('id', params.id).single()
      if (error || !data) { router.push('/dashboard/clients'); return }

      setTenant(data)
      setNotesValue(data.notes || '')
      setInfoForm({ full_name: data.full_name || '', email: data.email || '', phone: data.phone || '', nationality: data.nationality || '' })

      // find linked property
      const { data: propData } = await supabase
        .from('properties')
        .select('id, unit_number, building_name, area, status, monthly_rent, ejari_expiry')
        .eq('tenant_id', data.id)
        .maybeSingle()
      setLinkedProperty(propData || null)

      // documents
      const { data: docs } = await supabase
        .from('documents').select('*').eq('client_id', data.id).order('created_at', { ascending: false })
      setDocuments(docs || [])

      // pre-tenancy checks
      const { data: checkData } = await supabase
        .from('pre_tenancy_checks').select('*').eq('client_id', data.id).maybeSingle()
      if (checkData) setChecks({ id: checkData.id, aecb_check: checkData.aecb_check, employment_verified: checkData.employment_verified, previous_landlord_ref: checkData.previous_landlord_ref, salary_verified: checkData.salary_verified, notes: checkData.notes || '' })

      setLoading(false)
    }
    init()
  }, [params.id, router])

  const updateField = (field: string, value: string | null) => {
    if (!tenant) return
    setTenant({ ...tenant, [field]: value } as Tenant)
  }

  const saveNotes = async () => {
    if (!tenant) return
    setSavingNotes(true)
    await supabase.from('clients').update({ notes: notesValue }).eq('id', tenant.id)
    setTenant({ ...tenant, notes: notesValue })
    setEditingNotes(false)
    setSavingNotes(false)
  }

  const saveInfo = async () => {
    if (!tenant) return
    setSavingInfo(true)
    await supabase.from('clients').update({
      full_name: infoForm.full_name.trim(),
      email: infoForm.email.trim() || null,
      phone: infoForm.phone.trim() || null,
      nationality: infoForm.nationality.trim() || null,
    }).eq('id', tenant.id)
    setTenant({ ...tenant, ...infoForm })
    setEditingInfo(false)
    setSavingInfo(false)
  }

  const saveChecks = async (updated: PreTenancyCheck) => {
    if (!tenant) return
    setSavingChecks(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingChecks(false); return }
    const payload = { user_id: user.id, client_id: tenant.id, aecb_check: updated.aecb_check, employment_verified: updated.employment_verified, previous_landlord_ref: updated.previous_landlord_ref, salary_verified: updated.salary_verified, notes: updated.notes }
    if (updated.id) {
      await supabase.from('pre_tenancy_checks').update(payload).eq('id', updated.id)
    } else {
      const { data } = await supabase.from('pre_tenancy_checks').insert(payload).select().single()
      if (data) setChecks(c => ({ ...c, id: data.id }))
    }
    setSavingChecks(false)
  }

  const toggleCheck = (field: keyof PreTenancyCheck) => {
    if (field === 'id' || field === 'notes') return
    const updated = { ...checks, [field]: !checks[field as keyof PreTenancyCheck] }
    setChecks(updated)
    saveChecks(updated)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!tenant || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploading(true)
    setUploadError('')
    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
    const filePath = `${tenant.id}/${Date.now()}_${safeName}`
    const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file)
    if (uploadErr) { setUploadError('Upload failed: ' + uploadErr.message); setUploading(false); return }
    const { error: dbErr } = await supabase.from('documents').insert([{
      client_id: tenant.id, file_name: file.name, file_path: filePath, document_type: docType,
    }])
    if (dbErr) { setUploadError('Failed to save record.'); setUploading(false); return }
    const { data: docs } = await supabase.from('documents').select('*').eq('client_id', tenant.id).order('created_at', { ascending: false })
    setDocuments(docs || [])
    setUploading(false)
    e.target.value = ''
  }

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDeleteDoc = async (doc: Document) => {
    if (!tenant) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#444', fontFamily: 'system-ui, sans-serif' }}>Loading tenant...</p>
      </div>
    )
  }

  if (!tenant) return null

  const propName = linkedProperty
    ? `${linkedProperty.unit_number}${linkedProperty.building_name ? ', ' + linkedProperty.building_name : ''}${linkedProperty.area ? ' · ' + linkedProperty.area : ''}`
    : null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080808', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ padding: '40px 32px', maxWidth: '880px' }}>

        {/* Back */}
        <button
          onClick={() => router.push('/dashboard/clients')}
          style={{ marginBottom: '24px', padding: '7px 14px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#555', fontSize: '13px', cursor: 'pointer' }}
        >
          ← Back to Tenants
        </button>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{
            color: '#F5F5F5', fontSize: '26px', fontWeight: '700',
            margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif',
          }}>{tenant.full_name}</h2>
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            Added {new Date(tenant.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Expiry alerts */}
        {(tenant.passport_expiry || tenant.emirates_id_expiry) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <ExpiryAlert label="Passport" dateStr={tenant.passport_expiry} />
            <ExpiryAlert label="Emirates ID" dateStr={tenant.emirates_id_expiry} />
          </div>
        )}

        {/* Linked Property */}
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px 24px', marginBottom: '20px' }}>
          <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px 0' }}>Linked Property</p>
          {linkedProperty ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: GOLD, fontSize: '15px', fontWeight: '600', margin: '0 0 4px 0' }}>{propName}</p>
                <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
                  {linkedProperty.status}
                  {linkedProperty.monthly_rent ? ` · AED ${Number(linkedProperty.monthly_rent).toLocaleString()}/mo` : ''}
                </p>
              </div>
              <button
                onClick={() => router.push(`/dashboard/properties/${linkedProperty.id}`)}
                style={{ padding: '7px 14px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#888', fontSize: '13px', cursor: 'pointer' }}
              >
                View Property →
              </button>
            </div>
          ) : (
            <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
              No property linked. Go to a property and link this tenant from there.
            </p>
          )}
        </div>

        {/* Personal Info */}
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Personal Information</p>
            {!editingInfo ? (
              <button
                onClick={() => setEditingInfo(true)}
                style={{ padding: '5px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '5px', color: '#555', fontSize: '12px', cursor: 'pointer' }}
              >
                Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setEditingInfo(false); setInfoForm({ full_name: tenant.full_name || '', email: tenant.email || '', phone: tenant.phone || '', nationality: tenant.nationality || '' }) }}
                  style={{ padding: '5px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '5px', color: '#555', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveInfo} disabled={savingInfo}
                  style={{ padding: '5px 12px', backgroundColor: GOLD, border: 'none', borderRadius: '5px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', opacity: savingInfo ? 0.6 : 1 }}>
                  {savingInfo ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editingInfo ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Full Name', key: 'full_name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Phone', key: 'phone', type: 'text' },
                { label: 'Nationality', key: 'nationality', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={infoForm[f.key as keyof typeof infoForm]}
                    onChange={e => setInfoForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              {[
                { label: 'Full Name', value: tenant.full_name },
                { label: 'Email', value: tenant.email },
                { label: 'Phone', value: tenant.phone },
                { label: 'Nationality', value: tenant.nationality },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 5px 0' }}>{f.label}</p>
                  <p style={{ color: f.value ? '#F5F5F5' : '#333', fontSize: '14px', margin: 0 }}>{f.value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Expiry */}
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px 24px', marginBottom: '20px' }}>
          <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 18px 0' }}>Document Expiry Dates</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <ExpiryField label="Passport Expiry" dateStr={tenant.passport_expiry} clientId={tenant.id} field="passport_expiry" onUpdate={updateField} />
            <ExpiryField label="Emirates ID Expiry" dateStr={tenant.emirates_id_expiry} clientId={tenant.id} field="emirates_id_expiry" onUpdate={updateField} />
          </div>
        </div>

        {/* Document Upload */}
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px 24px', marginBottom: '20px' }}>
          <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 18px 0' }}>Documents</p>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              style={{ padding: '7px 10px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '13px', cursor: 'pointer' }}
            >
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <label style={{
              padding: '7px 16px', backgroundColor: GOLD, color: '#fff',
              borderRadius: '6px', fontSize: '13px', fontWeight: '600',
              cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1,
            }}>
              {uploading ? 'Uploading...' : '+ Upload File'}
              <input type="file" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" />
            </label>
            <span style={{ color: '#333', fontSize: '12px' }}>PDF, JPG, PNG</span>
          </div>

          {uploadError && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{uploadError}</p>}

          {documents.length === 0 ? (
            <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No documents uploaded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', backgroundColor: '#080808',
                  borderRadius: '7px', border: `1px solid ${BORDER}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ padding: '2px 7px', backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '4px', color: GOLD, fontSize: '11px', fontWeight: '600' }}>
                      {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </span>
                    <span style={{ color: '#F5F5F5', fontSize: '13px' }}>{doc.file_name}</span>
                    <span style={{ color: '#333', fontSize: '12px' }}>{new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleDownload(doc)} style={{ padding: '4px 10px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '5px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>View</button>
                    <button onClick={() => handleDeleteDoc(doc)} style={{ padding: '4px 10px', backgroundColor: 'transparent', border: '1px solid #2d0f0f', borderRadius: '5px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pre-Tenancy Checks */}
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div>
              <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Pre-Tenancy Checks</p>
              <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>Al Etihad Credit Bureau (AECB) & background verification</p>
            </div>
            {savingChecks && <span style={{ color: '#444', fontSize: '11px' }}>Saving...</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            {[
              { field: 'aecb_check' as const, label: 'AECB Credit Check Done', desc: 'Al Etihad Credit Bureau report obtained and reviewed' },
              { field: 'employment_verified' as const, label: 'Employment Verified', desc: 'Employment letter or contract confirmed' },
              { field: 'previous_landlord_ref' as const, label: 'Previous Landlord Reference', desc: 'Reference from prior landlord obtained' },
              { field: 'salary_verified' as const, label: 'Salary / Income Verified', desc: 'Bank statements or salary certificate reviewed' },
            ].map(item => (
              <div
                key={item.field}
                onClick={() => toggleCheck(item.field)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: checks[item.field] ? '#0D1A0D' : '#080808', border: `1px solid ${checks[item.field] ? '#2a4a2a' : BORDER}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${checks[item.field] ? '#4ade80' : '#333'}`, background: checks[item.field] ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checks[item.field] && <span style={{ color: '#000', fontSize: '13px', fontWeight: '800', lineHeight: 1 }}>✓</span>}
                </div>
                <div>
                  <p style={{ color: checks[item.field] ? '#4ade80' : '#888', fontSize: '13.5px', fontWeight: '600', margin: '0 0 2px 0' }}>{item.label}</p>
                  <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Check Notes</p>
            <textarea
              value={checks.notes}
              onChange={e => setChecks(c => ({ ...c, notes: e.target.value }))}
              onBlur={() => saveChecks(checks)}
              rows={2}
              placeholder="e.g. AECB score: 720, employed at ADNOC since 2021..."
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <p style={{ color: '#333', fontSize: '11px', margin: '5px 0 0 0' }}>Auto-saves when you click away. Upload the AECB report in the Documents section above.</p>
          </div>
        </div>

        {/* Notes */}
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Notes</p>
            {!editingNotes ? (
              <button onClick={() => setEditingNotes(true)} style={{ padding: '5px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '5px', color: '#555', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setEditingNotes(false); setNotesValue(tenant.notes || '') }} style={{ padding: '5px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '5px', color: '#555', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveNotes} disabled={savingNotes} style={{ padding: '5px 12px', backgroundColor: GOLD, border: 'none', borderRadius: '5px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', opacity: savingNotes ? 0.6 : 1 }}>
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
              placeholder="Add notes about this tenant..."
              style={{ width: '100%', padding: '10px 12px', backgroundColor: '#080808', border: `1px solid ${GOLD}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          ) : (
            <p style={{ color: tenant.notes ? '#F5F5F5' : '#333', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
              {tenant.notes || 'No notes yet. Click Edit to add one.'}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
