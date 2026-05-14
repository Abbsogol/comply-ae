'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type ConditionStatus = 'good' | 'fair' | 'damaged' | 'needs_repair' | 'na'

const CONDITION_OPTIONS: { value: ConditionStatus; label: string; color: string }[] = [
  { value: 'good',         label: 'Good',         color: '#4ade80' },
  { value: 'fair',         label: 'Fair',         color: GOLD      },
  { value: 'damaged',      label: 'Damaged',      color: '#f87171' },
  { value: 'needs_repair', label: 'Needs Repair', color: '#fb923c' },
  { value: 'na',           label: 'N/A',          color: '#555'    },
]

const TYPE_LABELS: Record<string, string> = {
  move_in:  'Move-In Inspection',
  move_out: 'Move-Out Inspection',
  periodic: 'Periodic Inspection',
}

type ReportData = {
  id: string
  created_at: string
  report_type: string
  inspection_date: string | null
  apartment_type: string | null
  tenant_name: string | null
  landlord_name: string | null
  meter_electricity: string | null
  meter_water: string | null
  meter_gas: string | null
  keys_handover: string | null
  overall_condition: string | null
  damages_found: string | null
  repair_responsibility: string | null
  final_notes: string | null
  tenant_signature: string | null
  landlord_signature: string | null
  status: string
  properties: { unit_number: string; building_name: string | null; area: string | null } | null
}

type RoomData = {
  id: string
  name: string
  notes: string | null
  sort_order: number
  items: ItemData[]
}

type ItemData = {
  id: string
  label: string
  condition_status: ConditionStatus
  notes: string | null
  sort_order: number
}

function conditionColor(s: ConditionStatus) {
  return CONDITION_OPTIONS.find(o => o.value === s)?.color || '#555'
}

function conditionLabel(s: ConditionStatus) {
  return CONDITION_OPTIONS.find(o => o.value === s)?.label || s
}

