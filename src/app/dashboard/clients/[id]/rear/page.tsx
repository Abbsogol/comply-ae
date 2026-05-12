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
  status: string
  risk_level: string
  notes: string
  created_at: string
}

type REARFormData = {
  // Agency / Reporter Info
  agency_name: string
  agency_license: string
  rera_registration: string
  reporter_name: string
  reporter_email: string
  reporter_phone: string

  // Client Info (pre-filled)
  client_name: string
  client_nationality: string
  client_email: string
  client_phone: string
  client_passport: string
  client_dob: string
  client_address: string

  // Transaction Details
  property_address: string
  property_type: string
  transaction_type: string
  transaction_date: string
  transaction_value: string
  payment_method: string
  cash_amount: string

  // Grounds for Report
  report_reason: string
  additional_notes: string
}

export default function REARReportPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState<REARFormData>({
    agency_name: '',
    agency_license: '',
    rera_registration: '',
    reporter_name: '',
    reporter_email: '',
    reporter_phone: '',
    client_name: '',
    client_nationality: '',
    client_email: '',
    client_phone: '',
    client_passport: '',
    client_dob: '',
    client_address: '',
    property_address: '',
    property_type: '',
    transaction_type: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_value: '',
    payment_method: '',
    cash_amount: '',
    report_reason: '',
    additional_notes: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (data) {
        setClient(data)
        setForm(prev => ({
          ...prev,
          client_name: data.full_name || '',
          client_nationality: data.nationality || '',
          client_email: data.email || '',
          client_phone: data.phone || '',
        }))
      }
      setLoading(false)
    }
    init()
  }, [clientId, router])

  const update = (field: keyof REARFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
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
        doc.setFillColor(30, 30, 60)
        doc.rect(margin, y - 5, contentW, 10, 'F')
        addText(title, margin + 3, y + 2, 11, true, '#ffffff')
        y += 12
      }

      const addField = (label: string, value: string) => {
        if (y > 265) { doc.addPage(); y = 20 }
        addText(label + ':', margin, y, 9, true, '#444444')
        addText(value || '—', margin + 55, y, 9, false, '#000000')
        y += 7
      }

      const addDivider = () => {
        doc.setDrawColor(200, 200, 220)
        doc.setLineWidth(0.3)
        doc.line(margin, y, margin + contentW, y)
        y += 5
      }

      // Header
      doc.setFillColor(15, 15, 40)
      doc.rect(0, 0, pageW, 28, 'F')
      addText('REAL ESTATE ACTIVITY REPORT (REAR)', margin, 12, 16, true, '#ffffff')
      addText('UAE Financial Intelligence Unit — goAML Submission', margin, 20, 9, false, '#9999cc')
      addText('COMPLY.AE Compliance Platform', pageW - margin - 38, 20, 8, false, '#C9963F')
      y = 36

      // Report metadata
      addText(`Report Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y, 9, false, '#666666')
      addText(`Report Date: ${new Date().toLocaleDateString('en-GB')}`, margin + 90, y, 9, false, '#666666')
      y += 10

      // SECTION 1: Reporting Entity
      addSection('SECTION 1 — REPORTING ENTITY INFORMATION')
      addField('Agency Name', form.agency_name)
      addField('License No.', form.agency_license)
      addField('RERA Registration', form.rera_registration)
      addField('Reporter Name', form.reporter_name)
      addField('Reporter Email', form.reporter_email)
      addField('Reporter Phone', form.reporter_phone)
      addDivider()

      // SECTION 2: Client Information
      addSection('SECTION 2 — CLIENT / SUBJECT INFORMATION')
      addField('Full Name', form.client_name)
      addField('Nationality', form.client_nationality)
      addField('Email', form.client_email)
      addField('Phone', form.client_phone)
      addField('Passport / Emirates ID', form.client_passport)
      addField('Date of Birth', form.client_dob)
      addField('Address', form.client_address)
      addDivider()

      // SECTION 3: Transaction Details
      addSection('SECTION 3 — TRANSACTION / PROPERTY DETAILS')
      addField('Property Address', form.property_address)
      addField('Property Type', form.property_type)
      addField('Transaction Type', form.transaction_type)
      addField('Transaction Date', form.transaction_date)
      addField('Transaction Value (AED)', form.transaction_value ? `AED ${Number(form.transaction_value).toLocaleString()}` : '')
      addField('Payment Method', form.payment_method)
      addField('Cash Component (AED)', form.cash_amount ? `AED ${Number(form.cash_amount).toLocaleString()}` : '')
      addDivider()

      // SECTION 4: Grounds
      addSection('SECTION 4 — GROUNDS FOR REPORT')
      addField('Reason for Report', form.report_reason)
      y += 4
      if (form.additional_notes) {
        addText('Additional Notes:', margin, y, 9, true, '#444444')
        y += 6
        const lines = doc.splitTextToSize(form.additional_notes, contentW)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(lines, margin, y)
        y += lines.length * 6
      }
      addDivider()

      // Footer
      if (y > 250) { doc.addPage(); y = 20 }
      y += 5
      doc.setDrawColor(100, 100, 180)
      doc.setLineWidth(0.5)
      doc.line(margin, y, margin + contentW, y)
      y += 8
      addText('This report was generated by COMPLY.AE for goAML submission. The reporting entity is responsible for verifying all information.', margin, y, 8, false, '#888888')
      y += 6
      addText('Submission: goAML UAE Portal (goaml.eservices.gov.ae) | Legal basis: UAE Federal AML Law No. 20 of 2018', margin, y, 8, false, '#888888')

      const filename = `REAR_${form.client_name.replace(/\s+/g, '_')}_${form.transaction_date || new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
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

  const sectionBodyStyle = {
    padding: '24px',
    display: 'grid',
    gap: '16px',
  }

  const fieldGroupStyle = (cols = 2) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '16px',
  })

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
          <h2 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0' }}>
            REAR Report Generator
          </h2>
          <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>
            Real Estate Activity Report — UAE goAML Submission
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {saved && (
            <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>✓ PDF Downloaded</span>
          )}
          <button
            onClick={generatePDF}
            disabled={generating}
            style={{
              padding: '10px 20px',
              backgroundColor: '#C9963F',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: generating ? 'wait' : 'pointer',
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? 'Generating...' : '↓ Download REAR PDF'}
          </button>
        </div>
      </div>

      {/* Notice banner */}
      <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #C9963F44', borderRadius: '10px', padding: '14px 20px', marginBottom: '28px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '18px' }}>ℹ️</span>
        <div>
          <p style={{ color: '#C9963F', fontSize: '13px', fontWeight: '600', margin: '0 0 3px 0' }}>goAML Submission Required</p>
          <p style={{ color: '#8888aa', fontSize: '13px', margin: 0 }}>
            Complete all fields below. Download the PDF and submit manually at <span style={{ color: '#C9963F' }}>goaml.eservices.gov.ae</span>. Required for cash transactions ≥ AED 55,000.
          </p>
        </div>
      </div>

      {/* SECTION 1: Reporting Entity */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>
            Section 1 — Reporting Entity
          </h3>
          <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Your agency's details as registered with RERA/CBUAE</p>
        </div>
        <div style={sectionBodyStyle}>
          <div style={fieldGroupStyle(2)}>
            <div>
              <label style={labelStyle}>AGENCY NAME</label>
              <input style={inputStyle} value={form.agency_name} onChange={e => update('agency_name', e.target.value)} placeholder="e.g. Desert Star Real Estate" />
            </div>
            <div>
              <label style={labelStyle}>AGENCY LICENSE NO.</label>
              <input style={inputStyle} value={form.agency_license} onChange={e => update('agency_license', e.target.value)} placeholder="e.g. DED-123456" />
            </div>
          </div>
          <div style={fieldGroupStyle(3)}>
            <div>
              <label style={labelStyle}>RERA REGISTRATION NO.</label>
              <input style={inputStyle} value={form.rera_registration} onChange={e => update('rera_registration', e.target.value)} placeholder="RERA-XXXXX" />
            </div>
            <div>
              <label style={labelStyle}>REPORTER NAME</label>
              <input style={inputStyle} value={form.reporter_name} onChange={e => update('reporter_name', e.target.value)} placeholder="Full name of compliance officer" />
            </div>
            <div>
              <label style={labelStyle}>REPORTER PHONE</label>
              <input style={inputStyle} value={form.reporter_phone} onChange={e => update('reporter_phone', e.target.value)} placeholder="+971 XX XXX XXXX" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>REPORTER EMAIL</label>
            <input style={inputStyle} value={form.reporter_email} onChange={e => update('reporter_email', e.target.value)} placeholder="compliance@agency.ae" />
          </div>
        </div>
      </div>

      {/* SECTION 2: Client Information */}
      <div style={sectionStyle}>
        <div style={{ ...sectionHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>
              Section 2 — Client / Subject Information
            </h3>
            <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Pre-filled from client record — verify and complete missing fields</p>
          </div>
          <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: '#0D150D', color: '#4ade80' }}>AUTO-FILLED</span>
        </div>
        <div style={sectionBodyStyle}>
          <div style={fieldGroupStyle(2)}>
            <div>
              <label style={labelStyle}>FULL NAME</label>
              <input style={inputStyle} value={form.client_name} onChange={e => update('client_name', e.target.value)} placeholder="Client full name" />
            </div>
            <div>
              <label style={labelStyle}>NATIONALITY</label>
              <input style={inputStyle} value={form.client_nationality} onChange={e => update('client_nationality', e.target.value)} placeholder="Country of citizenship" />
            </div>
          </div>
          <div style={fieldGroupStyle(3)}>
            <div>
              <label style={labelStyle}>PASSPORT / EMIRATES ID NO.</label>
              <input style={inputStyle} value={form.client_passport} onChange={e => update('client_passport', e.target.value)} placeholder="Document number" />
            </div>
            <div>
              <label style={labelStyle}>DATE OF BIRTH</label>
              <input type="date" style={inputStyle} value={form.client_dob} onChange={e => update('client_dob', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>PHONE</label>
              <input style={inputStyle} value={form.client_phone} onChange={e => update('client_phone', e.target.value)} placeholder="+971 XX XXX XXXX" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input style={inputStyle} value={form.client_email} onChange={e => update('client_email', e.target.value)} placeholder="client@email.com" />
          </div>
          <div>
            <label style={labelStyle}>RESIDENTIAL ADDRESS</label>
            <input style={inputStyle} value={form.client_address} onChange={e => update('client_address', e.target.value)} placeholder="Full address including city and country" />
          </div>
        </div>
      </div>

      {/* SECTION 3: Transaction Details */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>
            Section 3 — Transaction & Property Details
          </h3>
          <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Details of the real estate transaction being reported</p>
        </div>
        <div style={sectionBodyStyle}>
          <div>
            <label style={labelStyle}>PROPERTY ADDRESS</label>
            <input style={inputStyle} value={form.property_address} onChange={e => update('property_address', e.target.value)} placeholder="Unit/Villa number, Building, Community, Dubai" />
          </div>
          <div style={fieldGroupStyle(2)}>
            <div>
              <label style={labelStyle}>PROPERTY TYPE</label>
              <select style={inputStyle} value={form.property_type} onChange={e => update('property_type', e.target.value)}>
                <option value="">Select type...</option>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Commercial Unit">Commercial Unit</option>
                <option value="Land">Land</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Hotel Apartment">Hotel Apartment</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>TRANSACTION TYPE</label>
              <select style={inputStyle} value={form.transaction_type} onChange={e => update('transaction_type', e.target.value)}>
                <option value="">Select type...</option>
                <option value="Purchase">Purchase</option>
                <option value="Sale">Sale</option>
                <option value="Lease">Lease</option>
                <option value="Rental">Rental</option>
                <option value="Mortgage">Mortgage</option>
                <option value="Transfer">Transfer</option>
                <option value="Gift">Gift</option>
              </select>
            </div>
          </div>
          <div style={fieldGroupStyle(3)}>
            <div>
              <label style={labelStyle}>TRANSACTION DATE</label>
              <input type="date" style={inputStyle} value={form.transaction_date} onChange={e => update('transaction_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>TOTAL TRANSACTION VALUE (AED)</label>
              <input type="number" style={inputStyle} value={form.transaction_value} onChange={e => update('transaction_value', e.target.value)} placeholder="e.g. 2500000" />
            </div>
            <div>
              <label style={labelStyle}>PAYMENT METHOD</label>
              <select style={inputStyle} value={form.payment_method} onChange={e => update('payment_method', e.target.value)}>
                <option value="">Select method...</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Manager's Cheque">Manager's Cheque</option>
                <option value="Cryptocurrency">Cryptocurrency</option>
                <option value="Multiple Methods">Multiple Methods</option>
              </select>
            </div>
          </div>
          <div style={{ backgroundColor: '#130d1a', border: '1px solid #C9963F44', borderRadius: '8px', padding: '16px' }}>
            <label style={{ ...labelStyle, color: '#C9963F' }}>CASH COMPONENT (AED) — Required if cash involved</label>
            <input
              type="number"
              style={{ ...inputStyle, borderColor: '#C9963F44' }}
              value={form.cash_amount}
              onChange={e => update('cash_amount', e.target.value)}
              placeholder="Amount paid in cash (trigger: ≥ AED 55,000)"
            />
            {form.cash_amount && Number(form.cash_amount) >= 55000 && (
              <p style={{ color: '#f87171', fontSize: '12px', margin: '8px 0 0 0', fontWeight: '600' }}>
                ⚠️ Cash amount exceeds AED 55,000 — REAR report submission is legally required
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: Grounds for Report */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>
            Section 4 — Grounds for Report
          </h3>
          <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Explain why this transaction is being reported</p>
        </div>
        <div style={sectionBodyStyle}>
          <div>
            <label style={labelStyle}>PRIMARY REASON FOR REPORT</label>
            <select style={inputStyle} value={form.report_reason} onChange={e => update('report_reason', e.target.value)}>
              <option value="">Select reason...</option>
              <option value="Cash transaction ≥ AED 55,000">Cash transaction ≥ AED 55,000 (mandatory REAR)</option>
              <option value="Suspicious source of funds">Suspicious source of funds</option>
              <option value="PEP / politically exposed person">Client is a PEP or connected to a PEP</option>
              <option value="High-risk nationality">High-risk nationality (FATF grey/black list country)</option>
              <option value="Third-party payment">Third-party payment with no clear relationship</option>
              <option value="Unusual transaction pattern">Unusual transaction pattern or structure</option>
              <option value="Inconsistent with client profile">Inconsistent with stated client profile or wealth</option>
              <option value="Other">Other (explain below)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>ADDITIONAL NOTES / NARRATIVE</label>
            <textarea
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' as const }}
              value={form.additional_notes}
              onChange={e => update('additional_notes', e.target.value)}
              placeholder="Provide any additional details, observations, or context relevant to this report..."
            />
          </div>
        </div>
      </div>

      {/* Bottom download button */}
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
          style={{
            padding: '10px 24px',
            backgroundColor: '#C9963F',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '700',
            cursor: generating ? 'wait' : 'pointer',
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? 'Generating PDF...' : '↓ Download REAR Report PDF'}
        </button>
      </div>
    </div>
  )
}
