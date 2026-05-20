'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const DARK = '#080808'
const CARD = '#0D0D0D'
const BORDER = '#1E1E1E'

type Handover = {
  id: string
  property_id: string
  tenant_id: string | null
  type: 'move_in' | 'move_out'
  status: 'in_progress' | 'completed'
  handover_date: string | null
  step_completed: number
  dewa_status: string
  dewa_account_number: string | null
  dewa_activation_date: string | null
  internet_provider: string | null
  internet_status: string
  internet_account_number: string | null
  keys_issued: number
  access_cards_issued: number
  keys_returned: number
  access_cards_returned: number
  security_company: string | null
  deposit_amount: number
  deposit_deductions: number
  deduction_notes: string | null
  notes: string | null
  condition_report_id: string | null
}

type Property = {
  id: string
  unit_number: string | null
  building_name: string | null
  area: string | null
}

type Tenant = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

const MOVE_IN_STEPS = [
  { id: 1, title: 'Handover Date',     icon: '📅' },
  { id: 2, title: 'Utilities',         icon: '⚡' },
  { id: 3, title: 'Keys & Access',     icon: '🔑' },
  { id: 4, title: 'Condition Report',  icon: '📋' },
  { id: 5, title: 'Complete',          icon: '✅' },
]

const MOVE_OUT_STEPS = [
  { id: 1, title: 'Move-Out Date',     icon: '📅' },
  { id: 2, title: 'Keys Returned',     icon: '🔑' },
  { id: 3, title: 'Condition Report',  icon: '📋' },
  { id: 4, title: 'Deposit',           icon: '💰' },
  { id: 5, title: 'Complete',          icon: '✅' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  backgroundColor: '#0A0A0A',
  border: `1px solid ${BORDER}`,
  borderRadius: '7px', color: '#F5F5F5',
  fontSize: '13.5px', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  color: '#666', fontSize: '11px', fontWeight: '600',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  display: 'block', marginBottom: '7px',
}

export default function HandoverWorkflowPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [handover, setHandover] = useState<Handover | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const [form, setForm] = useState({
    handover_date: '',
    dewa_status: 'pending',
    dewa_account_number: '',
    dewa_activation_date: '',
    internet_provider: '',
    internet_status: 'pending',
    internet_account_number: '',
    keys_issued: '0',
    access_cards_issued: '0',
    keys_returned: '0',
    access_cards_returned: '0',
    security_company: '',
    deposit_amount: '0',
    deposit_deductions: '0',
    deduction_notes: '',
    notes: '',
  })

  useEffect(() => {
    const fetchAll = async () => {
      const { data: h } = await supabase
        .from('handovers')
        .select('*')
        .eq('id', id)
        .single()
      if (!h) { router.push('/dashboard/properties'); return }
      setHandover(h)
      setCurrentStep(h.step_completed || 1)
      setForm({
        handover_date:          h.handover_date || '',
        dewa_status:            h.dewa_status || 'pending',
        dewa_account_number:    h.dewa_account_number || '',
        dewa_activation_date:   h.dewa_activation_date || '',
        internet_provider:      h.internet_provider || '',
        internet_status:        h.internet_status || 'pending',
        internet_account_number: h.internet_account_number || '',
        keys_issued:            String(h.keys_issued ?? 0),
        access_cards_issued:    String(h.access_cards_issued ?? 0),
        keys_returned:          String(h.keys_returned ?? 0),
        access_cards_returned:  String(h.access_cards_returned ?? 0),
        security_company:       h.security_company || '',
        deposit_amount:         String(h.deposit_amount ?? 0),
        deposit_deductions:     String(h.deposit_deductions ?? 0),
        deduction_notes:        h.deduction_notes || '',
        notes:                  h.notes || '',
      })

      const { data: p } = await supabase.from('properties').select('id, unit_number, building_name, area').eq('id', h.property_id).single()
      if (p) setProperty(p)

      if (h.tenant_id) {
        const { data: t } = await supabase.from('clients').select('id, full_name, email, phone').eq('id', h.tenant_id).single()
        if (t) setTenant(t)
      }

      setLoading(false)
    }
    fetchAll()
  }, [id])

  const saveStep = async (nextStep: number, complete = false) => {
    setSaving(true)
    const updates: Record<string, unknown> = {
      handover_date:          form.handover_date || null,
      dewa_status:            form.dewa_status,
      dewa_account_number:    form.dewa_account_number || null,
      dewa_activation_date:   form.dewa_activation_date || null,
      internet_provider:      form.internet_provider || null,
      internet_status:        form.internet_status,
      internet_account_number: form.internet_account_number || null,
      keys_issued:            parseInt(form.keys_issued) || 0,
      access_cards_issued:    parseInt(form.access_cards_issued) || 0,
      keys_returned:          parseInt(form.keys_returned) || 0,
      access_cards_returned:  parseInt(form.access_cards_returned) || 0,
      security_company:       form.security_company || null,
      deposit_amount:         parseFloat(form.deposit_amount) || 0,
      deposit_deductions:     parseFloat(form.deposit_deductions) || 0,
      deduction_notes:        form.deduction_notes || null,
      notes:                  form.notes || null,
      step_completed:         nextStep,
    }
    if (complete) updates.status = 'completed'

    await supabase.from('handovers').update(updates).eq('id', id)
    setSaving(false)
    if (complete) {
      router.push(`/dashboard/properties/${handover!.property_id}`)
    } else {
      setCurrentStep(nextStep)
    }
  }

  if (loading) return <div style={{ padding: '48px', color: '#444', fontSize: '14px', background: DARK, minHeight: '100vh' }}>Loading...</div>
  if (!handover) return null

  const isMovein = handover.type === 'move_in'
  const steps = isMovein ? MOVE_IN_STEPS : MOVE_OUT_STEPS
  const totalSteps = steps.length
  const propertyTitle = [property?.unit_number, property?.building_name].filter(Boolean).join(', ') || 'Property'

  const netDeposit = parseFloat(form.deposit_amount || '0') - parseFloat(form.deposit_deductions || '0')

  return (
    <div style={{ padding: '40px 48px', minHeight: '100vh', backgroundColor: DARK }}>

      {/* Back */}
      <button
        onClick={() => router.push(`/dashboard/properties/${handover.property_id}`)}
        style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '28px' }}
      >
        ← Back to Property
      </button>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <span style={{ fontSize: '22px' }}>{isMovein ? '🟢' : '🔴'}</span>
          <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '26px', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
            {isMovein ? 'Move-In Handover' : 'Move-Out Handover'}
          </h2>
        </div>
        <p style={{ color: '#555', fontSize: '13.5px', margin: 0 }}>
          {propertyTitle}{tenant ? ` · ${tenant.full_name}` : ''}
        </p>
      </div>

      {/* Step Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '40px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '20px 28px' }}>
        {steps.map((step, index) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: index < steps.length - 1 ? '1' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: currentStep > step.id ? GOLD : currentStep === step.id ? `${GOLD}22` : '#111',
                border: currentStep >= step.id ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: currentStep > step.id ? '14px' : '13px',
                color: currentStep > step.id ? '#000' : currentStep === step.id ? GOLD : '#444',
                fontWeight: '700',
              }}>
                {currentStep > step.id ? '✓' : step.icon}
              </div>
              <span style={{ fontSize: '10px', fontWeight: '600', color: currentStep === step.id ? GOLD : '#444', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div style={{ flex: 1, height: '1px', background: currentStep > step.id ? GOLD : BORDER, margin: '0 8px', marginBottom: '20px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ maxWidth: '600px' }}>

        {/* ── STEP 1: DATE ── */}
        {currentStep === 1 && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F5F5F5', marginBottom: '24px' }}>
              {isMovein ? 'When is the move-in?' : 'When is the move-out?'}
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>{isMovein ? 'Move-In Date' : 'Move-Out Date'}</label>
              <input
                type="date"
                value={form.handover_date}
                onChange={e => setForm(f => ({ ...f, handover_date: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {tenant && (
              <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 18px', marginTop: '20px' }}>
                <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', margin: '0 0 8px 0' }}>TENANT</p>
                <p style={{ color: '#F0F0F0', fontSize: '14px', fontWeight: '600', margin: '0 0 3px 0' }}>{tenant.full_name}</p>
                <p style={{ color: '#555', fontSize: '12.5px', margin: 0 }}>{[tenant.phone, tenant.email].filter(Boolean).join(' · ')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2 MOVE-IN: UTILITIES ── */}
        {currentStep === 2 && isMovein && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F5F5F5', marginBottom: '6px' }}>Utility Activation</h3>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>Track DEWA and internet setup for the new tenant.</p>

            {/* DEWA */}
            <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '24px', marginBottom: '24px' }}>
              <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 16px 0' }}>DEWA (ELECTRICITY & WATER)</p>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Status</label>
                <select value={form.dewa_status} onChange={e => setForm(f => ({ ...f, dewa_status: e.target.value }))} style={inputStyle}>
                  <option value="pending">Pending — not yet activated</option>
                  <option value="activated">Activated</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              </div>
              {form.dewa_status === 'activated' && (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>DEWA Account Number</label>
                    <input value={form.dewa_account_number} onChange={e => setForm(f => ({ ...f, dewa_account_number: e.target.value }))} placeholder="e.g. 1234567890" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Activation Date</label>
                    <input type="date" value={form.dewa_activation_date} onChange={e => setForm(f => ({ ...f, dewa_activation_date: e.target.value }))} style={inputStyle} />
                  </div>
                </>
              )}
            </div>

            {/* Internet */}
            <div>
              <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 16px 0' }}>INTERNET (DU / ETISALAT)</p>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Provider</label>
                <select value={form.internet_provider} onChange={e => setForm(f => ({ ...f, internet_provider: e.target.value }))} style={inputStyle}>
                  <option value="">— Select provider —</option>
                  <option value="du">du</option>
                  <option value="etisalat">Etisalat (e&)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Status</label>
                <select value={form.internet_status} onChange={e => setForm(f => ({ ...f, internet_status: e.target.value }))} style={inputStyle}>
                  <option value="pending">Pending — not yet activated</option>
                  <option value="activated">Activated</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              </div>
              {form.internet_status === 'activated' && (
                <div>
                  <label style={labelStyle}>Account Number</label>
                  <input value={form.internet_account_number} onChange={e => setForm(f => ({ ...f, internet_account_number: e.target.value }))} placeholder="Account or contract number" style={inputStyle} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2 MOVE-OUT: KEYS RETURNED ── */}
        {currentStep === 2 && !isMovein && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F5F5F5', marginBottom: '6px' }}>Keys & Access Cards Returned</h3>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>Record what the tenant handed back.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Keys Returned</label>
                <input type="number" min="0" value={form.keys_returned} onChange={e => setForm(f => ({ ...f, keys_returned: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Access Cards Returned</label>
                <input type="number" min="0" value={form.access_cards_returned} onChange={e => setForm(f => ({ ...f, access_cards_returned: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Security Company (if cards need deactivating)</label>
              <input value={form.security_company} onChange={e => setForm(f => ({ ...f, security_company: e.target.value }))} placeholder="e.g. G4S, Transguard" style={inputStyle} />
            </div>
          </div>
        )}

        {/* ── STEP 3 MOVE-IN: KEYS ISSUED ── */}
        {currentStep === 3 && isMovein && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F5F5F5', marginBottom: '6px' }}>Keys & Access Cards Issued</h3>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>Record what you handed to the tenant.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Keys Issued</label>
                <input type="number" min="0" value={form.keys_issued} onChange={e => setForm(f => ({ ...f, keys_issued: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Access Cards Issued</label>
                <input type="number" min="0" value={form.access_cards_issued} onChange={e => setForm(f => ({ ...f, access_cards_issued: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Security Company (for card reorders if lost)</label>
              <input value={form.security_company} onChange={e => setForm(f => ({ ...f, security_company: e.target.value }))} placeholder="e.g. G4S, Transguard" style={inputStyle} />
            </div>
          </div>
        )}

        {/* ── STEP 3 MOVE-OUT / STEP 4 MOVE-IN: CONDITION REPORT ── */}
        {((currentStep === 4 && isMovein) || (currentStep === 3 && !isMovein)) && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F5F5F5', marginBottom: '6px' }}>Condition Report</h3>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>
              A condition report (inspection) should be completed for this handover. You can create or view one in the Inspections section.
            </p>

            <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
              <p style={{ color: '#F0F0F0', fontSize: '14px', fontWeight: '600', margin: '0 0 6px 0' }}>Go to Inspections to complete the report</p>
              <p style={{ color: '#555', fontSize: '13px', margin: '0 0 16px 0' }}>
                Create a {isMovein ? 'Move-In' : 'Move-Out'} condition report from the Inspections page, then come back here to continue.
              </p>
              <button
                onClick={() => router.push('/dashboard/inspections')}
                style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, borderRadius: '7px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Open Inspections →
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="report-done"
                style={{ width: '16px', height: '16px', accentColor: GOLD }}
              />
              <label htmlFor="report-done" style={{ color: '#888', fontSize: '13.5px', cursor: 'pointer' }}>
                Condition report has been completed
              </label>
            </div>
          </div>
        )}

        {/* ── STEP 4 MOVE-OUT: DEPOSIT ── */}
        {currentStep === 4 && !isMovein && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F5F5F5', marginBottom: '6px' }}>Deposit Settlement</h3>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>Record the deposit amount and any deductions.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Deposit Amount (AED)</label>
                <input type="number" min="0" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} placeholder="e.g. 5000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Deductions (AED)</label>
                <input type="number" min="0" value={form.deposit_deductions} onChange={e => setForm(f => ({ ...f, deposit_deductions: e.target.value }))} placeholder="e.g. 800" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Reason for Deductions</label>
              <textarea
                value={form.deduction_notes}
                onChange={e => setForm(f => ({ ...f, deduction_notes: e.target.value }))}
                rows={3}
                placeholder="e.g. Broken kitchen cabinet, deep cleaning required..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {parseFloat(form.deposit_amount || '0') > 0 && (
              <div style={{ background: netDeposit >= 0 ? '#0D1F0D' : '#1F0D0D', border: `1px solid ${netDeposit >= 0 ? '#2a4a2a' : '#4a2a2a'}`, borderRadius: '8px', padding: '14px 18px' }}>
                <p style={{ color: '#555', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 4px 0' }}>REFUND TO TENANT</p>
                <p style={{ color: netDeposit >= 0 ? '#4ade80' : '#f87171', fontSize: '22px', fontWeight: '700', margin: 0 }}>
                  AED {netDeposit.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: COMPLETE ── */}
        {currentStep === 5 && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F5F5F5', marginBottom: '6px' }}>Final Sign-Off</h3>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '24px' }}>Add any final notes and complete the handover.</p>

            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="Any final notes about this handover..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Summary */}
            <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '20px 24px', marginBottom: '28px' }}>
              <p style={{ color: '#444', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 14px 0' }}>SUMMARY</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontSize: '12.5px' }}>Type</span>
                  <span style={{ color: '#F0F0F0', fontSize: '12.5px', fontWeight: '600' }}>{isMovein ? 'Move-In' : 'Move-Out'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontSize: '12.5px' }}>Property</span>
                  <span style={{ color: '#F0F0F0', fontSize: '12.5px' }}>{propertyTitle}</span>
                </div>
                {form.handover_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#555', fontSize: '12.5px' }}>Date</span>
                    <span style={{ color: '#F0F0F0', fontSize: '12.5px' }}>{new Date(form.handover_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                {isMovein && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#555', fontSize: '12.5px' }}>DEWA</span>
                      <span style={{ color: form.dewa_status === 'activated' ? '#4ade80' : '#888', fontSize: '12.5px', textTransform: 'capitalize' }}>{form.dewa_status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#555', fontSize: '12.5px' }}>Keys Issued</span>
                      <span style={{ color: '#F0F0F0', fontSize: '12.5px' }}>{form.keys_issued}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#555', fontSize: '12.5px' }}>Access Cards Issued</span>
                      <span style={{ color: '#F0F0F0', fontSize: '12.5px' }}>{form.access_cards_issued}</span>
                    </div>
                  </>
                )}
                {!isMovein && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#555', fontSize: '12.5px' }}>Keys Returned</span>
                      <span style={{ color: '#F0F0F0', fontSize: '12.5px' }}>{form.keys_returned}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#555', fontSize: '12.5px' }}>Deposit Refund</span>
                      <span style={{ color: netDeposit >= 0 ? '#4ade80' : '#f87171', fontSize: '12.5px', fontWeight: '700' }}>AED {netDeposit.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              style={{
                flex: 1, padding: '13px', background: 'transparent',
                border: `1px solid ${BORDER}`, color: '#888', borderRadius: '8px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              onClick={() => saveStep(currentStep + 1)}
              disabled={saving}
              style={{
                flex: 2, padding: '13px', background: GOLD,
                border: 'none', color: '#000', borderRadius: '8px',
                fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save & Continue →'}
            </button>
          ) : (
            <button
              onClick={() => saveStep(5, true)}
              disabled={saving}
              style={{
                flex: 2, padding: '13px', background: '#22c55e',
                border: 'none', color: '#fff', borderRadius: '8px',
                fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Completing…' : '✅ Complete Handover'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
