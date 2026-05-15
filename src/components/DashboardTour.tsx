'use client'

import { useState, useEffect, useCallback } from 'react'

const GOLD = '#C9963F'
const TOUR_KEY = 'comply_ae_tour_v2'

interface Step {
  selector: string | null   // data-tour value, null = centered modal
  title: string
  body: string
  side?: 'right' | 'bottom' | 'top' | 'left' | 'center'
}

const STEPS: Step[] = [
  {
    selector: null,
    side: 'center',
    title: '👋 Welcome to COMPLY.AE',
    body: 'This is your command center. We\'ll walk you through the key parts of the dashboard — takes less than a minute.',
  },
  {
    selector: 'stat-cards',
    side: 'bottom',
    title: '📊 Portfolio Overview',
    body: 'These four cards show your portfolio at a glance — total units, how many are occupied or vacant, and any Ejari alerts requiring attention.',
  },
  {
    selector: 'ejari-alerts',
    side: 'bottom',
    title: '⚠️ Ejari Alerts',
    body: 'Ejari must be renewed every year in Dubai. Missing a renewal can trigger AED 10,000+ fines. Red = expired, orange = due in 30 days, gold = due in 90 days.',
  },
  {
    selector: 'nav-properties',
    side: 'right',
    title: '🏠 Properties',
    body: 'Add and manage all your Dubai units. Track Ejari numbers, link tenants, set rent, and monitor compliance status for each property.',
  },
  {
    selector: 'nav-tenants',
    side: 'right',
    title: '👤 Tenants',
    body: 'Manage your tenant list. Store contact details, nationality, and link each tenant to a property.',
  },
  {
    selector: 'nav-rent',
    side: 'right',
    title: '💰 Rent',
    body: 'Log rent payments per property and period. Mark payments as paid, partial, or late. Track outstanding balances.',
  },
  {
    selector: 'nav-maintenance',
    side: 'right',
    title: '🔧 Maintenance',
    body: 'Log and track maintenance requests. Assign contractors, set priority levels, and record costs per job.',
  },
  {
    selector: 'nav-vault',
    side: 'right',
    title: '🔒 Vault',
    body: 'Upload title deeds, NOCs, insurance policies, and floor plans — all linked to the right property and flagged when expiring.',
  },
  {
    selector: 'nav-reports',
    side: 'right',
    title: '📊 Reports',
    body: 'Export a professional PDF of your full portfolio — rent history, maintenance costs, Ejari compliance, and document expiry.',
  },
  {
    selector: 'nav-services',
    side: 'right',
    title: '🧹 Services',
    body: 'Find trusted Dubai service providers — cleaning, AC, pest control, handymen, and more — with real market pricing.',
  },
  {
    selector: null,
    side: 'center',
    title: '✅ You\'re all set!',
    body: 'Explore at your own pace. Each section has clear forms and labels to guide you. Your data is saved automatically as you work.',
  },
]

interface Rect { top: number; left: number; width: number; height: number }

