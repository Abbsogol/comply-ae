'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

// ── Types ──────────────────────────────────────────────────────────
type Property = {
  id: string
  unit_number: string
  building_name: string | null
  area: string | null
  status: string
  monthly_rent: number | null
  ejari_expiry: string | null
  tenant_id: string | null
}

type Client = {
  id: string
  full_name: string
  passport_expiry: string | null
  emirates_id_expiry: string | null
}

type RentPayment = {
  id: string
  status: string
  expected_amount: number | null
  paid_amount: number | null
  period_label: string | null
  property_id: string | null
}

type MaintenanceRequest = {
  id: string
  status: string
  category: string | null
  actual_cost: number | null
  title: string
  priority: string
  property_id: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────
function diffDays(dateStr: string | null) {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EjariBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span style={{ color: '#333' }}>—</span>
  const diff = diffDays(expiry)!
  let color = '#4ade80', label = fmtDate(expiry)
  if (diff < 0)        { color = '#ef4444'; label = 'EXPIRED' }
  else if (diff <= 30) { color = '#f97316' }
  else if (diff <= 90) { color = GOLD }
  else                 { color = '#555' }
  return <span style={{ color, fontSize: '13px', fontWeight: diff <= 90 ? '600' : '400' }}>{label}</span>
}

function ExpiryBadge({ date, label }: { date: string | null; label: string }) {
  if (!date) return null
  const diff = diffDays(date)!
  if (diff > 90) return null
  let color = GOLD, bg = `${GOLD}15`
  if (diff < 0)        { color = '#ef4444'; bg = '#1c0000' }
  else if (diff <= 30) { color = '#f97316'; bg = '#1c0a00' }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: bg, border: `1px solid ${color}22`, borderRadius: '8px', marginBottom: '8px' }}>
      <span style={{ color: '#888', fontSize: '13px' }}>{label}</span>
      <span style={{ color, fontSize: '12px', fontWeight: '600' }}>
        {diff < 0 ? 'EXPIRED' : `${diff}d left`} · {fmtDate(date)}
      </span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <h3 style={{ color: '#F5F5F5', fontSize: '15px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>{title}</h3>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────
export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [properties,   setProperties]   = useState<Property[]>([])
  const [clients,      setClients]      = useState<Client[]>([])
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([])
  const [maintenance,  setMaintenance]  = useState<MaintenanceRequest[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [p, c, r, m] = await Promise.all([
        supabase.from('properties').select('id,unit_number,building_name,area,status,monthly_rent,ejari_expiry,tenant_id'),
        supabase.from('clients').select('id,full_name,passport_expiry,emirates_id_expiry'),
        supabase.from('rent_payments').select('id,status,expected_amount,paid_amount,period_label,property_id'),
        supabase.from('maintenance_requests').select('id,status,category,actual_cost,title,priority,property_id'),
      ])

      setProperties(p.data || [])
      setClients(c.data || [])
      setRentPayments(r.data || [])
      setMaintenance(m.data || [])
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return <div style={{ padding: '40px 32px', color: '#444' }}>Loading reports...</div>

  // ── Derived data ─────────────────────────────────────────────────
  const occupied  = properties.filter(p => p.status === 'occupied')
  const vacant    = properties.filter(p => p.status === 'vacant')
  const totalRent = occupied.reduce((s, p) => s + (p.monthly_rent || 0), 0)
  const occupancyRate = properties.length ? Math.round((occupied.length / properties.length) * 100) : 0

  const ejariExpired = properties.filter(p => p.ejari_expiry && diffDays(p.ejari_expiry)! < 0)
  const ejariUrgent  = properties.filter(p => p.ejari_expiry && diffDays(p.ejari_expiry)! >= 0 && diffDays(p.ejari_expiry)! <= 30)
  const ejariWarning = properties.filter(p => p.ejari_expiry && diffDays(p.ejari_expiry)! > 30 && diffDays(p.ejari_expiry)! <= 90)
  const ejariAlert   = [...ejariExpired, ...ejariUrgent, ...ejariWarning].sort((a, b) => (diffDays(a.ejari_expiry) || 999) - (diffDays(b.ejari_expiry) || 999))

  const totalExpected    = rentPayments.reduce((s, r) => s + (r.expected_amount || 0), 0)
  const totalCollected   = rentPayments.filter(r => r.status === 'paid' || r.status === 'partial').reduce((s, r) => s + (r.paid_amount || 0), 0)
  const totalOutstanding = rentPayments.filter(r => r.status !== 'paid').reduce((s, r) => s + ((r.expected_amount || 0) - (r.paid_amount || 0)), 0)
  const collectionRate   = totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0

  const mainOpen       = maintenance.filter(m => m.status === 'open')
  const mainInProgress = maintenance.filter(m => m.status === 'in_progress')
  const mainCompleted  = maintenance.filter(m => m.status === 'completed')
  const mainTotalCost  = mainCompleted.reduce((s, m) => s + (m.actual_cost || 0), 0)

  const categoryCount: Record<string, number> = {}
  maintenance.forEach(m => { if (m.category) categoryCount[m.category] = (categoryCount[m.category] || 0) + 1 })
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 4)

  const docAlerts = clients.filter(c =>
    (c.passport_expiry && diffDays(c.passport_expiry)! <= 90) ||
    (c.emirates_id_expiry && diffDays(c.emirates_id_expiry)! <= 90)
  )

  const getPropName = (id: string | null) => {
    if (!id) return '—'
    const p = properties.find(p => p.id === id)
    return p ? `${p.unit_number}${p.building_name ? ', ' + p.building_name : ''}` : '—'
  }

  // ── PDF Export (clean white theme) ───────────────────────────────
  const exportPDF = async () => {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const W      = 210
      const margin = 16
      const usable = W - margin * 2
      let y = 0

      // Colour palette
      const gold   = [180, 130, 40]  as [number, number, number]
      const black  = [20,  20,  20]  as [number, number, number]
      const dark   = [50,  50,  50]  as [number, number, number]
      const muted  = [130, 130, 130] as [number, number, number]
      const subtle = [210, 210, 210] as [number, number, number]
      const rowAlt = [248, 248, 248] as [number, number, number]
      const red    = [200, 50,  50]  as [number, number, number]
      const orange = [210, 100, 20]  as [number, number, number]
      const green  = [30,  150, 80]  as [number, number, number]
      const blue   = [50,  100, 200] as [number, number, number]

      const generatedAt = new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })

      // ── Page header (repeats on each new page)
      const drawHeader = () => {
        doc.setFillColor(...gold)
        doc.rect(0, 0, W, 2.5, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(20)
        doc.setTextColor(...black)
        doc.text('COMPLY.AE', margin, 15)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...muted)
        doc.text('Portfolio Report  —  Confidential', margin, 21)

        doc.setFontSize(8)
        doc.text(`Generated: ${generatedAt}`, W - margin, 13, { align: 'right' })

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...gold)
        doc.text(`${properties.length} ${properties.length === 1 ? 'Property' : 'Properties'}`, W - margin, 19, { align: 'right' })

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...muted)
        doc.text(`${occupancyRate}% Occupancy  |  AED ${totalRent.toLocaleString()} / mo`, W - margin, 25, { align: 'right' })

        doc.setDrawColor(...subtle)
        doc.setLineWidth(0.3)
        doc.line(margin, 29, W - margin, 29)

        y = 37
      }

      drawHeader()

      // ── Section title
      const sectionTitle = (num: string, label: string) => {
        if (y > 255) { doc.addPage(); drawHeader() }
        doc.setFillColor(...gold)
        doc.rect(margin, y, 2.5, 6, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...black)
        doc.text(`${num}. ${label}`, margin + 5, y + 4.5)
        y += 11
      }

      // ── Stat boxes row
      const statRow = (items: { label: string; value: string; color?: [number, number, number] }[]) => {
        const colW = usable / items.length
        items.forEach((item, i) => {
          const x = margin + i * colW
          doc.setFillColor(...rowAlt)
          doc.setDrawColor(...subtle)
          doc.setLineWidth(0.2)
          doc.roundedRect(x, y, colW - 2, 16, 1, 1, 'FD')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(...muted)
          doc.text(item.label.toUpperCase(), x + 4, y + 5)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(11)
          doc.setTextColor(...(item.color || black))
          doc.text(item.value, x + 4, y + 13)
        })
        y += 21
      }

      // ── Table
      const table = (headers: string[], rows: string[][], colWidths?: number[]) => {
        if (y > 255) { doc.addPage(); drawHeader() }
        const widths = colWidths || headers.map(() => usable / headers.length)

        doc.setFillColor(232, 232, 232)
        doc.rect(margin, y, usable, 7, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...dark)
        let x = margin
        headers.forEach((h, i) => { doc.text(h, x + 2, y + 4.8); x += widths[i] })
        y += 7

        doc.setDrawColor(...subtle)
        doc.setLineWidth(0.15)
        doc.line(margin, y, margin + usable, y)

        rows.forEach((row, ri) => {
          if (y > 265) { doc.addPage(); drawHeader() }
          if (ri % 2 === 0) {
            doc.setFillColor(...rowAlt)
            doc.rect(margin, y, usable, 7, 'F')
          }
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(...dark)
          x = margin
          row.forEach((cell, ci) => {
            const maxChars = Math.floor(widths[ci] / 2.1)
            const txt = String(cell).length > maxChars ? String(cell).substring(0, maxChars - 1) + '.' : String(cell)
            doc.text(txt, x + 2, y + 4.8)
            x += widths[ci]
          })
          y += 7
        })

        doc.setDrawColor(...subtle)
        doc.line(margin, y, margin + usable, y)
        y += 8
      }

      // ── Status note (green tick or red warning)
      const note = (text: string, good: boolean) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...(good ? green : red))
        doc.text((good ? 'v  ' : '!  ') + text, margin + 3, y + 4)
        y += 12
      }

      // ──────────────────────────────────────────────────────────────
      // SECTION 1 — Portfolio Overview
      // ──────────────────────────────────────────────────────────────
      sectionTitle('1', 'Portfolio Overview')
      statRow([
        { label: 'Total Properties', value: String(properties.length) },
        { label: 'Occupied',         value: `${occupied.length} (${occupancyRate}%)`, color: green },
        { label: 'Vacant',           value: String(vacant.length), color: vacant.length > 0 ? orange : muted },
        { label: 'Monthly Income',   value: `AED ${totalRent.toLocaleString()}`, color: gold },
      ])

      if (properties.length > 0) {
        table(
          ['Property', 'Area', 'Status', 'Rent / mo', 'Ejari Expiry'],
          properties.map(p => [
            `${p.unit_number}${p.building_name ? ', ' + p.building_name : ''}`,
            p.area || '—',
            p.status === 'occupied' ? 'Occupied' : 'Vacant',
            p.monthly_rent ? `AED ${p.monthly_rent.toLocaleString()}` : '—',
            p.ejari_expiry ? fmtDate(p.ejari_expiry) : '—',
          ]),
          [60, 34, 26, 32, 26]
        )
      } else {
        note('No properties added yet.', false)
      }

      // ──────────────────────────────────────────────────────────────
      // SECTION 2 — Ejari Compliance
      // ──────────────────────────────────────────────────────────────
      sectionTitle('2', 'Ejari Compliance')
      statRow([
        { label: 'Expired',        value: String(ejariExpired.length),  color: ejariExpired.length > 0 ? red : muted },
        { label: 'Due in 30 days', value: String(ejariUrgent.length),   color: ejariUrgent.length > 0 ? orange : muted },
        { label: 'Due in 90 days', value: String(ejariWarning.length),  color: ejariWarning.length > 0 ? gold : muted },
        { label: 'All Clear',      value: String(properties.length - ejariExpired.length - ejariUrgent.length - ejariWarning.length), color: green },
      ])

      if (ejariAlert.length > 0) {
        table(
          ['Property', 'Ejari Expiry', 'Days Remaining / Overdue'],
          ejariAlert.map(p => {
            const diff = diffDays(p.ejari_expiry)!
            return [
              `${p.unit_number}${p.building_name ? ', ' + p.building_name : ''}`,
              fmtDate(p.ejari_expiry),
              diff < 0 ? `${Math.abs(diff)} days overdue` : `${diff} days remaining`,
            ]
          }),
          [72, 52, 54]
        )
      } else if (properties.length > 0) {
        note('All Ejari registrations are up to date.', true)
      }

      // ──────────────────────────────────────────────────────────────
      // SECTION 3 — Rent Collection
      // ──────────────────────────────────────────────────────────────
      sectionTitle('3', 'Rent Collection')
      statRow([
        { label: 'Total Expected',  value: `AED ${totalExpected.toLocaleString()}`,    color: dark },
        { label: 'Collected',       value: `AED ${totalCollected.toLocaleString()}`,   color: green },
        { label: 'Outstanding',     value: `AED ${totalOutstanding.toLocaleString()}`, color: totalOutstanding > 0 ? red : muted },
        { label: 'Collection Rate', value: `${collectionRate}%`, color: collectionRate >= 80 ? green : collectionRate >= 50 ? gold : red },
      ])

      const unpaid = rentPayments.filter(r => r.status !== 'paid')
      if (unpaid.length > 0) {
        table(
          ['Property', 'Period', 'Expected', 'Paid', 'Balance', 'Status'],
          unpaid.map(r => {
            const balance = (r.expected_amount || 0) - (r.paid_amount || 0)
            return [
              getPropName(r.property_id),
              r.period_label || '—',
              r.expected_amount ? `AED ${r.expected_amount.toLocaleString()}` : '—',
              r.paid_amount ? `AED ${r.paid_amount.toLocaleString()}` : '—',
              balance > 0 ? `AED ${balance.toLocaleString()}` : '—',
              r.status.charAt(0).toUpperCase() + r.status.slice(1),
            ]
          }),
          [44, 26, 27, 27, 27, 27]
        )
      } else if (rentPayments.length > 0) {
        note('All rent payments are up to date.', true)
      } else {
        note('No rent records added yet.', false)
      }

      // ──────────────────────────────────────────────────────────────
      // SECTION 4 — Maintenance Summary
      // ──────────────────────────────────────────────────────────────
      sectionTitle('4', 'Maintenance Summary')
      statRow([
        { label: 'Open',        value: String(mainOpen.length),       color: mainOpen.length > 0 ? blue : muted },
        { label: 'In Progress', value: String(mainInProgress.length), color: mainInProgress.length > 0 ? gold : muted },
        { label: 'Completed',   value: String(mainCompleted.length),  color: green },
        { label: 'Total Spend', value: `AED ${mainTotalCost.toLocaleString()}`, color: dark },
      ])

      if (topCategories.length > 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...muted)
        doc.text('Categories: ' + topCategories.map(([cat, n]) => `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${n})`).join('   '), margin + 2, y)
        y += 10
      }

      if (mainOpen.length > 0) {
        table(
          ['Property', 'Issue', 'Priority'],
          mainOpen.map(m => [
            getPropName(m.property_id),
            m.title,
            m.priority.charAt(0).toUpperCase() + m.priority.slice(1),
          ]),
          [58, 100, 20]
        )
      } else if (maintenance.length === 0) {
        note('No maintenance requests logged yet.', false)
      } else {
        note('No open maintenance issues.', true)
      }

      // ──────────────────────────────────────────────────────────────
      // SECTION 5 — Document Expiry Alerts
      // ──────────────────────────────────────────────────────────────
      sectionTitle('5', 'Document Expiry Alerts (within 90 days)')

      if (docAlerts.length === 0) {
        note('No tenant documents expiring within the next 90 days.', true)
      } else {
        const rows: string[][] = []
        docAlerts.forEach(c => {
          if (c.passport_expiry && diffDays(c.passport_expiry)! <= 90) {
            const diff = diffDays(c.passport_expiry)!
            rows.push([c.full_name, 'Passport', fmtDate(c.passport_expiry), diff < 0 ? 'EXPIRED' : `${diff} days remaining`])
          }
          if (c.emirates_id_expiry && diffDays(c.emirates_id_expiry)! <= 90) {
            const diff = diffDays(c.emirates_id_expiry)!
            rows.push([c.full_name, 'Emirates ID', fmtDate(c.emirates_id_expiry), diff < 0 ? 'EXPIRED' : `${diff} days remaining`])
          }
        })
        table(['Tenant', 'Document', 'Expiry Date', 'Status'], rows, [62, 38, 42, 36])
      }

      // ── Footer on every page ─────────────────────────────────────
      const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setDrawColor(...subtle)
        doc.setLineWidth(0.2)
        doc.line(margin, 284, W - margin, 284)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...muted)
        doc.text('COMPLY.AE — Confidential Portfolio Report', margin, 289)
        doc.text(`Page ${i} of ${totalPages}`, W - margin, 289, { align: 'right' })
      }

      const fileName = `COMPLY-AE-Report-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('PDF export failed', err)
      alert('Export failed. Please try again.')
    }
    setExporting(false)
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: '980px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Reports
          </h2>
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            Live snapshot of your portfolio — updated in real time
          </p>
        </div>
        <button
          onClick={exportPDF}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', backgroundColor: GOLD,
            color: '#000', border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: '700',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.7 : 1, flexShrink: 0,
          }}
        >
          {exporting ? <>&#x23F3; Generating...</> : <>&#x2193; Export PDF</>}
        </button>
      </div>

      {/* ── 1. Portfolio Overview ── */}
      <Section title="Portfolio Overview" icon="🏘️">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Total Properties', value: properties.length,                        color: GOLD },
            { label: 'Occupied',         value: `${occupied.length} (${occupancyRate}%)`, color: '#4ade80' },
            { label: 'Vacant',           value: vacant.length,                            color: vacant.length > 0 ? '#f97316' : '#555' },
            { label: 'Monthly Income',   value: `AED ${totalRent.toLocaleString()}`,      color: GOLD },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{c.label}</p>
              <p style={{ color: c.color, fontSize: '18px', fontWeight: '700', margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {properties.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Property', 'Area', 'Status', 'Rent/mo', 'Ejari Expiry'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map(p => (
                <tr key={p.id}
                  onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                  style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '10px 12px', color: GOLD, fontSize: '13px', fontWeight: '500' }}>
                    {p.unit_number}{p.building_name ? `, ${p.building_name}` : ''}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{p.area || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', backgroundColor: p.status === 'occupied' ? '#052e16' : '#1a1a1a', color: p.status === 'occupied' ? '#4ade80' : '#555' }}>
                      {p.status === 'occupied' ? 'OCCUPIED' : 'VACANT'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#888', fontSize: '13px' }}>
                    {p.monthly_rent ? `AED ${p.monthly_rent.toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}><EjariBadge expiry={p.ejari_expiry} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {properties.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No properties added yet.</p>}
      </Section>

      {/* ── 2. Ejari Compliance ── */}
      <Section title="Ejari Compliance" icon="📋">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: ejariAlert.length > 0 ? '20px' : '0' }}>
          {[
            { label: 'Expired',  value: ejariExpired.length, color: '#ef4444' },
            { label: '≤30 Days', value: ejariUrgent.length,  color: '#f97316' },
            { label: '≤90 Days', value: ejariWarning.length, color: GOLD },
            { label: 'OK',       value: properties.length - ejariExpired.length - ejariUrgent.length - ejariWarning.length, color: '#4ade80' },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{c.label}</p>
              <p style={{ color: c.color, fontSize: '22px', fontWeight: '700', margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {ejariAlert.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Property', 'Ejari Expiry', 'Days'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ejariAlert.map(p => {
                const diff = diffDays(p.ejari_expiry)!
                return (
                  <tr key={p.id}
                    onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                    style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 12px', color: GOLD, fontSize: '13px' }}>{p.unit_number}{p.building_name ? `, ${p.building_name}` : ''}</td>
                    <td style={{ padding: '10px 12px' }}><EjariBadge expiry={p.ejari_expiry} /></td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', color: diff < 0 ? '#ef4444' : diff <= 30 ? '#f97316' : GOLD, fontWeight: '600' }}>
                      {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d remaining`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {ejariAlert.length === 0 && properties.length > 0 && <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>✓ All Ejari registrations are up to date.</p>}
        {properties.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No properties added yet.</p>}
      </Section>

      {/* ── 3. Rent Collection ── */}
      <Section title="Rent Collection" icon="💰">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: rentPayments.length > 0 ? '20px' : '0' }}>
          {[
            { label: 'Total Expected',  value: `AED ${totalExpected.toLocaleString()}`,    color: '#888' },
            { label: 'Collected',       value: `AED ${totalCollected.toLocaleString()}`,   color: '#4ade80' },
            { label: 'Outstanding',     value: `AED ${totalOutstanding.toLocaleString()}`, color: totalOutstanding > 0 ? '#ef4444' : '#555' },
            { label: 'Collection Rate', value: `${collectionRate}%`,                       color: collectionRate >= 80 ? '#4ade80' : collectionRate >= 50 ? GOLD : '#ef4444' },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{c.label}</p>
              <p style={{ color: c.color, fontSize: '18px', fontWeight: '700', margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {rentPayments.filter(r => r.status !== 'paid').length > 0 && (
          <>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 10px 0' }}>Outstanding / Unpaid</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Property', 'Period', 'Expected', 'Paid', 'Balance', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rentPayments.filter(r => r.status !== 'paid').map(r => {
                  const balance = (r.expected_amount || 0) - (r.paid_amount || 0)
                  const statusColor = r.status === 'late' ? '#ef4444' : r.status === 'partial' ? GOLD : '#60a5fa'
                  return (
                    <tr key={r.id}
                      onClick={() => router.push(`/dashboard/rent/${r.id}`)}
                      style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', color: GOLD, fontSize: '13px' }}>{getPropName(r.property_id)}</td>
                      <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{r.period_label || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#888', fontSize: '13px' }}>{r.expected_amount ? `AED ${r.expected_amount.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#555', fontSize: '13px' }}>{r.paid_amount ? `AED ${r.paid_amount.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>{balance > 0 ? `AED ${balance.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', color: statusColor, backgroundColor: `${statusColor}18` }}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
        {rentPayments.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No rent records yet.</p>}
        {rentPayments.length > 0 && rentPayments.every(r => r.status === 'paid') && <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>✓ All rent payments are up to date.</p>}
      </Section>

      {/* ── 4. Maintenance ── */}
      <Section title="Maintenance Summary" icon="🔧">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: maintenance.length > 0 ? '20px' : '0' }}>
          {[
            { label: 'Open',        value: mainOpen.length,       color: '#60a5fa' },
            { label: 'In Progress', value: mainInProgress.length, color: GOLD },
            { label: 'Completed',   value: mainCompleted.length,  color: '#4ade80' },
            { label: 'Total Spend', value: `AED ${mainTotalCost.toLocaleString()}`, color: GOLD },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>{c.label}</p>
              <p style={{ color: c.color, fontSize: '22px', fontWeight: '700', margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {topCategories.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 10px 0' }}>By Category</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {topCategories.map(([cat, count]) => (
                <div key={cat} style={{ padding: '6px 14px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '999px' }}>
                  <span style={{ color: '#888', fontSize: '12px' }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <span style={{ color: GOLD, fontSize: '12px', fontWeight: '700', marginLeft: '8px' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mainOpen.length > 0 && (
          <>
            <p style={{ color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 10px 0' }}>Open Issues</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Property', 'Issue', 'Priority'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mainOpen.map(m => {
                  const pColor = m.priority === 'urgent' ? '#ef4444' : m.priority === 'high' ? '#f97316' : m.priority === 'medium' ? GOLD : '#555'
                  return (
                    <tr key={m.id}
                      onClick={() => router.push(`/dashboard/maintenance/${m.id}`)}
                      style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', color: GOLD, fontSize: '13px' }}>{getPropName(m.property_id)}</td>
                      <td style={{ padding: '10px 12px', color: '#F5F5F5', fontSize: '13px' }}>{m.title}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: pColor, fontSize: '11px', fontWeight: '700' }}>{m.priority.toUpperCase()}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
        {maintenance.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No maintenance requests logged yet.</p>}
      </Section>

      {/* ── 5. Document Expiry Alerts ── */}
      <Section title="Document Expiry Alerts" icon="⚠️">
        {docAlerts.length === 0 ? (
          <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>✓ No tenant documents expiring within the next 90 days.</p>
        ) : (
          docAlerts.map(c => (
            <div key={c.id}
              onClick={() => router.push(`/dashboard/clients/${c.id}`)}
              style={{ marginBottom: '12px', padding: '14px 16px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${GOLD}44`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
            >
              <p style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>{c.full_name}</p>
              <ExpiryBadge date={c.passport_expiry} label="Passport" />
              <ExpiryBadge date={c.emirates_id_expiry} label="Emirates ID" />
            </div>
          ))
        )}
        {clients.length === 0 && <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No tenants added yet.</p>}
      </Section>

    </div>
  )
}
