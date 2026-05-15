'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Payment = {
  id: string
  created_at: string
  period_label: string | null
  due_date: string | null
  payment_date: string | null
  expected_amount: number | null
  paid_amount: number | null
  status: string
  payment_method: string | null
  cheque_number: string | null
  reference_number: string | null
  notes: string | null
  property_id: string | null
  tenant_id: string | null
  properties: { unit_number: string; building_name: string | null } | null
  clients: { full_name: string } | null
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  paid:        { color: '#4ade80', bg: '#052e16',   label: 'PAID' },
  outstanding: { color: '#60a5fa', bg: '#0a1628',   label: 'OUTSTANDING' },
  late:        { color: '#ef4444', bg: '#1c0000',   label: 'LATE' },
  partial:     { color: GOLD,      bg: `${GOLD}18`, label: 'PARTIAL' },
}

const STATUSES = [
  { value: 'paid',        label: 'Paid',        color: '#4ade80' },
  { value: 'outstanding', label: 'Outstanding',  color: '#60a5fa' },
  { value: 'late',        label: 'Late',         color: '#ef4444' },
  { value: 'partial',     label: 'Partial',      color: GOLD },
]

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  cash:          'Cash',
  cheque:        'Cheque',
  online:        'Online',
}

const METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'cash',          label: 'Cash' },
  { value: 'online',        label: 'Online' },
]

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 5px 0' }}>{children}</p>
}

function Value({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#F5F5F5', fontSize: '14px', margin: 0 }}>{children}</p>
}

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function getPeriodOptions() {
  const options = []
  const now = new Date()
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    options.push(d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))
  }
  return options.reverse()
}

