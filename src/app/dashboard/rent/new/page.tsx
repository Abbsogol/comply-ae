'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Property = {
  id: string
  unit_number: string
  building_name: string | null
  monthly_rent: number | null
  tenant_id: string | null
  clients: { id: string; full_name: string } | null
}

const STATUSES = [
  { value: 'paid',        label: 'Paid',        color: '#4ade80' },
  { value: 'outstanding', label: 'Outstanding',  color: '#60a5fa' },
  { value: 'late',        label: 'Late',         color: '#ef4444' },
  { value: 'partial',     label: 'Partial',      color: GOLD },
]

const METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'cash',          label: 'Cash' },
  { value: 'online',        label: 'Online' },
]

function inputStyle(extra?: object) {
  return {
    width: '100%', padding: '10px 12px', boxSizing: 'border-box' as const,
    backgroundColor: '#080808', border: `1px solid ${BORDER}`,
    borderRadius: '7px', color: '#F5F5F5', fontSize: '14px', outline: 'none',
    ...extra,
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#888', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{children}</p>
}

function Field({ children, half }: { children: React.ReactNode; half?: boolean }) {
  return <div style={{ marginBottom: '20px', gridColumn: half ? 'span 1' : 'span 2' }}>{children}</div>
}

// Generate last 12 months + next 3 months as period options
function getPeriodOptions() {
  const options = []
  const now = new Date()
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    options.push(label)
  }
  return options.reverse()
}

export default function NewRentPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [saving, setSaving] = useState(false)

  const currentMonth = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const [form, setForm] = useState({
    property_id:     '',
    tenant_id:       '',
    period_label:    currentMonth,
    due_date:        '',
    expected_amount: '',
    paid_amount:     '',
    status:          'outstanding',
    payment_method:  'bank_transfer',
    cheque_number:   '',
    reference_number: '',
    payment_date:    '',
    notes:           '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('properties')
        .select('id, unit_number, building_name, monthly_rent, tenant_id, clients(id, full_name)')
        .order('unit_number')
      setProperties((data as unknown as Property[]) || [])
    }
    init()
  }, [router])

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handlePropertyChange = (propId: string) => {
    const prop = properties.find(p => p.id === propId)
    setForm(f => ({
      ...f,
      property_id:     propId,
      tenant_id:       prop?.clients?.id || '',
      expected_amount: prop?.monthly_rent?.toString() || '',
    }))
  }

  const isPaid = form.status === 'paid' || form.status === 'partial' || form.status === 'late'

  const handleSave = async () => {
    if (!form.property_id) { alert('Please select a property.'); return }
    if (!form.expected_amount) { alert('Please enter the expected rent amount.'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('rent_payments').insert({
      user_id:          user.id,
      property_id:      form.property_id || null,
      tenant_id:        form.tenant_id || null,
      period_label:     form.period_label || null,
      due_date:         form.due_date || null,
      payment_date:     form.payment_date || null,
      expected_amount:  form.expected_amount ? parseFloat(form.expected_amount) : null,
      paid_amount:      form.paid_amount ? parseFloat(form.paid_amount) : null,
      status:           form.status,
      payment_method:   isPaid ? form.payment_method : null,
      cheque_number:    form.cheque_number.trim() || null,
      reference_number: form.reference_number.trim() || null,
      notes:            form.notes.trim() || null,
    })

    if (error) {
      setSaving(false)
      alert('Error saving payment. Please try again.')
      return
    }

    router.push('/dashboard/rent')
  }

  const selectedProp = properties.find(p => p.id === form.property_id)

  return (
    <div style={{ padding: '40px 32px', maxWidth: '760px' }}>

      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>
          ← Back to Rent
        </button>
        <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Log Payment
        </h2>
        <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>Record a rent payment or set an outstanding amount for a property</p>
      </div>

      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>

        <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px 0' }}>Property & Tenant</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field half>
            <Label>Property *</Label>
            <select value={form.property_id} onChange={e => handlePropertyChange(e.target.value)} style={inputStyle()}>
              <option value="">— Select property —</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.unit_number}{p.building_name ? `, ${p.building_name}` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field half>
            <Label>Tenant</Label>
            <input
              value={selectedProp?.clients?.full_name || ''}
              readOnly
              placeholder="Auto-filled from property"
              style={inputStyle({ color: '#555', cursor: 'default' })}
            />
          </Field>
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '24px', marginTop: '4px' }}>
          <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px 0' }}>Payment Details</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field half>
              <Label>Period</Label>
              <select value={form.period_label} onChange={e => set('period_label', e.target.value)} style={inputStyle()}>
                {getPeriodOptions().map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>

            <Field half>
              <Label>Due Date</Label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={inputStyle()} />
            </Field>

            <Field half>
              <Label>Expected Amount (AED) *</Label>
              <input type="number" value={form.expected_amount} onChange={e => set('expected_amount', e.target.value)}
                placeholder="e.g. 7500" style={inputStyle()} />
            </Field>

            <Field half>
              <Label>Status</Label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {STATUSES.map(s => (
                  <button key={s.value} onClick={() => set('status', s.value)}
                    style={{
                      padding: '8px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      border: `1px solid ${form.status === s.value ? s.color : BORDER}`,
                      backgroundColor: form.status === s.value ? `${s.color}18` : 'transparent',
                      color: form.status === s.value ? s.color : '#555',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {isPaid && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field half>
                <Label>Amount Paid (AED)</Label>
                <input type="number" value={form.paid_amount} onChange={e => set('paid_amount', e.target.value)}
                  placeholder={form.expected_amount || '0'} style={inputStyle()} />
              </Field>

              <Field half>
                <Label>Payment Date</Label>
                <input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} style={inputStyle()} />
              </Field>

              <Field half>
                <Label>Payment Method</Label>
                <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} style={inputStyle()}>
                  {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>

              <Field half>
                <Label>{form.payment_method === 'cheque' ? 'Cheque Number' : 'Reference Number'}</Label>
                <input
                  value={form.payment_method === 'cheque' ? form.cheque_number : form.reference_number}
                  onChange={e => set(form.payment_method === 'cheque' ? 'cheque_number' : 'reference_number', e.target.value)}
                  placeholder={form.payment_method === 'cheque' ? 'e.g. 000123' : 'e.g. TXN-9983'}
                  style={inputStyle()} />
              </Field>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <Label>Notes</Label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              style={inputStyle({ resize: 'vertical', fontFamily: 'inherit' })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '11px 28px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Record'}
          </button>
          <button onClick={() => router.back()}
            style={{ padding: '11px 20px', backgroundColor: 'transparent', color: '#555', border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
