'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Property = { id: string; unit_number: string; building_name: string | null }

const CATEGORIES = [
  { value: 'plumbing',   label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'ac',         label: 'AC / HVAC' },
  { value: 'structural', label: 'Structural' },
  { value: 'general',    label: 'General' },
  { value: 'pest',       label: 'Pest Control' },
  { value: 'painting',   label: 'Painting' },
  { value: 'other',      label: 'Other' },
]

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#888' },
  { value: 'medium', label: 'Medium', color: GOLD },
  { value: 'high',   label: 'High',   color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
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

function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: '20px' }}>{children}</div>
}

export default function NewMaintenancePage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    property_id: '',
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    reported_date: new Date().toISOString().split('T')[0],
    assigned_to: '',
    estimated_cost: '',
    notes: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('properties')
        .select('id, unit_number, building_name')
        .order('unit_number')
      setProperties(data || [])
    }
    init()
  }, [router])

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Please enter an issue title.'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('maintenance_requests').insert({
      user_id:        user.id,
      property_id:    form.property_id || null,
      title:          form.title.trim(),
      description:    form.description.trim() || null,
      category:       form.category,
      priority:       form.priority,
      status:         'open',
      reported_date:  form.reported_date || null,
      assigned_to:    form.assigned_to.trim() || null,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      notes:          form.notes.trim() || null,
    })

    if (error) {
      setSaving(false)
      alert('Error saving request. Please try again.')
      return
    }

    router.push('/dashboard/maintenance')
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: '760px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>
          ← Back to Maintenance
        </button>
        <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          New Maintenance Request
        </h2>
        <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>Log a maintenance issue for one of your properties</p>
      </div>

      {/* Form */}
      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>

        <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px 0' }}>Issue Details</p>

        <Field>
          <Label>Issue Title *</Label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Leaking pipe under kitchen sink"
            style={inputStyle()} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field>
            <Label>Property</Label>
            <select value={form.property_id} onChange={e => set('property_id', e.target.value)} style={inputStyle()}>
              <option value="">— Select property —</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.unit_number}{p.building_name ? `, ${p.building_name}` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <Label>Category</Label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle()}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>

        <Field>
          <Label>Description</Label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={3}
            style={inputStyle({ resize: 'vertical', fontFamily: 'inherit' })} />
        </Field>

        <Field>
          <Label>Priority</Label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {PRIORITIES.map(p => (
              <button key={p.value} onClick={() => set('priority', p.value)}
                style={{
                  padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  border: `1px solid ${form.priority === p.value ? p.color : BORDER}`,
                  backgroundColor: form.priority === p.value ? `${p.color}18` : 'transparent',
                  color: form.priority === p.value ? p.color : '#555',
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field>
            <Label>Date Reported</Label>
            <input type="date" value={form.reported_date} onChange={e => set('reported_date', e.target.value)}
              style={inputStyle()} />
          </Field>

          <Field>
            <Label>Assigned To (Contractor / Person)</Label>
            <input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
              placeholder="e.g. Ahmed Plumbing Co."
              style={inputStyle()} />
          </Field>
        </div>

        <Field>
          <Label>Estimated Cost (AED)</Label>
          <input type="number" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)}
            placeholder="0"
            style={inputStyle({ width: '200px' })} />
        </Field>

        <Field>
          <Label>Notes</Label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            style={inputStyle({ resize: 'vertical', fontFamily: 'inherit' })} />
        </Field>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '11px 28px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Request'}
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