export default function RentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Mark as paid panel
  const [newStatus, setNewStatus]           = useState('')
  const [newPaidAmount, setNewPaidAmount]   = useState('')
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [newMethod, setNewMethod]           = useState('bank_transfer')
  const [newCheque, setNewCheque]           = useState('')
  const [newRef, setNewRef]                 = useState('')

  // Edit details
  const [editingDetails, setEditingDetails] = useState(false)
  const [editPeriod, setEditPeriod]         = useState('')
  const [editExpected, setEditExpected]     = useState('')
  const [editDueDate, setEditDueDate]       = useState('')

  // Notes
  const [editingNotes, setEditingNotes] = useState(false)
  const [newNotes, setNewNotes]         = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('rent_payments')
        .select('*, properties(unit_number, building_name), clients(full_name)')
        .eq('id', id)
        .single()

      if (!data) { router.push('/dashboard/rent'); return }
      setPayment(data)
      setNewStatus(data.status)
      setNewPaidAmount(data.paid_amount?.toString() || data.expected_amount?.toString() || '')
      setNewPaymentDate(data.payment_date || new Date().toISOString().split('T')[0])
      setNewMethod(data.payment_method || 'bank_transfer')
      setNewCheque(data.cheque_number || '')
      setNewRef(data.reference_number || '')
      setNewNotes(data.notes || '')
      setEditPeriod(data.period_label || '')
      setEditExpected(data.expected_amount?.toString() || '')
      setEditDueDate(data.due_date || '')
      setLoading(false)
    }
    load()
  }, [id, router])

  const saveStatus = async () => {
    setSaving(true)
    const updates: Record<string, unknown> = {
      status:       newStatus,
      payment_date: (newStatus === 'paid' || newStatus === 'partial' || newStatus === 'late') ? newPaymentDate : null,
      paid_amount:  newPaidAmount ? parseFloat(newPaidAmount) : null,
      payment_method: (newStatus === 'paid' || newStatus === 'partial' || newStatus === 'late') ? newMethod : null,
      cheque_number:    newMethod === 'cheque' ? newCheque : null,
      reference_number: newMethod !== 'cheque' ? newRef : null,
    }
    const { error } = await supabase.from('rent_payments').update(updates).eq('id', id)
    if (!error && payment) setPayment({ ...payment, ...updates } as Payment)
    setSaving(false)
  }

  const saveNotes = async () => {
    setSaving(true)
    const { error } = await supabase.from('rent_payments').update({ notes: newNotes.trim() || null }).eq('id', id)
    if (!error && payment) setPayment({ ...payment, notes: newNotes.trim() || null })
    setSaving(false)
    setEditingNotes(false)
  }

  const saveDetails = async () => {
    if (!editExpected) { alert('Expected amount is required.'); return }
    setSaving(true)
    const updates = {
      period_label:    editPeriod || null,
      expected_amount: parseFloat(editExpected),
      due_date:        editDueDate || null,
    }
    const { error } = await supabase.from('rent_payments').update(updates).eq('id', id)
    if (!error && payment) setPayment({ ...payment, ...updates })
    setSaving(false)
    setEditingDetails(false)
  }

  const inputStyle = {
    padding: '8px 10px', backgroundColor: '#080808',
    border: `1px solid ${BORDER}`, borderRadius: '6px',
    color: '#F5F5F5', fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
  }

  if (loading) return <div style={{ padding: '40px 32px', color: '#444' }}>Loading...</div>
  if (!payment) return null

  const st = STATUS_STYLES[payment.status] || STATUS_STYLES.outstanding
  const propName = payment.properties
    ? `${payment.properties.unit_number}${payment.properties.building_name ? ', ' + payment.properties.building_name : ''}`
    : null

  const balance = (payment.expected_amount || 0) - (payment.paid_amount || 0)
  const isPaidStatus = newStatus === 'paid' || newStatus === 'partial' || newStatus === 'late'

  return (
    <div style={{ padding: '40px 32px', maxWidth: '860px' }}>

      <button onClick={() => router.push('/dashboard/rent')}
        style={{ background: 'none', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '20px' }}>
        ← Back to Rent
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h2 style={{ color: '#F5F5F5', fontSize: '24px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              {payment.period_label || 'Rent Payment'}
            </h2>
            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: st.bg, color: st.color }}>
              {st.label}
            </span>
          </div>
          {propName && <p style={{ color: GOLD, fontSize: '14px', margin: '0 0 2px 0' }}>{propName}</p>}
          {payment.clients && <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>{payment.clients.full_name}</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>

        {/* Left */}
        <div>
          {/* Details */}
          <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Payment Details</p>
              {!editingDetails && (
                <button onClick={() => setEditingDetails(true)}
                  style={{ background: 'none', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
              )}
            </div>

            {editingDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <Label>Period</Label>
                  <select value={editPeriod} onChange={e => setEditPeriod(e.target.value)} style={inputStyle}>
                    <option value="">— Select period —</option>
                    {getPeriodOptions().map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Expected Amount (AED) *</Label>
                  <input type="number" value={editExpected} onChange={e => setEditExpected(e.target.value)}
                    placeholder="e.g. 7500" style={inputStyle} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={saveDetails} disabled={saving}
                    style={{ padding: '8px 16px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditingDetails(false)}
                    style={{ padding: '8px 12px', backgroundColor: 'transparent', color: '#555', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <Label>Expected Amount</Label>
                  <p style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    {payment.expected_amount ? `AED ${payment.expected_amount.toLocaleString()}` : '—'}
                  </p>
                </div>
                <div>
                  <Label>Amount Paid</Label>
                  <p style={{ color: payment.paid_amount ? '#4ade80' : '#333', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    {payment.paid_amount ? `AED ${payment.paid_amount.toLocaleString()}` : '—'}
                  </p>
                </div>
                {balance > 0 && payment.status !== 'paid' && (
                  <div>
                    <Label>Outstanding Balance</Label>
                    <p style={{ color: '#ef4444', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                      AED {balance.toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <Label>Due Date</Label>
                  <Value>{fmtDate(payment.due_date)}</Value>
                </div>
                <div>
                  <Label>Payment Date</Label>
                  <Value>{fmtDate(payment.payment_date)}</Value>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Value>{METHOD_LABELS[payment.payment_method || ''] || payment.payment_method || '—'}</Value>
                </div>
                {(payment.cheque_number || payment.reference_number) && (
                  <div>
                    <Label>{payment.cheque_number ? 'Cheque Number' : 'Reference'}</Label>
                    <Value>{payment.cheque_number || payment.reference_number}</Value>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Notes</p>
              {!editingNotes && (
                <button onClick={() => setEditingNotes(true)}
                  style={{ background: 'none', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)}
                  rows={3} placeholder="Add notes..."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={saveNotes} disabled={saving}
                    style={{ padding: '8px 16px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    Save
                  </button>
                  <button onClick={() => setEditingNotes(false)}
                    style={{ padding: '8px 12px', backgroundColor: 'transparent', color: '#555', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: payment.notes ? '#888' : '#333', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                {payment.notes || 'No notes.'}
              </p>
            )}
          </div>
        </div>

        {/* Right — update status */}
        <div>
          <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px' }}>
            <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Update Payment</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {STATUSES.map(s => {
                const active = newStatus === s.value
                return (
                  <button key={s.value} onClick={() => setNewStatus(s.value)}
                    style={{
                      padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                      cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${active ? s.color : BORDER}`,
                      backgroundColor: active ? `${s.color}18` : 'transparent',
                      color: active ? s.color : '#555',
                    }}>
                    {s.label}
                  </button>
                )
              })}
            </div>

            {isPaidStatus && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <Label>Amount Paid (AED)</Label>
                  <input type="number" value={newPaidAmount} onChange={e => setNewPaidAmount(e.target.value)}
                    placeholder={payment.expected_amount?.toString() || '0'}
                    style={inputStyle} />
                </div>
                <div>
                  <Label>Payment Date</Label>
                  <input type="date" value={newPaymentDate} onChange={e => setNewPaymentDate(e.target.value)}
                    style={inputStyle} />
                </div>
                <div>
                  <Label>Method</Label>
                  <select value={newMethod} onChange={e => setNewMethod(e.target.value)} style={inputStyle}>
                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>{newMethod === 'cheque' ? 'Cheque Number' : 'Reference'}</Label>
                  <input
                    value={newMethod === 'cheque' ? newCheque : newRef}
                    onChange={e => newMethod === 'cheque' ? setNewCheque(e.target.value) : setNewRef(e.target.value)}
                    placeholder={newMethod === 'cheque' ? 'e.g. 000123' : 'e.g. TXN-9983'}
                    style={inputStyle} />
                </div>
              </div>
            )}

            <button onClick={saveStatus} disabled={saving}
              style={{
                width: '100%', padding: '10px', backgroundColor: GOLD, color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1,
              }}>
              {saving ? 'Saving...' : 'Update Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
