'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type MaintenanceRequest = {
  id: string
  created_at: string
  title: string
  description: string | null
  category: string | null
  priority: string
  status: string
  reported_date: string | null
  resolved_date: string | null
  assigned_to: string | null
  estimated_cost: number | null
  actual_cost: number | null
  notes: string | null
  property_id: string | null
  properties: { unit_number: string; building_name: string | null; area: string | null } | null
}

const PRIORITY_STYLES: Record<string, { color: string; bg: string }> = {
  low:    { color: '#888',     bg: '#1a1a1a' },
  medium: { color: GOLD,      bg: `${GOLD}18` },
  high:   { color: '#f97316', bg: '#1c0a00' },
  urgent: { color: '#ef4444', bg: '#1c0000' },
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  open:        { color: '#60a5fa', bg: '#0a1628' },
  in_progress: { color: GOLD,      bg: `${GOLD}18` },
  completed:   { color: '#4ade80', bg: '#052e16' },
  cancelled:   { color: '#555',    bg: '#111' },
}

const CATEGORY_LABELS: Record<string, string> = {
  plumbing:   'Plumbing',
  electrical: 'Electrical',
  ac:         'AC / HVAC',
  structural: 'Structural',
  general:    'General',
  pest:       'Pest Control',
  painting:   'Painting',
  other:      'Other',
}

const STATUSES = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 5px 0' }}>{children}</p>
}

