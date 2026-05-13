'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type CalendarEvent = {
  date: string // YYYY-MM-DD
  type: 'ejari_expiry' | 'ejari_notice' | 'passport_expiry' | 'emirates_id_expiry'
  entityId: string
  entityName: string
  label: string
  linkPath: string
  urgency: 'expired' | 'critical' | 'warning' | 'normal'
}

const EVENT_COLORS = {
  expired:  { dot: '#f87171', bg: '#1a0505', text: '#f87171', border: '#5a1a1a' },
  critical: { dot: '#fb923c', bg: '#1a0e05', text: '#fb923c', border: '#5a2a05' },
  warning:  { dot: GOLD,      bg: '#1a1100', text: GOLD,      border: '#3a2a00' },
  normal:   { dot: '#4ade80', bg: '#051a0e', text: '#4ade80', border: '#0a3a1a' },
}

const EVENT_TYPE_LABELS = {
  ejari_expiry:       'Ejari Expiry',
  ejari_notice:       '90-Day Notice Due',
  passport_expiry:    'Passport Expiry',
  emirates_id_expiry: 'Emirates ID Expiry',
}

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getUrgency(dateStr: string): 'expired' | 'critical' | 'warning' | 'normal' {
  const today = new Date(); today.setHours(0,0,0,0)
  const date  = new Date(dateStr); date.setHours(0,0,0,0)
  const diff  = Math.ceil((date.getTime() - today.getTime()) / 86400000)
  if (diff < 0)   return 'expired'
  if (diff <= 14) return 'critical'
  if (diff <= 30) return 'warning'
  return 'normal'
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const router = useRouter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentYear, setCurrentYear]   = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: properties }, { data: tenants }] = await Promise.all([
        supabase.from('properties').select('id, unit_number, building_name, ejari_expiry'),
        supabase.from('clients').select('id, full_name, passport_expiry, emirates_id_expiry'),
      ])

      const evts: CalendarEvent[] = []

      // Property events
      for (const p of properties || []) {
        const name = `${p.unit_number}${p.building_name ? ', ' + p.building_name : ''}`
        if (p.ejari_expiry) {
          evts.push({
            date: p.ejari_expiry,
            type: 'ejari_expiry',
            entityId: p.id,
            entityName: name,
            label: EVENT_TYPE_LABELS.ejari_expiry,
            linkPath: `/dashboard/properties/${p.id}`,
            urgency: getUrgency(p.ejari_expiry),
          })
          // 90-day notice: ejari_expiry - 90 days
          const noticeDate = addDays(p.ejari_expiry, -90)
          const noticeUrgency = getUrgency(noticeDate)
          if (noticeUrgency !== 'normal' || new Date(noticeDate) >= new Date()) {
            evts.push({
              date: noticeDate,
              type: 'ejari_notice',
              entityId: p.id,
              entityName: name,
              label: EVENT_TYPE_LABELS.ejari_notice,
              linkPath: `/dashboard/properties/${p.id}`,
              urgency: noticeUrgency,
            })
          }
        }
      }

      // Tenant events
      for (const t of tenants || []) {
        if (t.passport_expiry) {
          evts.push({
            date: t.passport_expiry,
            type: 'passport_expiry',
            entityId: t.id,
            entityName: t.full_name,
            label: EVENT_TYPE_LABELS.passport_expiry,
            linkPath: `/dashboard/clients/${t.id}`,
            urgency: getUrgency(t.passport_expiry),
          })
        }
        if (t.emirates_id_expiry) {
          evts.push({
            date: t.emirates_id_expiry,
            type: 'emirates_id_expiry',
            entityId: t.id,
            entityName: t.full_name,
            label: EVENT_TYPE_LABELS.emirates_id_expiry,
            linkPath: `/dashboard/clients/${t.id}`,
            urgency: getUrgency(t.emirates_id_expiry),
          })
        }
      }

      setEvents(evts)
      setLoading(false)
    }
    init()
  }, [router])

  // Calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate()

  const cells: { day: number; dateStr: string; month: 'prev' | 'current' | 'next' }[] = []
  for (let i = 0; i < firstDay; i++) {
    const d = prevMonthDays - firstDay + 1 + i
    const m = currentMonth === 0 ? 12 : currentMonth
    const y = currentMonth === 0 ? currentYear - 1 : currentYear
    cells.push({ day: d, dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, month: 'prev' })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, month: 'current' })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 11 ? 1 : currentMonth + 2
    const y = currentMonth === 11 ? currentYear + 1 : currentYear
    cells.push({ day: d, dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, month: 'next' })
  }

  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = today.toISOString().split('T')[0]

  const eventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr)
  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : []

  const upcoming = events
    .filter(e => {
      const d = new Date(e.date); d.setHours(0,0,0,0)
      const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
      return diff >= 0 && diff <= 60
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const overdue = events.filter(e => e.urgency === 'expired')

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }
  const goToday  = () => { setCurrentYear(new Date().getFullYear()); setCurrentMonth(new Date().getMonth()) }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#444', fontFamily: 'system-ui, sans-serif' }}>Loading calendar...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 32px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Compliance Calendar
        </h2>
        <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
          Ejari renewals, 90-day notices, and document expiries across your portfolio
        </p>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={{ backgroundColor: '#1a0505', border: '1px solid #5a1a1a', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>🚨</span>
          <div>
            <p style={{ color: '#f87171', fontSize: '13px', fontWeight: '700', margin: '0 0 2px 0' }}>
              {overdue.length} overdue deadline{overdue.length !== 1 ? 's' : ''} — immediate action required
            </p>
            <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
              {overdue.map(e => `${e.entityName} (${e.label})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>

        {/* Calendar grid */}
        <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>

          {/* Month nav */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#F5F5F5', fontSize: '18px', fontWeight: '700', margin: 0 }}>
              {MONTHS[currentMonth]} {currentYear}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={goToday} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#555', fontSize: '12px', cursor: 'pointer' }}>Today</button>
              <button onClick={prevMonth} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '14px', cursor: 'pointer' }}>‹</button>
              <button onClick={nextMonth} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', color: '#F5F5F5', fontSize: '14px', cursor: 'pointer' }}>›</button>
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding: '10px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
            {[
              { label: 'Ejari Expiry', color: '#f87171' },
              { label: '90-Day Notice', color: '#fb923c' },
              { label: 'Passport Expiry', color: GOLD },
              { label: 'Emirates ID Expiry', color: '#4ade80' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                <span style={{ color: '#444', fontSize: '11px' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${BORDER}` }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '9px 0', textAlign: 'center', color: '#444', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((cell, idx) => {
              const cellEvents = eventsForDate(cell.dateStr)
              const isToday    = cell.dateStr === todayStr
              const isSelected = cell.dateStr === selectedDate
              const isCurrent  = cell.month === 'current'

              const hasExpired  = cellEvents.some(e => e.urgency === 'expired')
              const hasCritical = cellEvents.some(e => e.urgency === 'critical')
              const hasWarning  = cellEvents.some(e => e.urgency === 'warning')

              let cellBg = 'transparent'
              if (isSelected)   cellBg = '#1a1a2e'
              else if (hasExpired)  cellBg = '#140404'
              else if (hasCritical) cellBg = '#140a04'
              else if (hasWarning)  cellBg = '#100e04'

              // Color the dot per event type
              const getDotColor = (evt: CalendarEvent) => {
                if (evt.type === 'ejari_expiry')       return '#f87171'
                if (evt.type === 'ejari_notice')       return '#fb923c'
                if (evt.type === 'passport_expiry')    return GOLD
                if (evt.type === 'emirates_id_expiry') return '#4ade80'
                return '#888'
              }

              return (
                <div
                  key={idx}
                  onClick={() => cellEvents.length > 0 ? setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr) : undefined}
                  style={{
                    minHeight: '76px', padding: '7px',
                    borderRight:  (idx + 1) % 7 !== 0 ? '1px solid #111' : 'none',
                    borderBottom: idx < cells.length - 7 ? '1px solid #111' : 'none',
                    backgroundColor: cellBg,
                    cursor: cellEvents.length > 0 ? 'pointer' : 'default',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    backgroundColor: isToday ? GOLD : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '4px',
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: isToday ? '700' : '400',
                      color: isToday ? '#fff' : isCurrent ? '#888' : '#333',
                    }}>{cell.day}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {cellEvents.slice(0, 2).map((evt, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '2px 4px', borderRadius: '3px',
                        backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`,
                      }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: getDotColor(evt), flexShrink: 0 }} />
                        <span style={{
                          fontSize: '9px', color: getDotColor(evt), fontWeight: '600',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {evt.entityName.split(',')[0].split(' ').slice(0,2).join(' ')}
                        </span>
                      </div>
                    ))}
                    {cellEvents.length > 2 && (
                      <span style={{ fontSize: '9px', color: '#444', paddingLeft: '3px' }}>+{cellEvents.length - 2}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Selected date */}
          {selectedDate && selectedEvents.length > 0 && (
            <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${GOLD}`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ color: GOLD, fontSize: '10px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 2px 0' }}>SELECTED DATE</p>
                <p style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: '700', margin: 0 }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedEvents.map((evt, i) => {
                  const dotColor = evt.type === 'ejari_expiry' ? '#f87171' : evt.type === 'ejari_notice' ? '#fb923c' : evt.type === 'passport_expiry' ? GOLD : '#4ade80'
                  return (
                    <div
                      key={i}
                      onClick={() => router.push(evt.linkPath)}
                      style={{ padding: '10px 12px', backgroundColor: '#080808', border: `1px solid ${BORDER}`, borderRadius: '8px', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD + '55')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor }} />
                        <p style={{ color: dotColor, fontSize: '11px', fontWeight: '700', margin: 0 }}>{evt.label}</p>
                      </div>
                      <p style={{ color: '#F5F5F5', fontSize: '13px', fontWeight: '600', margin: '0 0 2px 0', paddingLeft: '14px' }}>{evt.entityName}</p>
                      <p style={{ color: '#444', fontSize: '11px', margin: 0, paddingLeft: '14px' }}>Click to open →</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming 60 days */}
          <div style={{ backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ color: '#444', fontSize: '10px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 2px 0' }}>UPCOMING — NEXT 60 DAYS</p>
              <p style={{ color: '#F5F5F5', fontSize: '13px', margin: 0 }}>{upcoming.length} deadline{upcoming.length !== 1 ? 's' : ''}</p>
            </div>
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '380px', overflowY: 'auto' }}>
              {upcoming.length === 0 ? (
                <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>No deadlines in the next 60 days.</p>
              ) : upcoming.map((evt, i) => {
                const dotColor = evt.type === 'ejari_expiry' ? '#f87171' : evt.type === 'ejari_notice' ? '#fb923c' : evt.type === 'passport_expiry' ? GOLD : '#4ade80'
                const d = new Date(evt.date); d.setHours(0,0,0,0)
                const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86400000)
                return (
                  <div
                    key={i}
                    onClick={() => router.push(evt.linkPath)}
                    style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 10px', backgroundColor: '#080808', borderRadius: '7px', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD + '44')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                  >
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#F5F5F5', fontSize: '12px', fontWeight: '600', margin: '0 0 1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.entityName}</p>
                      <p style={{ color: '#444', fontSize: '11px', margin: 0 }}>{evt.label}</p>
                    </div>
                    <span style={{ color: dotColor, fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