function getRect(selector: string | null): Rect | null {
  if (!selector) return null
  const el = document.querySelector(`[data-tour="${selector}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

const PAD = 12  // padding around highlighted element

export default function DashboardTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const updateRect = useCallback(() => {
    setRect(getRect(current.selector))
  }, [current.selector])

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY)
    if (!seen) setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [visible, updateRect])

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, 'true')
    setVisible(false)
  }

  const next = () => {
    if (isLast) { dismiss(); return }
    setStep(s => s + 1)
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

  if (!visible) return null

  // ── Spotlight geometry ────────────────────────────────────────────────────
  const hasSpot = rect !== null
  const spotTop    = hasSpot ? rect!.top    - PAD : 0
  const spotLeft   = hasSpot ? rect!.left   - PAD : 0
  const spotWidth  = hasSpot ? rect!.width  + PAD * 2 : 0
  const spotHeight = hasSpot ? rect!.height + PAD * 2 : 0

  // ── Tooltip positioning ───────────────────────────────────────────────────
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const TIP_W = 300
  const TIP_H = 200  // approximate

  let tipStyle: React.CSSProperties = {}

  if (!hasSpot || current.side === 'center') {
    // Centered on screen
    tipStyle = {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${TIP_W}px`,
    }
  } else if (current.side === 'right') {
    // Tooltip to the right of the element
    const tipLeft = spotLeft + spotWidth + 16
    const tipTop = Math.min(
      Math.max(spotTop, 16),
      vh - TIP_H - 16
    )
    tipStyle = { position: 'fixed', top: `${tipTop}px`, left: `${tipLeft}px`, width: `${TIP_W}px` }
  } else if (current.side === 'bottom') {
    // Tooltip below the element
    const tipTop = spotTop + spotHeight + 16
    const tipLeft = Math.min(
      Math.max(spotLeft, 16),
      vw - TIP_W - 16
    )
    tipStyle = { position: 'fixed', top: `${tipTop}px`, left: `${tipLeft}px`, width: `${TIP_W}px` }
  } else if (current.side === 'top') {
    const tipTop = spotTop - TIP_H - 16
    const tipLeft = Math.min(Math.max(spotLeft, 16), vw - TIP_W - 16)
    tipStyle = { position: 'fixed', top: `${tipTop}px`, left: `${tipLeft}px`, width: `${TIP_W}px` }
  } else {
    // left
    const tipLeft = spotLeft - TIP_W - 16
    const tipTop = Math.min(Math.max(spotTop, 16), vh - TIP_H - 16)
    tipStyle = { position: 'fixed', top: `${tipTop}px`, left: `${tipLeft}px`, width: `${TIP_W}px` }
  }

  return (
    <>
      {/* ── Overlay with spotlight cutout ── */}
      {hasSpot ? (
        // Four rectangles forming a frame around the spotlight
        <>
          {/* Top */}
          <div style={{
            position: 'fixed', zIndex: 9998, pointerEvents: 'none',
            top: 0, left: 0, right: 0, height: `${spotTop}px`,
            background: 'rgba(0,0,0,0.72)',
          }} />
          {/* Bottom */}
          <div style={{
            position: 'fixed', zIndex: 9998, pointerEvents: 'none',
            top: `${spotTop + spotHeight}px`, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.72)',
          }} />
          {/* Left */}
          <div style={{
            position: 'fixed', zIndex: 9998, pointerEvents: 'none',
            top: `${spotTop}px`, left: 0, width: `${spotLeft}px`, height: `${spotHeight}px`,
            background: 'rgba(0,0,0,0.72)',
          }} />
          {/* Right */}
          <div style={{
            position: 'fixed', zIndex: 9998, pointerEvents: 'none',
            top: `${spotTop}px`, left: `${spotLeft + spotWidth}px`, right: 0, height: `${spotHeight}px`,
            background: 'rgba(0,0,0,0.72)',
          }} />
          {/* Spotlight border ring */}
          <div style={{
            position: 'fixed', zIndex: 9999, pointerEvents: 'none',
            top: `${spotTop}px`, left: `${spotLeft}px`,
            width: `${spotWidth}px`, height: `${spotHeight}px`,
            borderRadius: '10px',
            boxShadow: `0 0 0 2px ${GOLD}88, 0 0 24px ${GOLD}33`,
            transition: 'all 0.35s ease',
          }} />
        </>
      ) : (
        // Full dark overlay for centered steps
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.72)',
          pointerEvents: 'none',
        }} />
      )}

      {/* ── Tooltip card ── */}
      <div style={{
        ...tipStyle,
        zIndex: 10000,
        backgroundColor: '#111',
        border: `1px solid ${GOLD}44`,
        borderRadius: '14px',
        padding: '22px',
        boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px ${GOLD}22`,
        transition: 'top 0.35s ease, left 0.35s ease',
      }}>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? '16px' : '5px',
                height: '4px', borderRadius: '2px',
                backgroundColor: i === step ? GOLD : i < step ? `${GOLD}55` : '#222',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <h3 style={{
          color: '#F5F5F5', fontSize: '14px', fontWeight: '700',
          margin: '0 0 8px 0', lineHeight: '1.4',
        }}>
          {current.title}
        </h3>
        <p style={{
          color: '#777', fontSize: '12.5px', lineHeight: '1.7',
          margin: '0 0 18px 0',
        }}>
          {current.body}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#333', fontSize: '11px' }}>{step + 1} / {STEPS.length}</span>
          <div style={{ display: 'flex', gap: '7px' }}>
            {step > 0 && (
              <button onClick={prev} style={{
                padding: '6px 12px', backgroundColor: 'transparent',
                color: '#555', border: '1px solid #1E1E1E',
                borderRadius: '7px', fontSize: '12px', cursor: 'pointer',
              }}>
                ← Back
              </button>
            )}
            <button onClick={dismiss} style={{
              padding: '6px 12px', backgroundColor: 'transparent',
              color: '#444', border: '1px solid #1E1E1E',
              borderRadius: '7px', fontSize: '12px', cursor: 'pointer',
            }}>
              Skip
            </button>
            <button onClick={next} style={{
              padding: '6px 14px', backgroundColor: GOLD,
              color: '#fff', border: 'none',
              borderRadius: '7px', fontSize: '12.5px',
              fontWeight: '600', cursor: 'pointer',
            }}>
              {isLast ? 'Done ✓' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