function Value({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#F5F5F5', fontSize: '14px', margin: 0 }}>{children}</p>
}

export default function MaintenanceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [req, setReq] = useState<MaintenanceRequest | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editingStatus, setEditingStatus]       = useState(false)
  const [editingCost, setEditingCost]           = useState(false)
  const [editingNotes, setEditingNotes]         = useState(false)
  const [editingAssigned, setEditingAssigned]   = useState(false)

  const [newStatus, setNewStatus]       = useState('')
  const [newResolvedDate, setNewResolvedDate] = useState('')
  const [newActualCost, setNewActualCost]     = useState('')
  const [newNotes, setNewNotes]               = useState('')
  const [newAssigned, setNewAssigned]         = useState('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('maintenance_requests')
        .select('*, properties(unit_number, building_name, area)')
        .eq('id', id)
        .single()

      if (!data) { router.push('/dashboard/maintenance'); return }
      setReq(data)
      setNewStatus(data.status)
      setNewResolvedDate(data.resolved_date || '')
      setNewActualCost(data.actual_cost?.toString() || '')
      setNewNotes(data.notes || '')
      setNewAssigned(data.assigned_to || '')
      setLoading(false)
    }
    load()
  }, [id, router])

  const save = async (updates: Record<string, unknown>) => {
    setSaving(true)
    const { error } = await supabase
      .from('maintenance_requests')
      .update(updates)
      .eq('id', id)
    if (!error && req) setReq({ ...req, ...updates } as MaintenanceRequest)
    setSaving(false)
    return !error
  }

  const saveStatus = async () => {
    const ok = await save({
      status:       newStatus,
      resolved_date: newStatus === 'completed' ? (newResolvedDate || new Date().toISOString().split('T')[0]) : null,
    })
    if (ok) setEditingStatus(false)
  }

  const saveCost = async () => {
    const ok = await save({ actual_cost: newActualCost ? parseFloat(newActualCost) : null })
    if (ok) setEditingCost(false)
  }

  const saveNotes = async () => {
    const ok = await save({ notes: newNotes.trim() || null })
    if (ok) setEditingNotes(false)
  }

  const saveAssigned = async () => {
    const ok = await save({ assigned_to: newAssigned.trim() || null })
    if (ok) setEditingAssigned(false)
  }

  const inputStyle = {
    padding: '8px 10px', backgroundColor: '#080808',
    border: `1px solid ${BORDER}`, borderRadius: '6px',
    color: '#F5F5F5', fontSize: '13px', outline: 'none',
  }

  if (loading) return <div style={{ padding: '40px 32px', color: '#444' }}>Loading...</div>
  if (!req) return null

  const priorityStyle = PRIORITY_STYLES[req.priority] || PRIORITY_STYLES.medium
  const statusStyle   = STATUS_STYLES[req.status]     || STATUS_STYLES.open

  const propName = req.properties
    ? `${req.properties.unit_number}${req.properties.building_name ? ', ' + req.properties.building_name : ''}`
    : null

  return (
    <div style={{ padding: '40px 32px', maxWidth: '860px' }}>

      {/* Back */}
      <button onClick={() => router.push('/dashboard/maintenance')}
        style={{ background: 'none', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '20px' }}>
        ← Back to Maintenance
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h2 style={{ color: '#F5F5F5', fontSize: '24px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              {req.title}
            </h2>
            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: statusStyle.bg, color: statusStyle.color }}>
              {req.status === 'in_progress' ? 'IN PROGRESS' : req.status?.toUpperCase()}
            </span>
            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: priorityStyle.bg, color: priorityStyle.color }}>
              {req.priority?.toUpperCase()}
            </span>
          </div>
          {propName && <p style={{ color: GOLD, fontSize: '14px', margin: '0 0 2px 0' }}>{propName}</p>}
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            Logged {req.reported_date ? new Date(req.reported_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

        {/* Left column */}
        <div>

          {/* Details card */}
          <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px 0' }}>Details</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <Label>Category</Label>
                <Value>{CATEGORY_LABELS[req.category || ''] || req.category || '—'}</Value>
              </div>
              <div>
                <Label>Property</Label>
                {propName
                  ? <p style={{ color: GOLD, fontSize: '14px', margin: 0, cursor: 'pointer' }}
                      onClick={() => req.property_id && router.push(`/dashboard/properties/${req.property_id}`)}>
                      {propName}
                    </p>
                  : <Value>—</Value>
                }
              </div>
              <div>
                <Label>Date Reported</Label>
                <Value>{req.reported_date ? new Date(req.reported_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</Value>
              </div>
              <div>
                <Label>Date Resolved</Label>
                <Value>{req.resolved_date ? new Date(req.resolved_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</Value>
              </div>
              <div>
                <Label>Estimated Cost</Label>
                <Value>{req.estimated_cost ? `AED ${req.estimated_cost.toLocaleString()}` : '—'}</Value>
              </div>
              <div>
                <Label>Actual Cost</Label>
                {editingCost ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="number" value={newActualCost} onChange={e => setNewActualCost(e.target.value)}
                      placeholder="0" style={{ ...inputStyle, width: '100px' }} />
                    <button onClick={saveCost} disabled={saving}
                      style={{ padding: '6px 12px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      Save
                    </button>
                    <button onClick={() => setEditingCost(false)}
                      style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#555', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Value>{req.actual_cost ? `AED ${req.actual_cost.toLocaleString()}` : '—'}</Value>
                    <button onClick={() => setEditingCost(true)}
                      style={{ background: 'none', border: 'none', color: '#444', fontSize: '11px', cursor: 'pointer', padding: 0 }}>Edit</button>
                  </div>
                )}
              </div>
            </div>

            {req.description && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${BORDER}` }}>
                <Label>Description</Label>
                <p style={{ color: '#888', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>{req.description}</p>
              </div>
            )}
          </div>

          {/* Assigned To */}
          <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Assigned To</p>
              {!editingAssigned && (
                <button onClick={() => setEditingAssigned(true)}
                  style={{ background: 'none', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
              )}
            </div>
            {editingAssigned ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={newAssigned} onChange={e => setNewAssigned(e.target.value)}
                  placeholder="Contractor or person name"
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={saveAssigned} disabled={saving}
                  style={{ padding: '8px 16px', backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  Save
                </button>
                <button onClick={() => setEditingAssigned(false)}
                  style={{ padding: '8px 12px', backgroundColor: 'transparent', color: '#555', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ) : (
              <p style={{ color: req.assigned_to ? '#F5F5F5' : '#444', fontSize: '14px', margin: 0 }}>
                {req.assigned_to || 'Not assigned'}
              </p>
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
                  rows={4} placeholder="Add notes..."
                  style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
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
              <p style={{ color: req.notes ? '#888' : '#333', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                {req.notes || 'No notes yet.'}
              </p>
            )}
          </div>
        </div>

        {/* Right column — Status */}
        <div>
          <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px' }}>
            <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Update Status</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {STATUSES.map(s => {
                const st = STATUS_STYLES[s.value]
                const active = newStatus === s.value
                return (
                  <button key={s.value} onClick={() => setNewStatus(s.value)}
                    style={{
                      padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                      cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${active ? st.color : BORDER}`,
                      backgroundColor: active ? st.bg : 'transparent',
                      color: active ? st.color : '#555',
                    }}>
                    {s.label}
                  </button>
                )
              })}
            </div>

            {newStatus === 'completed' && (
              <div style={{ marginBottom: '16px' }}>
                <Label>Resolved Date</Label>
                <input type="date" value={newResolvedDate} onChange={e => setNewResolvedDate(e.target.value)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
            )}

            <button onClick={saveStatus} disabled={saving || newStatus === req.status}
              style={{
                width: '100%', padding: '10px', backgroundColor: GOLD, color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                cursor: (saving || newStatus === req.status) ? 'not-allowed' : 'pointer',
                opacity: (saving || newStatus === req.status) ? 0.5 : 1,
              }}>
              {saving ? 'Saving...' : 'Update Status'}
            </button>

            {/* Cost summary */}
            {(req.estimated_cost || req.actual_cost) && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${BORDER}` }}>
                <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Cost Summary</p>
                {req.estimated_cost && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#555', fontSize: '12px' }}>Estimated</span>
                    <span style={{ color: '#888', fontSize: '13px', fontWeight: '600' }}>AED {req.estimated_cost.toLocaleString()}</span>
                  </div>
                )}
                {req.actual_cost && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#555', fontSize: '12px' }}>Actual</span>
                    <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>AED {req.actual_cost.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
