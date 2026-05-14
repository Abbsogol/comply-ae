'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

// ─── Types ───────────────────────────────────────────────────────────────────

type ConditionStatus = 'good' | 'fair' | 'damaged' | 'needs_repair' | 'na'

type Item = {
  tempId: string
  label: string
  condition_status: ConditionStatus
  notes: string
}

type Room = {
  tempId: string
  name: string
  notes: string
  items: Item[]
}

type ReportForm = {
  property_id: string
  report_type: 'move_in' | 'move_out' | 'periodic'
  inspection_date: string
  apartment_type: string
  tenant_name: string
  landlord_name: string
  meter_electricity: string
  meter_water: string
  meter_gas: string
  keys_handover: string
  overall_condition: string
  damages_found: string
  repair_responsibility: string
  final_notes: string
  tenant_signature: string
  landlord_signature: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITION_OPTIONS: { value: ConditionStatus; label: string; color: string; bg: string }[] = [
  { value: 'good',         label: 'Good',         color: '#4ade80', bg: '#052e16' },
  { value: 'fair',         label: 'Fair',         color: GOLD,      bg: `${GOLD}18` },
  { value: 'damaged',      label: 'Damaged',      color: '#f87171', bg: '#2d0f0f' },
  { value: 'needs_repair', label: 'Needs Repair', color: '#fb923c', bg: '#2d1500' },
  { value: 'na',           label: 'N/A',          color: '#555',    bg: '#111' },
]

const DEFAULT_ROOMS: { name: string; items: string[] }[] = [
  {
    name: 'Entrance / Hallway',
    items: ['Main door', 'Door lock/handle', 'Intercom', 'Walls/paint', 'Flooring', 'Ceiling/lights', 'Switches/sockets'],
  },
  {
    name: 'Living / Dining Area',
    items: ['Walls/paint', 'Flooring', 'Ceiling', 'Lights', 'AC vents/thermostat', 'Windows/balcony doors', 'Curtains/blinds', 'Electrical sockets'],
  },
  {
    name: 'Kitchen',
    items: ['Cabinets/drawers', 'Countertop', 'Sink/tap/drainage', 'Tiles/walls', 'Fridge', 'Oven/stove', 'Hood', 'Lights/sockets'],
  },
  {
    name: 'Bedroom 1',
    items: ['Door/lock', 'Walls/paint', 'Flooring', 'Ceiling/lights', 'Wardrobes', 'Windows', 'AC', 'Sockets/switches'],
  },
  {
    name: 'Bathroom 1',
    items: ['Door/lock', 'Sink/tap', 'Toilet', 'Shower/bathtub', 'Water pressure/drainage', 'Mirror/cabinets', 'Tiles/grout', 'Exhaust fan', 'Lights'],
  },
  {
    name: 'Balcony / Terrace',
    items: ['Flooring', 'Railings', 'Drainage', 'Walls/paint', 'Balcony door/lock', 'Outdoor lights'],
  },
  {
    name: 'AC / Electrical / Plumbing',
    items: ['AC cooling status', 'Thermostat condition', 'Visible leaks', 'Water heater', 'Main electrical panel', 'Sockets/switches', 'Smoke detectors'],
  },
]

const uid = () => Math.random().toString(36).slice(2)

const makeDefaultRooms = (): Room[] =>
  DEFAULT_ROOMS.map(r => ({
    tempId: uid(),
    name: r.name,
    notes: '',
    items: r.items.map(label => ({ tempId: uid(), label, condition_status: 'good', notes: '' })),
  }))

// ─── Condition Selector ───────────────────────────────────────────────────────

function ConditionSelector({
  value, onChange,
}: { value: ConditionStatus; onChange: (v: ConditionStatus) => void }) {
  const current = CONDITION_OPTIONS.find(o => o.value === value) || CONDITION_OPTIONS[0]
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {CONDITION_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '3px 10px', borderRadius: '4px', fontSize: '11px',
            fontWeight: '600', cursor: 'pointer', border: 'none',
            backgroundColor: value === opt.value ? opt.bg : '#080808',
            color: value === opt.value ? opt.color : '#333',
            outline: value === opt.value ? `1px solid ${opt.color}44` : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function NewInspectionPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [properties, setProperties] = useState<{ id: string; unit_number: string; building_name: string | null }[]>([])
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const [form, setForm] = useState<ReportForm>({
    property_id: searchParams.get('property') || '',
    report_type: 'move_in',
    inspection_date: new Date().toISOString().split('T')[0],
    apartment_type: '',
    tenant_name: '',
    landlord_name: '',
    meter_electricity: '',
    meter_water: '',
    meter_gas: '',
    keys_handover: '',
    overall_condition: '',
    damages_found: '',
    repair_responsibility: '',
    final_notes: '',
    tenant_signature: '',
    landlord_signature: '',
  })

  const [rooms, setRooms] = useState<Room[]>(makeDefaultRooms())
  const [newRoomName, setNewRoomName] = useState('')
  const [addingRoom, setAddingRoom] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('properties').select('id, unit_number, building_name').order('unit_number')
      setProperties(data || [])
    }
    init()
  }, [router])

  // ── Form helpers ──

  const setField = (key: keyof ReportForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const updateRoom = (tempId: string, updates: Partial<Room>) =>
    setRooms(prev => prev.map(r => r.tempId === tempId ? { ...r, ...updates } : r))

  const removeRoom = (tempId: string) =>
    setRooms(prev => prev.filter(r => r.tempId !== tempId))

  const addRoom = () => {
    if (!newRoomName.trim()) return
    setRooms(prev => [...prev, { tempId: uid(), name: newRoomName.trim(), notes: '', items: [] }])
    setNewRoomName('')
    setAddingRoom(false)
  }

  const updateItem = (roomTempId: string, itemTempId: string, updates: Partial<Item>) =>
    setRooms(prev => prev.map(r =>
      r.tempId === roomTempId
        ? { ...r, items: r.items.map(i => i.tempId === itemTempId ? { ...i, ...updates } : i) }
        : r
    ))

  const removeItem = (roomTempId: string, itemTempId: string) =>
    setRooms(prev => prev.map(r =>
      r.tempId === roomTempId ? { ...r, items: r.items.filter(i => i.tempId !== itemTempId) } : r
    ))

  const addItem = (roomTempId: string, label: string) => {
    if (!label.trim()) return
    setRooms(prev => prev.map(r =>
      r.tempId === roomTempId
        ? { ...r, items: [...r.items, { tempId: uid(), label: label.trim(), condition_status: 'good', notes: '' }] }
        : r
    ))
  }

  // ── Save ──

  const handleSave = async (markComplete = false) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Insert report
    const { data: report, error: reportErr } = await supabase
      .from('condition_reports')
      .insert({
        user_id: user.id,
        property_id: form.property_id || null,
        report_type: form.report_type,
        inspection_date: form.inspection_date || null,
        apartment_type: form.apartment_type || null,
        tenant_name: form.tenant_name || null,
        landlord_name: form.landlord_name || null,
        meter_electricity: form.meter_electricity || null,
        meter_water: form.meter_water || null,
        meter_gas: form.meter_gas || null,
        keys_handover: form.keys_handover || null,
        overall_condition: form.overall_condition || null,
        damages_found: form.damages_found || null,
        repair_responsibility: form.repair_responsibility || null,
        final_notes: form.final_notes || null,
        tenant_signature: form.tenant_signature || null,
        landlord_signature: form.landlord_signature || null,
        status: markComplete ? 'complete' : 'draft',
      })
      .select().single()

    if (reportErr || !report) { setSaving(false); alert('Error saving report. Please try again.'); return }

    // 2. Insert rooms + items
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i]
      const { data: savedRoom } = await supabase
        .from('condition_report_rooms')
        .insert({ report_id: report.id, name: room.name, notes: room.notes || null, sort_order: i })
        .select().single()

      if (savedRoom && room.items.length > 0) {
        await supabase.from('condition_report_items').insert(
          room.items.map((item, j) => ({
            room_id: savedRoom.id,
            label: item.label,
            condition_status: item.condition_status,
            notes: item.notes || null,
            sort_order: j,
          }))
        )
      }
    }

    setSaving(false)
    router.push(`/dashboard/inspections/${report.id}`)
  }

  // ─── Input style helper ──────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', backgroundColor: '#080808',
    border: `1px solid ${BORDER}`, borderRadius: '7px',
    color: '#F5F5F5', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#444', fontSize: '11px', fontWeight: '600',
    letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px',
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '40px 32px', maxWidth: '820px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <button onClick={() => router.push('/dashboard/inspections')}
            style={{ marginBottom: '12px', padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#555', fontSize: '12px', cursor: 'pointer' }}>
            ← Back to Inspections
          </button>
          <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            New Inspection Report
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => handleSave(false)} disabled={saving}
            style={{ padding: '10px 18px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: '#888', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            style={{ padding: '10px 18px', backgroundColor: GOLD, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save & Complete'}
          </button>
        </div>
      </div>

      {/* ── Section 1: General Details ───────────────────────────────────── */}
      <Section title="General Property Details" icon="🏠">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          <div>
            <label style={labelStyle}>Property</label>
            <select value={form.property_id} onChange={e => setField('property_id', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Select property —</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.unit_number}{p.building_name ? ', ' + p.building_name : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Report Type</label>
            <select value={form.report_type} onChange={e => setField('report_type', e.target.value as ReportForm['report_type'])}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="move_in">Move-In</option>
              <option value="move_out">Move-Out</option>
              <option value="periodic">Periodic Inspection</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Inspection Date</label>
            <input type="date" value={form.inspection_date} onChange={e => setField('inspection_date', e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Apartment Type</label>
            <select value={form.apartment_type} onChange={e => setField('apartment_type', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Select —</option>
              <option value="Studio">Studio</option>
              <option value="1BR">1 Bedroom</option>
              <option value="2BR">2 Bedrooms</option>
              <option value="3BR">3 Bedrooms</option>
              <option value="4BR+">4+ Bedrooms</option>
              <option value="Villa">Villa</option>
              <option value="Townhouse">Townhouse</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Tenant Name</label>
            <input type="text" placeholder="Full name" value={form.tenant_name} onChange={e => setField('tenant_name', e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Landlord / Manager Name</label>
            <input type="text" placeholder="Full name" value={form.landlord_name} onChange={e => setField('landlord_name', e.target.value)} style={inputStyle} />
          </div>

        </div>

        {/* Meter readings */}
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#080808', borderRadius: '8px', border: `1px solid ${BORDER}` }}>
          <p style={{ color: '#555', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Meter Readings</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Electricity (DEWA)', key: 'meter_electricity', ph: 'e.g. 12453 kWh' },
              { label: 'Water', key: 'meter_water', ph: 'e.g. 384 m³' },
              { label: 'Gas (if applicable)', key: 'meter_gas', ph: 'e.g. 120 m³' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input type="text" placeholder={f.ph} value={form[f.key as keyof ReportForm]}
                  onChange={e => setField(f.key as keyof ReportForm, e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
        </div>

        {/* Keys */}
        <div style={{ marginTop: '12px' }}>
          <label style={labelStyle}>Keys / Access Cards / Remotes Handed Over</label>
          <input type="text" placeholder="e.g. 2 keys, 1 access card, 1 parking remote"
            value={form.keys_handover} onChange={e => setField('keys_handover', e.target.value)} style={inputStyle} />
        </div>
      </Section>

      {/* ── Sections 2-N: Room Cards ─────────────────────────────────────── */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: '#F5F5F5', fontSize: '18px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Room Inspections
          </h3>
          <button onClick={() => setAddingRoom(true)}
            style={{ padding: '6px 14px', backgroundColor: 'transparent', border: `1px solid ${GOLD}`, borderRadius: '6px', color: GOLD, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            + Add Room
          </button>
        </div>
        <p style={{ color: '#444', fontSize: '12px', margin: '0 0 20px 0' }}>
          Add or remove rooms, rename them, and add custom checklist items per room.
        </p>
      </div>

      {/* Add room input */}
      {addingRoom && (
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${GOLD}44`, borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text" placeholder="Room name (e.g. Bedroom 2, Maid's Room...)"
            value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRoom()}
            style={{ ...inputStyle, flex: 1 }} autoFocus
          />
          <button onClick={addRoom} style={{ padding: '9px 16px', backgroundColor: GOLD, border: 'none', borderRadius: '7px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Add</button>
          <button onClick={() => { setAddingRoom(false); setNewRoomName('') }}
            style={{ padding: '9px 14px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '7px', color: '#555', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {rooms.map(room => (
        <RoomCard
          key={room.tempId}
          room={room}
          onUpdateRoom={updates => updateRoom(room.tempId, updates)}
          onRemoveRoom={() => removeRoom(room.tempId)}
          onUpdateItem={(itemId, updates) => updateItem(room.tempId, itemId, updates)}
          onRemoveItem={itemId => removeItem(room.tempId, itemId)}
          onAddItem={label => addItem(room.tempId, label)}
          isOpen={activeSection === room.tempId}
          onToggle={() => setActiveSection(prev => prev === room.tempId ? null : room.tempId)}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />
      ))}

      {/* ── Final Summary ─────────────────────────────────────────────────── */}
      <Section title="Final Summary" icon="📋">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div>
            <label style={labelStyle}>Overall Condition</label>
            <select value={form.overall_condition} onChange={e => setField('overall_condition', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Select —</option>
              <option value="Excellent">Excellent — Ready to hand over</option>
              <option value="Good">Good — Minor wear only</option>
              <option value="Fair">Fair — Some repairs needed</option>
              <option value="Poor">Poor — Significant damage</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Damages Found</label>
            <textarea rows={3} placeholder="Describe any damage found during inspection..."
              value={form.damages_found} onChange={e => setField('damages_found', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div>
            <label style={labelStyle}>Repair Responsibility</label>
            <textarea rows={2} placeholder="Who is responsible for each repair (landlord / tenant)..."
              value={form.repair_responsibility} onChange={e => setField('repair_responsibility', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div>
            <label style={labelStyle}>Final Notes</label>
            <textarea rows={3} placeholder="Any additional notes..."
              value={form.final_notes} onChange={e => setField('final_notes', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Tenant Signature (Name)</label>
              <input type="text" placeholder="Tenant confirms by typing name"
                value={form.tenant_signature} onChange={e => setField('tenant_signature', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Landlord / Manager Signature (Name)</label>
              <input type="text" placeholder="Landlord confirms by typing name"
                value={form.landlord_signature} onChange={e => setField('landlord_signature', e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Bottom save buttons ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${BORDER}` }}>
        <button onClick={() => router.push('/dashboard/inspections')}
          style={{ padding: '11px 20px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: '#555', fontSize: '14px', cursor: 'pointer' }}>
          Discard
        </button>
        <button onClick={() => handleSave(false)} disabled={saving}
          style={{ padding: '11px 20px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: '#888', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button onClick={() => handleSave(true)} disabled={saving}
          style={{ padding: '11px 24px', backgroundColor: GOLD, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : 'Save & Complete →'}
        </button>
      </div>

    </div>
  )
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '24px 28px', marginBottom: '16px' }}>
      <h3 style={{ color: '#F5F5F5', fontSize: '16px', fontWeight: '700', margin: '0 0 20px 0', fontFamily: 'var(--font-playfair), Georgia, serif', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>{icon}</span>{title}
      </h3>
      {children}
    </div>
  )
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({
  room, onUpdateRoom, onRemoveRoom, onUpdateItem, onRemoveItem, onAddItem,
  isOpen, onToggle, inputStyle, labelStyle,
}: {
  room: Room
  onUpdateRoom: (u: Partial<Room>) => void
  onRemoveRoom: () => void
  onUpdateItem: (id: string, u: Partial<Item>) => void
  onRemoveItem: (id: string) => void
  onAddItem: (label: string) => void
  isOpen: boolean
  onToggle: () => void
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
}) {
  const [newItemLabel, setNewItemLabel] = useState('')
  const [editingName, setEditingName]   = useState(false)
  const [nameValue, setNameValue]       = useState(room.name)

  const damaged = room.items.filter(i => i.condition_status === 'damaged' || i.condition_status === 'needs_repair').length
  const total   = room.items.length

  const conditionSummary = () => {
    if (damaged === 0 && total > 0) return { text: 'All good', color: '#4ade80' }
    if (damaged > 0) return { text: `${damaged} issue${damaged > 1 ? 's' : ''}`, color: '#f87171' }
    return { text: `${total} items`, color: '#555' }
  }

  const summary = conditionSummary()

  return (
    <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
      {/* Room header */}
      <div
        style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isOpen ? `1px solid ${BORDER}` : 'none' }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <span style={{ color: '#F5F5F5', fontSize: '15px', fontWeight: '600' }}>{room.name}</span>
          <span style={{ color: summary.color, fontSize: '11px', fontWeight: '600' }}>{summary.text}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={e => { e.stopPropagation(); onRemoveRoom() }}
            style={{ padding: '3px 10px', backgroundColor: 'transparent', border: '1px solid #2d0f0f', borderRadius: '4px', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>
            Remove
          </button>
          <span style={{ color: '#444', fontSize: '14px' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: '20px 24px' }}>

          {/* Rename room */}
          {editingName ? (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input value={nameValue} onChange={e => setNameValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} autoFocus />
              <button onClick={() => { onUpdateRoom({ name: nameValue }); setEditingName(false) }}
                style={{ padding: '8px 14px', backgroundColor: GOLD, border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingName(false)}
                style={{ padding: '8px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#555', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => { setNameValue(room.name); setEditingName(true) }}
              style={{ marginBottom: '16px', padding: '4px 10px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '5px', color: '#444', fontSize: '11px', cursor: 'pointer' }}>
              ✏️ Rename room
            </button>
          )}

          {/* Checklist items */}
          {room.items.length === 0 ? (
            <p style={{ color: '#333', fontSize: '13px', marginBottom: '16px' }}>No items in this room yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {room.items.map(item => (
                <div key={item.tempId} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ color: '#F5F5F5', fontSize: '13px', fontWeight: '500' }}>{item.label}</span>
                    <button onClick={() => onRemoveItem(item.tempId)}
                      style={{ padding: '2px 8px', backgroundColor: 'transparent', border: 'none', color: '#333', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                  </div>
                  <ConditionSelector value={item.condition_status} onChange={v => onUpdateItem(item.tempId, { condition_status: v })} />
                  {item.condition_status !== 'good' && item.condition_status !== 'na' && (
                    <input type="text" placeholder="Notes (optional)..."
                      value={item.notes}
                      onChange={e => onUpdateItem(item.tempId, { notes: e.target.value })}
                      style={{ ...inputStyle, marginTop: '8px', fontSize: '12px' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add item */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="text" placeholder="Add checklist item (e.g. Ceiling fan)..."
              value={newItemLabel} onChange={e => setNewItemLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onAddItem(newItemLabel); setNewItemLabel('') } }}
              style={{ ...inputStyle, flex: 1, fontSize: '13px' }} />
            <button onClick={() => { onAddItem(newItemLabel); setNewItemLabel('') }}
              style={{ padding: '8px 14px', backgroundColor: '#1a1100', border: `1px solid ${GOLD}44`, borderRadius: '6px', color: GOLD, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              + Add
            </button>
          </div>

          {/* Room notes */}
          <div>
            <label style={labelStyle}>Room Notes</label>
            <textarea rows={2} placeholder="General notes for this room..."
              value={room.notes} onChange={e => onUpdateRoom({ notes: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: '13px' }} />
          </div>

        </div>
      )}
    </div>
  )
}

export default function NewInspectionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px 32px', color: '#444' }}>Loading...</div>}>
      <NewInspectionPageInner />
    </Suspense>
  )
}
