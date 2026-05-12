'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  full_name: string
  nationality: string
  status: string
  risk_level: string
  passport_expiry: string | null
  emirates_id_expiry: string | null
  created_at: string
}

type CalendarEvent = {
  date: string // YYYY-MM-DD
  type: 'passport_expiry' | 'emirates_id_expiry' | 'pending_review' | 'high_risk'
  clientId: string
  clientName: string
  label: string
  urgency: 'expired' | 'critical' | 'warning' | 'normal'
}

const eventColors = {
  expired: { dot: '#f87171', bg: '#2d0f0f', text: '#f87171', border: '#7f1d1d' },
  critical: { dot: '#f59e0b', bg: '#12100A', text: '#f59e0b', border: '#92400e' },
  warning: { dot: '#C9963F', bg: '#0D0D0D', text: '#C9963F', border: '#1E1E1E' },
  normal: { dot: '#4ade80', bg: '#052e16', text: '#4ade80', border: '#166534' },
}

const eventTypeLabels = {
  passport_expiry: 'Passport Expiry',
  emirates_id_expiry: 'Emirates ID Expiry',
  pending_review: 'Pending KYC Review',
  high_risk: 'High Risk Client',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getUrgency(dateStr: string): 'expired' | 'critical' | 'warning' | 'normal' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'expired'
  if (diff <= 14) return 'critical'
  if (diff <= 30) return 'warning'
  return 'normal'
}