export default function InspectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport]   = useState<ReportData | null>(null)
  const [rooms, setRooms]     = useState<RoomData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [openRoom, setOpenRoom]   = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: rep } = await supabase
        .from('condition_reports')
        .select('*, properties(unit_number, building_name, area)')
        .eq('id', params.id)
        .single()

      if (!rep) { router.push('/dashboard/inspections'); return }
      setReport(rep)

      const { data: roomRows } = await supabase
        .from('condition_report_rooms')
        .select('*')
        .eq('report_id', params.id)
        .order('sort_order')

      const loadedRooms: RoomData[] = []
      for (const room of roomRows || []) {
        const { data: items } = await supabase
          .from('condition_report_items')
          .select('*')
          .eq('room_id', room.id)
          .order('sort_order')
        loadedRooms.push({ ...room, items: items || [] })
      }
      setRooms(loadedRooms)
      setLoading(false)
    }
    init()
  }, [params.id, router])

  // ── PDF Export ─────────────────────────────────────────────────────────────

  const exportPDF = async () => {
    if (!report) return
    setExporting(true)
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const margin = 18
    let y = 18

    const checkPage = (needed = 12) => {
      if (y + needed > H - 18) {
        doc.addPage()
        y = 18
        drawFooter()
      }
    }

    const drawFooter = () => {
      doc.setFontSize(7); doc.setTextColor(150)
      doc.text('COMPLY.AE — Dubai Property Operations Platform — Confidential', W / 2, H - 8, { align: 'center' })
    }

    // ── Cover block ──
    doc.setFillColor(8, 8, 8)
    doc.rect(0, 0, W, 38, 'F')
    doc.setTextColor(201, 150, 63)
    doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text('COMPLY.AE', margin, 14)
    doc.setTextColor(245, 245, 245)
    doc.setFontSize(17)
    doc.text(TYPE_LABELS[report.report_type] || 'Condition Report', margin, 24)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(180)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 32)
    y = 46

    // ── Property + report details ──
    const propName = report.properties
      ? `${report.properties.unit_number}${report.properties.building_name ? ', ' + report.properties.building_name : ''}${report.properties.area ? ', ' + report.properties.area : ''}`
      : '—'

    const details = [
      ['Property',       propName],
      ['Inspection Date', report.inspection_date ? new Date(report.inspection_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
      ['Apartment Type', report.apartment_type || '—'],
      ['Tenant',         report.tenant_name || '—'],
      ['Landlord / Manager', report.landlord_name || '—'],
      ['Status',         report.status === 'complete' ? 'Complete' : 'Draft'],
    ]

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
    doc.text('Report Details', margin, y); y += 6
    doc.setDrawColor(50); doc.line(margin, y, W - margin, y); y += 5

    for (const [label, value] of details) {
      checkPage(8)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(130)
      doc.text(label, margin, y)
      doc.setTextColor(30); doc.setFont('helvetica', 'bold')
      doc.text(value, margin + 52, y)
      y += 7
    }

    // Meter readings
    if (report.meter_electricity || report.meter_water || report.meter_gas) {
      y += 2; checkPage(20)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
      doc.text('Meter Readings', margin, y); y += 5
      doc.setDrawColor(220); doc.line(margin, y, W - margin, y); y += 4
      if (report.meter_electricity) {
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(130)
        doc.text('Electricity (DEWA)', margin, y)
        doc.setTextColor(30); doc.text(report.meter_electricity, margin + 52, y); y += 6
      }
      if (report.meter_water) {
        doc.setFontSize(8); doc.setTextColor(130); doc.text('Water', margin, y)
        doc.setTextColor(30); doc.text(report.meter_water, margin + 52, y); y += 6
      }
      if (report.meter_gas) {
        doc.setFontSize(8); doc.setTextColor(130); doc.text('Gas', margin, y)
        doc.setTextColor(30); doc.text(report.meter_gas, margin + 52, y); y += 6
      }
    }

    if (report.keys_handover) {
      y += 2; checkPage(12)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(130)
      doc.text('Keys / Access Handed Over', margin, y)
      doc.setTextColor(30); doc.setFont('helvetica', 'bold')
      doc.text(report.keys_handover, margin + 52, y); y += 8
    }

    // ── Rooms ──
    for (const room of rooms) {
      y += 4; checkPage(20)
      doc.setFillColor(18, 18, 18)
      doc.rect(margin - 2, y - 4, W - margin * 2 + 4, 10, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(201, 150, 63)
      doc.text(room.name, margin, y + 2); y += 10

      for (const item of room.items) {
        checkPage(8)
        const cColor = item.condition_status === 'good' ? [74, 222, 128]
          : item.condition_status === 'fair'         ? [201, 150, 63]
          : item.condition_status === 'damaged'      ? [248, 113, 113]
          : item.condition_status === 'needs_repair' ? [251, 146, 60]
          : [80, 80, 80]

        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40)
        doc.text(item.label, margin + 2, y)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(cColor[0], cColor[1], cColor[2])
        doc.text(conditionLabel(item.condition_status), margin + 90, y)
        if (item.notes) {
          y += 5; checkPage(6)
          doc.setFont('helvetica', 'italic'); doc.setTextColor(120); doc.setFontSize(7.5)
          const wrapped = doc.splitTextToSize(`Note: ${item.notes}`, W - margin * 2 - 10)
          doc.text(wrapped, margin + 4, y)
          y += wrapped.length * 4
        }
        y += 6
        doc.setDrawColor(230); doc.line(margin + 2, y - 2, W - margin - 2, y - 2)
      }

      if (room.notes) {
        checkPage(10); y += 2
        doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120)
        const wrapped = doc.splitTextToSize(`Room notes: ${room.notes}`, W - margin * 2)
        doc.text(wrapped, margin, y)
        y += wrapped.length * 4 + 2
      }
      y += 4
    }

    // ── Final Summary ──
    if (report.overall_condition || report.damages_found || report.repair_responsibility || report.final_notes) {
      y += 4; checkPage(30)
      doc.setFillColor(18, 18, 18)
      doc.rect(margin - 2, y - 4, W - margin * 2 + 4, 10, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(201, 150, 63)
      doc.text('Final Summary', margin, y + 2); y += 12

      const summaryFields = [
        { label: 'Overall Condition', value: report.overall_condition },
        { label: 'Damages Found',     value: report.damages_found },
        { label: 'Repair Responsibility', value: report.repair_responsibility },
        { label: 'Additional Notes', value: report.final_notes },
      ]
      for (const f of summaryFields) {
        if (!f.value) continue
        checkPage(14); y += 2
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100)
        doc.text(f.label.toUpperCase(), margin, y); y += 5
        doc.setFont('helvetica', 'normal'); doc.setTextColor(40)
        const wrapped = doc.splitTextToSize(f.value, W - margin * 2)
        doc.text(wrapped, margin, y)
        y += wrapped.length * 5 + 4
      }
    }

    // ── Signatures ──
    if (report.tenant_signature || report.landlord_signature) {
      y += 8; checkPage(30)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
      doc.text('Signatures', margin, y); y += 5
      doc.setDrawColor(200); doc.line(margin, y, W - margin, y); y += 8

      const half = (W - margin * 2) / 2
      if (report.tenant_signature) {
        doc.setFontSize(8); doc.setTextColor(120); doc.setFont('helvetica', 'normal')
        doc.text('Tenant', margin, y)
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
        doc.text(report.tenant_signature, margin, y + 6)
        doc.setDrawColor(180); doc.line(margin, y + 10, margin + half - 10, y + 10)
      }
      if (report.landlord_signature) {
        doc.setFontSize(8); doc.setTextColor(120); doc.setFont('helvetica', 'normal')
        doc.text('Landlord / Manager', margin + half, y)
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
        doc.text(report.landlord_signature, margin + half, y + 6)
        doc.setDrawColor(180); doc.line(margin + half, y + 10, W - margin, y + 10)
      }
    }

    drawFooter()

    const propSlug = report.properties?.unit_number?.replace(/\s+/g, '_') || 'report'
    const dateSlug = report.inspection_date || new Date().toISOString().slice(0, 10)
    doc.save(`ConditionReport_${propSlug}_${dateSlug}.pdf`)
    setExporting(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#444' }}>Loading report...</p>
      </div>
    )
  }
  if (!report) return null

  const propName = report.properties
    ? `${report.properties.unit_number}${report.properties.building_name ? ', ' + report.properties.building_name : ''}`
    : 'Unknown Property'

  const totalItems   = rooms.reduce((s, r) => s + r.items.length, 0)
  const damaged      = rooms.reduce((s, r) => s + r.items.filter(i => i.condition_status === 'damaged' || i.condition_status === 'needs_repair').length, 0)
  const good         = rooms.reduce((s, r) => s + r.items.filter(i => i.condition_status === 'good').length, 0)

  return (
    <div style={{ padding: '40px 32px', maxWidth: '820px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <button onClick={() => router.push('/dashboard/inspections')}
        style={{ marginBottom: '16px', padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#555', fontSize: '12px', cursor: 'pointer' }}>
        ← Back to Inspections
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ color: '#F5F5F5', fontSize: '24px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              {TYPE_LABELS[report.report_type] || 'Inspection Report'}
            </h2>
            <span style={{
              padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
              backgroundColor: report.status === 'complete' ? '#052e16' : `${GOLD}18`,
              color: report.status === 'complete' ? '#4ade80' : GOLD,
            }}>
              {report.status === 'complete' ? 'COMPLETE' : 'DRAFT'}
            </span>
          </div>
          <p style={{ color: GOLD, fontSize: '14px', margin: '0 0 2px 0', fontWeight: '500' }}>{propName}</p>
          <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>
            {report.inspection_date
              ? new Date(report.inspection_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Date not set'
            }
            {report.tenant_name ? ` · ${report.tenant_name}` : ''}
          </p>
        </div>
        <button onClick={exportPDF} disabled={exporting}
          style={{ padding: '10px 20px', backgroundColor: GOLD, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: exporting ? 0.7 : 1 }}>
          {exporting ? 'Generating...' : '↓ Export PDF'}
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Rooms',    value: rooms.length,  color: '#F5F5F5' },
          { label: 'Items',    value: totalItems,    color: '#F5F5F5' },
          { label: 'Good',     value: good,          color: '#4ade80' },
          { label: 'Issues',   value: damaged,       color: damaged > 0 ? '#f87171' : '#444' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '16px 18px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{card.label}</p>
            <p style={{ color: card.color, fontSize: '22px', fontWeight: '700', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* General details */}
      <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px 24px', marginBottom: '16px' }}>
        <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 16px 0' }}>General Details</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {[
            { label: 'Property',     value: propName },
            { label: 'Report Type',  value: TYPE_LABELS[report.report_type] },
            { label: 'Inspection Date', value: report.inspection_date ? new Date(report.inspection_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            { label: 'Apartment Type', value: report.apartment_type },
            { label: 'Tenant',       value: report.tenant_name },
            { label: 'Landlord / Manager', value: report.landlord_name },
            { label: 'Electricity Meter', value: report.meter_electricity },
            { label: 'Water Meter',  value: report.meter_water },
            { label: 'Keys Handed Over', value: report.keys_handover },
          ].filter(f => f.value).map(f => (
            <div key={f.label}>
              <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>{f.label}</p>
              <p style={{ color: '#F5F5F5', fontSize: '13px', margin: 0 }}>{f.value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Room cards */}
      {rooms.map(room => {
        const roomDamaged = room.items.filter(i => i.condition_status === 'damaged' || i.condition_status === 'needs_repair').length
        const isOpen = openRoom === room.id
        return (
          <div key={room.id} style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
            <div
              onClick={() => setOpenRoom(isOpen ? null : room.id)}
              style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isOpen ? `1px solid ${BORDER}` : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: '600' }}>{room.name}</span>
                <span style={{ color: roomDamaged > 0 ? '#f87171' : '#4ade80', fontSize: '11px', fontWeight: '600' }}>
                  {roomDamaged > 0 ? `${roomDamaged} issue${roomDamaged > 1 ? 's' : ''}` : `${room.items.length} items · All good`}
                </span>
              </div>
              <span style={{ color: '#444', fontSize: '13px' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ padding: '16px 20px' }}>
                {room.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid #111' }}>
                    <div>
                      <span style={{ color: '#F5F5F5', fontSize: '13px' }}>{item.label}</span>
                      {item.notes && <p style={{ color: '#555', fontSize: '11px', margin: '3px 0 0 0', fontStyle: 'italic' }}>{item.notes}</p>}
                    </div>
                    <span style={{ color: conditionColor(item.condition_status), fontSize: '11px', fontWeight: '700', flexShrink: 0, marginLeft: '12px' }}>
                      {conditionLabel(item.condition_status)}
                    </span>
                  </div>
                ))}
                {room.notes && (
                  <p style={{ color: '#555', fontSize: '12px', margin: '12px 0 0 0', fontStyle: 'italic' }}>
                    Notes: {room.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Final summary */}
      {(report.overall_condition || report.damages_found || report.final_notes) && (
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px 24px', marginTop: '16px' }}>
          <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Final Summary</p>
          {report.overall_condition && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Overall Condition</p>
              <p style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: '600', margin: 0 }}>{report.overall_condition}</p>
            </div>
          )}
          {report.damages_found && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Damages Found</p>
              <p style={{ color: '#F5F5F5', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{report.damages_found}</p>
            </div>
          )}
          {report.repair_responsibility && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Repair Responsibility</p>
              <p style={{ color: '#F5F5F5', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{report.repair_responsibility}</p>
            </div>
          )}
          {report.final_notes && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Notes</p>
              <p style={{ color: '#F5F5F5', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{report.final_notes}</p>
            </div>
          )}
          {(report.tenant_signature || report.landlord_signature) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${BORDER}` }}>
              {report.tenant_signature && (
                <div>
                  <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Tenant</p>
                  <p style={{ color: GOLD, fontSize: '14px', fontWeight: '600', margin: 0 }}>{report.tenant_signature}</p>
                </div>
              )}
              {report.landlord_signature && (
                <div>
                  <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Landlord / Manager</p>
                  <p style={{ color: GOLD, fontSize: '14px', fontWeight: '600', margin: 0 }}>{report.landlord_signature}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Export button at bottom */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={exportPDF} disabled={exporting}
          style={{ padding: '12px 28px', backgroundColor: GOLD, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: exporting ? 0.7 : 1 }}>
          {exporting ? 'Generating PDF...' : '↓ Export PDF Report'}
        </button>
      </div>

    </div>
  )
}
