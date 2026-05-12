'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  full_name: string
  nationality: string
  email: string
  phone: string
  risk_level: string
  source_of_funds: string
}

type STRRecord = {
  id: string
  created_at: string
  filed_by: string
  transaction_date: string
  transaction_value: number
  red_flags: string[]
  narrative: string
  action_taken: string
  status: string
}

const redFlagOptions = [
  { id: 'cash_payment', label: 'Unusual or excessive cash payments', category: 'Transaction' },
  { id: 'structuring', label: 'Multiple cash transactions below AED 55,000 threshold (structuring)', category: 'Transaction' },
  { id: 'third_party', label: 'Payment made by unrelated third party with no clear reason', category: 'Transaction' },
  { id: 'over_under_value', label: 'Property priced significantly above or below market value', category: 'Transaction' },
  { id: 'rapid_resale', label: 'Client intends to resell property immediately at a loss', category: 'Transaction' },
  { id: 'refuses_id', label: 'Client reluctant or refuses to provide identity documents', category: 'Client Behaviour' },
  { id: 'inconsistent_funds', label: 'Source of funds is inconsistent with client\'s stated occupation or wealth', category: 'Client Behaviour' },
  { id: 'urgency', label: 'Unusual urgency to complete transaction without clear reason', category: 'Client Behaviour' },
  { id: 'pep_connection', label: 'Client is a PEP or closely connected to a politically exposed person', category: 'Client Profile' },
  { id: 'sanctions_flag', label: 'Client name matches or is close to a sanctions or watchlist entry', category: 'Client Profile' },
  { id: 'high_risk_country', label: 'Funds originate from a FATF grey/black listed or high-risk jurisdiction', category: 'Client Profile' },
  { id: 'complex_structure', label: 'Complex or opaque ownership structure (offshore company, nominee, trust)', category: 'Ownership' },
  { id: 'multiple_entities', label: 'Multiple legal entities involved with no clear commercial rationale', category: 'Ownership' },
  { id: 'no_business_purpose', label: 'Transaction lacks a clear legitimate business or personal purpose', category: 'General' },
  { id: 'inconsistent_info', label: 'Client provides inconsistent or changing information during the process', category: 'General' },
  { id: 'other', label: 'Other suspicious indicator (describe in narrative below)', category: 'General' },
]

const categories = ['Transaction', 'Client Behaviour', 'Client Profile', 'Ownership', 'General']

type STRForm = {
  agency_name: string
  agency_license: string
  reporter_name: string
  reporter_email: string
  reporter_phone: string
  client_name: string
  client_nationality: string
  client_email: string
  client_phone: string
  client_passport: string
  transaction_date: string
  transaction_value: string
  property_address: string
  transaction_type: string
  narrative: string
  action_taken: string
}