export default function CalendarPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('clients')
        .select('id, full_name, nationality, status, risk_level, passport_expiry, emirates_id_expiry, created_at')
        .order('full_name')

      const allClients = data || []
      setClients(allClients)

      // Build events
      const evts: CalendarEvent[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      allClients.forEach(c => {
        // Passport expiry
        if (c.passport_expiry) {
          const diff = Math.ceil((new Date(c.passport_expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          if (diff <= 60) { // show if within 60 days or expired
            evts.push({
              date: c.passport_expiry,
              type: 'passport_expiry',
              clientId: c.id,
              clientName: c.full_name,
              label: 'Passport Expiry',
              urgency: getUrgency(c.passport_expiry),
            })
          }
        }

        // Emirates ID expiry
        if (c.emirates_id_expiry) {
          const diff = Math.ceil((new Date(c.emirates_id_expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          if (diff <= 60) {
            evts.push({
              date: c.emirates_id_expiry,
              type: 'emirates_id_expiry',
              clientId: c.id,
              clientName: c.full_name,
              label: 'Emirates ID Expiry',
              urgency: getUrgency(c.emirates_id_expiry),
            })
          }
        }

        // Pending reviews — pin to today
        if (c.status === 'pending') {
          evts.push({
            date: today.toISOString().split('T')[0],
            type: 'pending_review',
            clientId: c.id,
            clientName: c.full_name,
            label: 'Pending KYC Review',
            urgency: 'warning',
          })
        }

        // High risk — pin to today
        if (c.risk_level === 'high') {
          evts.push({
            date: today.toISOString().split('T')[0],
            type: 'high_risk',
            clientId: c.id,
            clientName: c.full_name,
            label: 'High Risk Client',
            urgency: 'critical',
          })
        }
      })

      setEvents(evts)
      setLoading(false)
    }
    init()
  }, [router])

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
    setSelectedDate(null)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
    setSelectedDate(null)
  }

  const goToday = () => {
    setCurrentMonth(new Date().getMonth())
    setCurrentYear(new Date().getFullYear())
    setSelectedDate(null)
  }

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const cells: { day: number; month: 'prev' | 'current' | 'next'; dateStr: string }[] = []

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = currentMonth === 0 ? 11 : currentMonth - 1
    const y = currentMonth === 0 ? currentYear - 1 : currentYear
    cells.push({ day: d, month: 'prev', dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: 'current', dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  // Next month days to fill 6 rows
  let nextDay = 1
  while (cells.length < 42) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1
    const y = currentMonth === 11 ? currentYear + 1 : currentYear
    cells.push({ day: nextDay, month: 'next', dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}` })
    nextDay++
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const eventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr)

  // Upcoming events in next 30 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const upcoming = events
    .filter(e => {
      const d = new Date(e.date)
      return d >= today && d <= in30 && e.type !== 'pending_review' && e.type !== 'high_risk'
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const pendingClients = clients.filter(c => c.status === 'pending')
  const highRiskClients = clients.filter(c => c.risk_level === 'high')
  const expiredDocs = events.filter(e => e.urgency === 'expired')

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : []

  if (loading) return <div style={{ padding: '40px 32px' }}><p style={{ color: '#8888aa' }}>Loading calendar...</p></div>

  return (
    <div style={{ padding: '40px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>Compliance Calendar</h2>
        <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>All compliance deadlines across all clients in one view</p>
      </div>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Expired Documents', value: expiredDocs.length, color: '#f87171', bg: '#2d0f0f', border: '#7f1d1d' },
          { label: 'Expiring in 14 Days', value: events.filter(e => e.urgency === 'critical' && e.type !== 'pending_review' && e.type !== 'high_risk').length, color: '#f59e0b', bg: '#12100A', border: '#92400e' },
          { label: 'Pending KYC Reviews', value: pendingClients.length, color: '#C9963F', bg: '#0D0D0D', border: '#1E1E1E' },
          { label: 'High Risk Clients', value: highRiskClients.length, color: '#f87171', bg: '#2d0f0f', border: '#7f1d1d' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: card.bg, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 8px 0' }}>{card.label}</p>
            <p style={{ color: card.color, fontSize: '32px', fontWeight: '800', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        {/* Calendar */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Month navigation */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E1E1E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: 0 }}>
              {MONTHS[currentMonth]} {currentYear}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={goToday} style={{ padding: '6px 14px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#8888aa', fontSize: '13px', cursor: 'pointer' }}>Today</button>
              <button onClick={prevMonth} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', cursor: 'pointer' }}>‹</button>
              <button onClick={nextMonth} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#ffffff', fontSize: '14px', cursor: 'pointer' }}>›</button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #1E1E1E' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((cell, idx) => {
              const cellEvents = eventsForDate(cell.dateStr)
              const isToday = cell.dateStr === todayStr
              const isSelected = cell.dateStr === selectedDate
              const isCurrent = cell.month === 'current'

              // Highest urgency for cell background hint
              const hasExpired = cellEvents.some(e => e.urgency === 'expired')
              const hasCritical = cellEvents.some(e => e.urgency === 'critical')
              const hasWarning = cellEvents.some(e => e.urgency === 'warning')

              let cellBg = 'transparent'
              if (isSelected) cellBg = '#2d2d5e'
              else if (hasExpired) cellBg = '#1a0a0a'
              else if (hasCritical) cellBg = '#12100A'
              else if (hasWarning) cellBg = '#0d1520'

              return (
                <div
                  key={idx}
                  onClick={() => cellEvents.length > 0 ? setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr) : undefined}
                  style={{
                    minHeight: '80px',
                    padding: '8px',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid #111111' : 'none',
                    borderBottom: idx < 35 ? '1px solid #111111' : 'none',
                    backgroundColor: cellBg,
                    cursor: cellEvents.length > 0 ? 'pointer' : 'default',
                    transition: 'background-color 0.15s',
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    width: '28px', height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isToday ? '#C9963F' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '4px',
                  }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: isToday ? '700' : '400',
                      color: isToday ? '#ffffff' : isCurrent ? '#ccccdd' : '#444466',
                    }}>
                      {cell.day}
                    </span>
                  </div>

                  {/* Event dots/pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {cellEvents.slice(0, 3).map((evt, i) => {
                      const colors = eventColors[evt.urgency]
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '2px 5px',
                            borderRadius: '3px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            fontSize: '10px',
                            color: colors.text,
                            fontWeight: '600',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {evt.clientName.split(' ')[0]} · {evt.label.split(' ')[0]}
                        </div>
                      )
                    })}
                    {cellEvents.length > 3 && (
                      <div style={{ fontSize: '10px', color: '#8888aa', paddingLeft: '4px' }}>+{cellEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Selected date detail */}
          {selectedDate && selectedEvents.length > 0 && (
            <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #C9963F', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E1E1E' }}>
                <p style={{ color: '#C9963F', fontSize: '12px', fontWeight: '700', margin: '0 0 2px 0' }}>SELECTED DATE</p>
                <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedEvents.map((evt, i) => {
                  const colors = eventColors[evt.urgency]
                  return (
                    <div
                      key={i}
                      onClick={() => router.push(`/dashboard/clients/${evt.clientId}`)}
                      style={{ padding: '10px 12px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <p style={{ color: colors.text, fontSize: '12px', fontWeight: '700', margin: '0 0 2px 0' }}>{evt.label}</p>
                      <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600', margin: '0 0 2px 0' }}>{evt.clientName}</p>
                      <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>Click to open client →</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming 30 days */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E1E1E' }}>
              <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '700', margin: '0 0 2px 0', letterSpacing: '0.05em' }}>UPCOMING — NEXT 30 DAYS</p>
              <p style={{ color: '#ffffff', fontSize: '13px', margin: 0 }}>{upcoming.length} deadline{upcoming.length !== 1 ? 's' : ''}</p>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {upcoming.length === 0 ? (
                <p style={{ color: '#8888aa', fontSize: '13px', margin: 0 }}>No deadlines in the next 30 days.</p>
              ) : upcoming.map((evt, i) => {
                const colors = eventColors[evt.urgency]
                const daysLeft = Math.ceil((new Date(evt.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div
                    key={i}
                    onClick={() => router.push(`/dashboard/clients/${evt.clientId}`)}
                    style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '9px 10px', backgroundColor: '#080808', borderRadius: '8px', border: '1px solid #1E1E1E', cursor: 'pointer' }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#ffffff', fontSize: '12px', fontWeight: '600', margin: '0 0 1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.clientName}</p>
                      <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>{evt.label}</p>
                    </div>
                    <span style={{ color: colors.text, fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pending reviews */}
          {pendingClients.length > 0 && (
            <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E1E1E' }}>
                <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '700', margin: '0 0 2px 0', letterSpacing: '0.05em' }}>PENDING KYC REVIEWS</p>
                <p style={{ color: '#ffffff', fontSize: '13px', margin: 0 }}>{pendingClients.length} client{pendingClients.length !== 1 ? 's' : ''} awaiting review</p>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingClients.map(c => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                    style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '9px 10px', backgroundColor: '#080808', borderRadius: '8px', border: '1px solid #1E1E1E', cursor: 'pointer' }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#C9963F', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#ffffff', fontSize: '12px', fontWeight: '600', margin: '0 0 1px 0' }}>{c.full_name}</p>
                      <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>{c.nationality}</p>
                    </div>
                    <span style={{ color: '#C9963F', fontSize: '11px', fontWeight: '700' }}>PENDING</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
