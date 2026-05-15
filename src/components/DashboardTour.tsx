'use client'

import { useState, useEffect } from 'react'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'
const TOUR_KEY = 'comply_ae_tour_v1'

const STEPS = [
  {
    title: '👋 Welcome to your dashboard',
    body: 'This is your command center. Everything you need to manage your Dubai properties is here — let us walk you through it quickly.',
  },
  {
    title: '📊 Portfolio Overview',
    body: 'The stat cards at the top show your portfolio at a glance — total properties, how many are occupied or vacant, and any Ejari alerts that need attention.',
  },
  {
    title: '⚠️ Ejari Alerts',
    body: 'Ejari must be renewed every year in Dubai. Missing a renewal can result in AED 10,000+ fines. Red means expired, orange means due within 30 days, gold means within 90 days.',
  },
  {
    title: '🏠 Properties',
    body: 'Add and manage all your Dubai units. Track Ejari numbers, link tenants, set rent amounts, and monitor compliance status for each property.',
  },
  {
    title: '💰 Rent',
    body: 'Log rent payments per property and period. Mark payments as paid, partial, or late. Track outstanding balances and export payment history.',
  },
  {
    title: '🔧 Maintenance',
    body: 'Log maintenance requests per property. Assign them to contractors, set priority levels, track status from open to completed, and record costs.',
  },
  {
    title: '🔒 Vault',
    body: 'Upload and store title deeds, NOCs, insurance policies, service charge notices, and floor plans — all linked to the right property and flagged when expiring.',
  },
  {
    title: '📝 Inspections',
    body: 'Create digital move-in and move-out condition reports. Go room by room, add photos, and export a signed PDF to share with your tenant.',
  },
  {
    title: '📊 Reports',
    body: 'Export a professional PDF report of your full portfolio including rent history, maintenance costs, Ejari compliance, and document expiry status.',
  },
  {
    title: '🧹 Services',
    body: 'Find trusted Dubai service providers for cleaning, AC servicing, pest control, handymen, moving, and pool maintenance — all with real market pricing.',
  },
  {
    title: "✅ You're all set!",
    body: "That's everything. Explore at your own pace — each section has clear labels and forms to guide you. You can always sign out and come back from where you left off.",
  },
]

export default function DashboardTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY)
    if (!seen) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, 'true')
    setVisible(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      {/* Subtle overlay — doesn't block interaction */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 998,
        background: 'rgba(0,0,0,0.35)',
        pointerEvents: 'none',
      }} />

      {/* Tour card — bottom right */}
      <div style={{
        position: 'fixed', bottom: '32px', right: '32px',
        zIndex: 999, width: '320px',
        backgroundColor: '#111',
        border: `1px solid ${GOLD}44`,
        borderRadius: '14px',
        padding: '24px',
        boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${GOLD}22`,
      }}>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '18px' : '6px',
              height: '4px', borderRadius: '2px',
              backgroundColor: i === step ? GOLD : i < step ? `${GOLD}55` : BORDER,
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Content */}
        <h3 style={{
          color: '#F5F5F5', fontSize: '15px', fontWeight: '700',
          margin: '0 0 10px 0', lineHeight: '1.3',
        }}>
          {current.title}
        </h3>
        <p style={{
          color: '#888', fontSize: '13px', lineHeight: '1.7',
          margin: '0 0 20px 0',
        }}>
          {current.body}
        </p>

        {/* Step counter + buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#444', fontSize: '12px' }}>
            {step + 1} / {STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={dismiss} style={{
              padding: '7px 14px', backgroundColor: 'transparent',
              color: '#444', border: `1px solid ${BORDER}`,
              borderRadius: '7px', fontSize: '12px', cursor: 'pointer',
            }}>
              Skip
            </button>
            <button onClick={next} style={{
              padding: '7px 16px', backgroundColor: GOLD,
              color: '#fff', border: 'none',
              borderRadius: '7px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer',
            }}>
              {isLast ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