export default function STRBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedFlags, setSelectedFlags] = useState<string[]>([])
  const [pastSTRs, setPastSTRs] = useState<STRRecord[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState<STRForm>({
    agency_name: '',
    agency_license: '',
    reporter_name: '',
    reporter_email: '',
    reporter_phone: '',
    client_name: '',
    client_nationality: '',
    client_email: '',
    client_phone: '',
    client_passport: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_value: '',
    property_address: '',
    transaction_type: '',
    narrative: '',
    action_taken: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserEmail(user.email || '')

      const { data: clientData } = await supabase.from('clients').select('*').eq('id', clientId).single()
      if (clientData) {
        setClient(clientData)
        setForm(prev => ({
          ...prev,
          client_name: clientData.full_name || '',
          client_nationality: clientData.nationality || '',
          client_email: clientData.email || '',
          client_phone: clientData.phone || '',
        }))
      }

      const { data: strs } = await supabase
        .from('str_reports')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      setPastSTRs(strs || [])

      setLoading(false)
    }
    init()
  }, [clientId, router])

  const update = (field: keyof STRForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleFlag = (id: string) => {
    setSelectedFlags(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const saveSTR = async () => {
    if (!client) return
    setSaving(true)
    const { error } = await supabase.from('str_reports').insert([{
      client_id: client.id,
      filed_by: currentUserEmail,
      transaction_date: form.transaction_date || null,
      transaction_value: form.transaction_value ? Number(form.transaction_value) : null,
      red_flags: selectedFlags,
      narrative: form.narrative,
      action_taken: form.action_taken,
      status: 'filed',
    }])
    if (!error) {
      const { data } = await supabase.from('str_reports').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
      setPastSTRs(data || [])
    }
    setSaving(false)
  }

  const generatePDF = async () => {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW = 210
      const margin = 20
      const contentW = pageW - margin * 2
      let y = 20

      const addText = (text: string, x: number, yPos: number, size = 10, bold = false, color = '#000000') => {
        doc.setFontSize(size)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        const r = parseInt(color.slice(1, 3), 16)
        const g = parseInt(color.slice(3, 5), 16)
        const b = parseInt(color.slice(5, 7), 16)
        doc.setTextColor(r, g, b)
        doc.text(text, x, yPos)
      }

      const addSection = (title: string) => {
        if (y > 250) { doc.addPage(); y = 20 }
        doc.setFillColor(80, 20, 20)
        doc.rect(margin, y - 5, contentW, 10, 'F')
        addText(title, margin + 3, y + 2, 11, true, '#ffffff')
        y += 12
      }

      const addField = (label: string, value: string) => {
        if (y > 265) { doc.addPage(); y = 20 }
        addText(label + ':', margin, y, 9, true, '#444444')
        addText(value || '—', margin + 60, y, 9, false, '#000000')
        y += 7
      }

      const addDivider = () => {
        doc.setDrawColor(200, 180, 180)
        doc.setLineWidth(0.3)
        doc.line(margin, y, margin + contentW, y)
        y += 5
      }

      // Header — red banner for STR
      doc.setFillColor(100, 15, 15)
      doc.rect(0, 0, pageW, 28, 'F')
      addText('SUSPICIOUS TRANSACTION REPORT (STR)', margin, 12, 15, true, '#ffffff')
      addText('UAE Financial Intelligence Unit — goAML Submission — CONFIDENTIAL', margin, 20, 9, false, '#ffaaaa')
      addText('COMPLY.AE', pageW - margin - 20, 20, 8, false, '#ffaaaa')
      y = 36

      addText(`Report Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y, 9, false, '#666666')
      addText('CONFIDENTIAL — NOT FOR DISCLOSURE', pageW - margin - 60, y, 9, true, '#cc0000')
      y += 12

      // Tipping-off warning
      doc.setFillColor(255, 245, 245)
      doc.rect(margin, y - 4, contentW, 14, 'F')
      doc.setDrawColor(200, 100, 100)
      doc.rect(margin, y - 4, contentW, 14, 'S')
      addText('WARNING: Tipping-off is a criminal offence under UAE AML Law. Do not inform the subject that this report has been filed.', margin + 3, y + 2, 8, true, '#cc0000')
      y += 16

      // Section 1
      addSection('SECTION 1 — REPORTING ENTITY')
      addField('Agency Name', form.agency_name)
      addField('License No.', form.agency_license)
      addField('Reporter Name', form.reporter_name)
      addField('Reporter Email', form.reporter_email)
      addField('Reporter Phone', form.reporter_phone)
      addDivider()

      // Section 2
      addSection('SECTION 2 — SUBJECT INFORMATION')
      addField('Full Name', form.client_name)
      addField('Nationality', form.client_nationality)
      addField('Passport / Emirates ID', form.client_passport)
      addField('Email', form.client_email)
      addField('Phone', form.client_phone)
      addDivider()

      // Section 3
      addSection('SECTION 3 — TRANSACTION DETAILS')
      addField('Property Address', form.property_address)
      addField('Transaction Type', form.transaction_type)
      addField('Transaction Date', form.transaction_date)
      addField('Transaction Value', form.transaction_value ? `AED ${Number(form.transaction_value).toLocaleString()}` : '')
      addDivider()

      // Section 4 — Red Flags
      addSection('SECTION 4 — SUSPICIOUS ACTIVITY INDICATORS')
      if (selectedFlags.length === 0) {
        addText('No red flags selected.', margin, y, 9, false, '#666666')
        y += 8
      } else {
        selectedFlags.forEach(flagId => {
          const flag = redFlagOptions.find(f => f.id === flagId)
          if (!flag) return
          if (y > 265) { doc.addPage(); y = 20 }
          doc.setFillColor(180, 40, 40)
          doc.rect(margin + 2, y - 3.5, 4, 4, 'F')
          addText(flag.label, margin + 9, y, 9, false, '#222222')
          y += 7
        })
      }
      addDivider()

      // Section 5 — Narrative
      addSection('SECTION 5 — NARRATIVE & GROUNDS FOR SUSPICION')
      if (form.narrative) {
        const lines = doc.splitTextToSize(form.narrative, contentW)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(lines, margin, y)
        y += lines.length * 6 + 4
      } else {
        addText('No narrative provided.', margin, y, 9, false, '#666666')
        y += 8
      }
      addDivider()

      // Section 6 — Action taken
      addSection('SECTION 6 — ACTION TAKEN')
      if (form.action_taken) {
        const lines = doc.splitTextToSize(form.action_taken, contentW)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(lines, margin, y)
        y += lines.length * 6 + 4
      } else {
        addText('No action recorded.', margin, y, 9, false, '#666666')
        y += 8
      }
      addDivider()

      // Footer
      if (y > 255) { doc.addPage(); y = 20 }
      y += 4
      doc.setDrawColor(150, 80, 80)
      doc.setLineWidth(0.5)
      doc.line(margin, y, margin + contentW, y)
      y += 7
      addText('This STR was generated by COMPLY.AE. Submit via the goAML UAE Portal (goaml.eservices.gov.ae).', margin, y, 8, false, '#888888')
      y += 5
      addText('Legal basis: UAE Federal Decree-Law No. 20 of 2018 on AML/CFT. Failure to report is a criminal offence.', margin, y, 8, false, '#888888')

      const filename = `STR_${form.client_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      // Also save to DB
      await saveSTR()
    } catch (err) {
      console.error(err)
    }
    setGenerating(false)
  }

  if (loading) return <div style={{ padding: '40px 32px' }}><p style={{ color: '#8888aa' }}>Loading...</p></div>

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    backgroundColor: '#080808',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    color: '#8888aa',
    fontSize: '12px',
    fontWeight: '600' as const,
    letterSpacing: '0.04em',
    marginBottom: '5px',
    display: 'block' as const,
  }

  const sectionStyle = {
    backgroundColor: '#0D0D0D',
    border: '1px solid #1E1E1E',
    borderRadius: '12px',
    marginBottom: '20px',
    overflow: 'hidden',
  }

  const sectionHeaderStyle = {
    backgroundColor: '#0D0D07',
    padding: '14px 24px',
    borderBottom: '1px solid #1E1E1E',
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <button
            onClick={() => router.push(`/dashboard/clients/${clientId}`)}
            style={{ background: 'none', border: 'none', color: '#C9963F', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '8px' }}
          >
            ← Back to {client?.full_name}
          </button>
          <h2 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0' }}>STR Builder</h2>
          <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>Suspicious Transaction Report — UAE goAML Submission</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {saved && <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>✓ PDF Downloaded & Saved</span>}
          <button
            onClick={generatePDF}
            disabled={generating}
            style={{ padding: '10px 20px', backgroundColor: '#dc2626', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.7 : 1 }}
          >
            {generating ? 'Generating...' : '↓ Download STR PDF'}
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ backgroundColor: '#2d0f0f', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '14px 20px', marginBottom: '28px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '18px' }}>⚠️</span>
        <div>
          <p style={{ color: '#f87171', fontSize: '13px', fontWeight: '700', margin: '0 0 3px 0' }}>Tipping-Off Warning — Confidential Document</p>
          <p style={{ color: '#8888aa', fontSize: '13px', margin: 0 }}>
            Do NOT inform the client or any connected party that this STR is being filed. Tipping-off is a criminal offence under UAE AML Law No. 20 of 2018.
          </p>
        </div>
      </div>

      {/* Section 1: Reporting Entity */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Section 1 — Reporting Entity</h3>
        </div>
        <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div><label style={labelStyle}>AGENCY NAME</label><input style={inputStyle} value={form.agency_name} onChange={e => update('agency_name', e.target.value)} placeholder="Your agency name" /></div>
            <div><label style={labelStyle}>LICENSE NO.</label><input style={inputStyle} value={form.agency_license} onChange={e => update('agency_license', e.target.value)} placeholder="DED-XXXXXX" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div><label style={labelStyle}>REPORTER NAME</label><input style={inputStyle} value={form.reporter_name} onChange={e => update('reporter_name', e.target.value)} placeholder="Compliance officer" /></div>
            <div><label style={labelStyle}>REPORTER EMAIL</label><input style={inputStyle} value={form.reporter_email} onChange={e => update('reporter_email', e.target.value)} placeholder="compliance@agency.ae" /></div>
            <div><label style={labelStyle}>REPORTER PHONE</label><input style={inputStyle} value={form.reporter_phone} onChange={e => update('reporter_phone', e.target.value)} placeholder="+971 XX XXX XXXX" /></div>
          </div>
        </div>
      </div>

      {/* Section 2: Subject */}
      <div style={sectionStyle}>
        <div style={{ ...sectionHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Section 2 — Subject Information</h3>
          <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: '#0D150D', color: '#4ade80' }}>AUTO-FILLED</span>
        </div>
        <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div><label style={labelStyle}>FULL NAME</label><input style={inputStyle} value={form.client_name} onChange={e => update('client_name', e.target.value)} /></div>
            <div><label style={labelStyle}>NATIONALITY</label><input style={inputStyle} value={form.client_nationality} onChange={e => update('client_nationality', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div><label style={labelStyle}>PASSPORT / EMIRATES ID</label><input style={inputStyle} value={form.client_passport} onChange={e => update('client_passport', e.target.value)} placeholder="Document number" /></div>
            <div><label style={labelStyle}>EMAIL</label><input style={inputStyle} value={form.client_email} onChange={e => update('client_email', e.target.value)} /></div>
            <div><label style={labelStyle}>PHONE</label><input style={inputStyle} value={form.client_phone} onChange={e => update('client_phone', e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* Section 3: Transaction */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Section 3 — Transaction Details</h3>
        </div>
        <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
          <div><label style={labelStyle}>PROPERTY ADDRESS</label><input style={inputStyle} value={form.property_address} onChange={e => update('property_address', e.target.value)} placeholder="Unit/Villa, Building, Community, Dubai" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>TRANSACTION TYPE</label>
              <select style={inputStyle} value={form.transaction_type} onChange={e => update('transaction_type', e.target.value)}>
                <option value="">Select...</option>
                <option>Purchase</option><option>Sale</option><option>Lease</option>
                <option>Rental</option><option>Transfer</option><option>Gift</option>
              </select>
            </div>
            <div><label style={labelStyle}>TRANSACTION DATE</label><input type="date" style={inputStyle} value={form.transaction_date} onChange={e => update('transaction_date', e.target.value)} /></div>
            <div><label style={labelStyle}>TRANSACTION VALUE (AED)</label><input type="number" style={inputStyle} value={form.transaction_value} onChange={e => update('transaction_value', e.target.value)} placeholder="e.g. 2500000" /></div>
          </div>
        </div>
      </div>

      {/* Section 4: Red Flags */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Section 4 — Suspicious Activity Indicators</h3>
          <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Select all red flags that apply — {selectedFlags.length} selected</p>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {categories.map(cat => (
            <div key={cat}>
              <p style={{ color: '#C9963F', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 10px 0' }}>{cat.toUpperCase()}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {redFlagOptions.filter(f => f.category === cat).map(flag => {
                  const isSelected = selectedFlags.includes(flag.id)
                  return (
                    <button
                      key={flag.id}
                      onClick={() => toggleFlag(flag.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px',
                        backgroundColor: isSelected ? '#2d0f0f' : '#080808',
                        border: `1px solid ${isSelected ? '#7f1d1d' : '#1E1E1E'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: isSelected ? '#dc2626' : 'transparent', border: `2px solid ${isSelected ? '#dc2626' : '#1E1E1E'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected && <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: '900' }}>✓</span>}
                      </div>
                      <span style={{ color: isSelected ? '#fca5a5' : '#ccccdd', fontSize: '13px' }}>{flag.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Narrative */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Section 5 — Narrative & Grounds for Suspicion</h3>
          <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Describe in detail why this transaction is suspicious</p>
        </div>
        <div style={{ padding: '24px' }}>
          <textarea
            value={form.narrative}
            onChange={e => update('narrative', e.target.value)}
            rows={6}
            placeholder="Describe the suspicious activity in detail. Include: what happened, when it was noticed, what made it suspicious, any inconsistencies in client behaviour or documentation, and any other relevant observations..."
            style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' as const, lineHeight: '1.6' }}
          />
        </div>
      </div>

      {/* Section 6: Action Taken */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Section 6 — Action Taken</h3>
          <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>What has your agency done in response?</p>
        </div>
        <div style={{ padding: '24px' }}>
          <select
            style={{ ...inputStyle, marginBottom: '12px' }}
            value={form.action_taken}
            onChange={e => update('action_taken', e.target.value)}
          >
            <option value="">Select action taken...</option>
            <option value="Transaction halted pending review">Transaction halted pending review</option>
            <option value="Transaction completed — STR filed post-transaction">Transaction completed — STR filed post-transaction</option>
            <option value="Client relationship terminated">Client relationship terminated</option>
            <option value="Matter escalated to senior management">Matter escalated to senior management</option>
            <option value="Additional due diligence requested from client">Additional due diligence requested from client</option>
            <option value="Referred to legal counsel">Referred to legal counsel</option>
            <option value="Other — see narrative">Other — see narrative</option>
          </select>
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
        <button
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '8px', color: '#8888aa', fontSize: '14px', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={generatePDF}
          disabled={generating}
          style={{ padding: '10px 24px', backgroundColor: '#dc2626', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '700', cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.7 : 1 }}
        >
          {generating ? 'Generating...' : '↓ Download STR PDF & Save Record'}
        </button>
      </div>

      {/* Past STRs */}
      {pastSTRs.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>PREVIOUSLY FILED STRs</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pastSTRs.map(str => (
              <div key={str.id} style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                      STR filed — {str.red_flags?.length || 0} red flag{str.red_flags?.length !== 1 ? 's' : ''}
                      {str.transaction_value ? ` · AED ${Number(str.transaction_value).toLocaleString()}` : ''}
                    </p>
                    <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>
                      Filed by {str.filed_by} · {new Date(str.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {str.action_taken && <p style={{ color: '#8888aa', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>{str.action_taken}</p>}
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: '#2d0f0f', color: '#f87171', border: '1px solid #7f1d1d', flexShrink: 0, marginLeft: '16px' }}>
                    FILED
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
