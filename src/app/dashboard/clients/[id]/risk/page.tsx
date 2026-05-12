'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  full_name: string
  nationality: string
  risk_level: string
}

type RiskAssessment = {
  id: string
  created_at: string
  assessed_by: string
  total_score: number
  determination: string
  risk_level: string
  notes: string
  scores: Record<string, number>
}

const questions = [
  {
    id: 'nationality_risk',
    label: 'Client Nationality / Country of Origin',
    description: 'Based on FATF and UAE CBUAE country risk classification',
    options: [
      { label: 'Low-risk country (UAE, GCC, UK, EU, US, Australia, Canada, Japan)', score: 1 },
      { label: 'Medium-risk country (not on FATF lists, limited AML framework)', score: 2 },
      { label: 'High-risk country (FATF grey or black list, sanctioned jurisdiction)', score: 3 },
    ],
  },
  {
    id: 'pep_status',
    label: 'PEP Status (Politically Exposed Person)',
    description: 'Whether the client holds or held a prominent public position',
    options: [
      { label: 'Not a PEP and no known close associates who are PEPs', score: 1 },
      { label: 'Former PEP (left position more than 12 months ago)', score: 2 },
      { label: 'Current PEP or immediate family / close associate of a PEP', score: 3 },
    ],
  },
  {
    id: 'source_of_funds',
    label: 'Source of Funds Clarity',
    description: 'How well the origin of the client\'s funds is documented and verified',
    options: [
      { label: 'Fully documented and independently verifiable (salary, business income, inheritance)', score: 1 },
      { label: 'Partially documented — some evidence provided but gaps exist', score: 2 },
      { label: 'Unclear, inconsistent, or unable to verify the stated source', score: 3 },
    ],
  },
  {
    id: 'transaction_value',
    label: 'Transaction Value',
    description: 'Total value of the real estate transaction',
    options: [
      { label: 'Less than AED 500,000', score: 1 },
      { label: 'AED 500,000 – AED 2,000,000', score: 2 },
      { label: 'More than AED 2,000,000', score: 3 },
    ],
  },
  {
    id: 'cash_involvement',
    label: 'Cash Involvement',
    description: 'Whether any portion of the transaction is paid in cash',
    options: [
      { label: 'No cash — fully paid by bank transfer, cheque, or mortgage', score: 1 },
      { label: 'Some cash involved but below AED 55,000 threshold', score: 2 },
      { label: 'Cash component equals or exceeds AED 55,000 (REAR required)', score: 3 },
    ],
  },
  {
    id: 'business_relationship',
    label: 'Nature of Business Relationship',
    description: 'How the client came to your agency and how long you\'ve known them',
    options: [
      { label: 'Existing client with established track record (1+ years)', score: 1 },
      { label: 'New client referred by a known and trusted source', score: 2 },
      { label: 'New walk-in / cold client with no prior relationship', score: 3 },
    ],
  },
  {
    id: 'transaction_purpose',
    label: 'Purpose of Transaction',
    description: 'The stated reason the client is purchasing or leasing the property',
    options: [
      { label: 'Own use / primary or holiday residence — clearly stated', score: 1 },
      { label: 'Investment — rental income or capital appreciation, plausible', score: 2 },
      { label: 'Third-party purchase, unclear purpose, or inconsistent explanation', score: 3 },
    ],
  },
  {
    id: 'geographic_risk',
    label: 'Geographic Risk of Funds Origin',
    description: 'Where the client\'s money is coming from (country of funds transfer)',
    options: [
      { label: 'UAE domestic funds or low-risk jurisdiction (GCC, EU, US)', score: 1 },
      { label: 'Medium-risk jurisdiction — funds origin is known but monitored', score: 2 },
      { label: 'High-risk or offshore jurisdiction — limited transparency', score: 3 },
    ],
  },
  {
    id: 'sanctions_screening',
    label: 'Sanctions Screening Result',
    description: 'Result of screening client name against UAE, UN, OFAC, and EU sanctions lists',
    options: [
      { label: 'Clear — no matches found on any sanctions or watchlist', score: 1 },
      { label: 'Partial match found — investigated and confirmed different person', score: 2 },
      { label: 'Positive match or unresolved flag — escalation required', score: 3 },
    ],
  },
  {
    id: 'ownership_structure',
    label: 'Complexity of Ownership / Client Structure',
    description: 'Whether the client is an individual or a complex legal entity',
    options: [
      { label: 'Individual client — straightforward personal purchase', score: 1 },
      { label: 'Local UAE company or simple corporate structure with clear UBO', score: 2 },
      { label: 'Offshore company, trust, nominee, or complex layered structure', score: 3 },
    ],
  },
]

const getDetermination = (score: number) => {
  if (score <= 15) return { level: 'low', determination: 'CDD', label: 'Standard CDD', color: '#4ade80', bg: '#052e16', border: '#166534', description: 'Client poses low money laundering risk. Standard Customer Due Diligence procedures apply. Continue with normal KYC process.' }
  if (score <= 22) return { level: 'medium', determination: 'CDD+', label: 'CDD with Enhanced Monitoring', color: '#f59e0b', bg: '#12100A', border: '#92400e', description: 'Client poses moderate risk. Apply standard CDD with additional scrutiny. Monitor the relationship more closely and review periodically.' }
  return { level: 'high', determination: 'EDD', label: 'EDD Required', color: '#f87171', bg: '#2d0f0f', border: '#7f1d1d', description: 'Client poses elevated money laundering risk. Enhanced Due Diligence is legally required. Senior approval needed before proceeding. Consider filing STR if suspicious activity is identified.' }
}

export default function RiskAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pastAssessments, setPastAssessments] = useState<RiskAssessment[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserEmail(user.email || '')

      const { data: clientData } = await supabase.from('clients').select('*').eq('id', clientId).single()
      if (clientData) setClient(clientData)

      const { data: assessments } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      setPastAssessments(assessments || [])

      setLoading(false)
    }
    init()
  }, [clientId, router])

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const answeredCount = Object.keys(scores).length
  const allAnswered = answeredCount === questions.length
  const result = allAnswered ? getDetermination(totalScore) : null

  const handleScore = (questionId: string, score: number) => {
    setScores(prev => ({ ...prev, [questionId]: score }))
  }

  const saveAssessment = async () => {
    if (!client || !allAnswered) return
    setSaving(true)
    const det = getDetermination(totalScore)

    const { error } = await supabase.from('risk_assessments').insert([{
      client_id: client.id,
      assessed_by: currentUserEmail,
      scores,
      total_score: totalScore,
      determination: det.determination,
      risk_level: det.level,
      notes,
    }])

    if (!error) {
      // Also update client risk level
      await supabase.from('clients').update({ risk_level: det.level }).eq('id', client.id)

      // Refresh past assessments
      const { data } = await supabase.from('risk_assessments').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
      setPastAssessments(data || [])
      setSubmitted(true)
    }
    setSaving(false)
  }

  const resetForm = () => {
    setScores({})
    setNotes('')
    setSubmitted(false)
  }

  if (loading) return <div style={{ padding: '40px 32px' }}><p style={{ color: '#8888aa' }}>Loading...</p></div>

  return (
    <div style={{ padding: '40px 32px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          style={{ background: 'none', border: 'none', color: '#C9963F', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '10px' }}
        >
          ← Back to {client?.full_name}
        </button>
        <h2 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0' }}>CDD / EDD Risk Assessment</h2>
        <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>
          Answer all 10 questions to determine the due diligence level required for this client
        </p>
      </div>

      {/* Info banner */}
      <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #C9963F44', borderRadius: '10px', padding: '14px 20px', marginBottom: '28px', display: 'flex', gap: '12px' }}>
        <span style={{ fontSize: '18px' }}>📋</span>
        <div>
          <p style={{ color: '#C9963F', fontSize: '13px', fontWeight: '600', margin: '0 0 2px 0' }}>UAE AML Law Compliance</p>
          <p style={{ color: '#8888aa', fontSize: '13px', margin: 0 }}>
            Based on CBUAE guidelines and FATF recommendations. Score 10–15 = Standard CDD · 16–22 = Enhanced Monitoring · 23–30 = EDD Required
          </p>
        </div>
      </div>

      {submitted ? (
        // Success state
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px 0' }}>✅</p>
          <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' }}>Assessment Saved</h3>
          <p style={{ color: '#8888aa', fontSize: '14px', margin: '0 0 24px 0' }}>
            The client's risk profile has been updated to reflect this assessment.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={resetForm} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '8px', color: '#8888aa', fontSize: '14px', cursor: 'pointer' }}>
              New Assessment
            </button>
            <button onClick={() => router.push(`/dashboard/clients/${clientId}`)} style={{ padding: '10px 20px', backgroundColor: '#C9963F', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Back to Client
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Score progress */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>QUESTIONS ANSWERED</p>
              <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: 0 }}>{answeredCount} / {questions.length}</p>
            </div>
            {answeredCount > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>CURRENT SCORE</p>
                <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: 0 }}>{totalScore} / 30</p>
              </div>
            )}
            {result && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>DETERMINATION</p>
                <span style={{ padding: '4px 14px', borderRadius: '999px', fontSize: '14px', fontWeight: '800', backgroundColor: result.bg, color: result.color, border: `1px solid ${result.border}` }}>
                  {result.determination}
                </span>
              </div>
            )}
          </div>

          {/* Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  backgroundColor: '#0D0D0D',
                  border: `1px solid ${scores[q.id] ? '#C9963F4455' : '#1E1E1E'}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E1E1E', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: scores[q.id] ? '#C9963F' : '#080808', border: `1px solid ${scores[q.id] ? '#C9963F' : '#1E1E1E'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: '700', color: scores[q.id] ? '#ffffff' : '#8888aa' }}>
                    {idx + 1}
                  </div>
                  <div>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', margin: '0 0 3px 0' }}>{q.label}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>{q.description}</p>
                  </div>
                </div>
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = scores[q.id] === opt.score
                    const riskColors = ['#4ade80', '#f59e0b', '#f87171']
                    const riskBgs = ['#052e16', '#12100A', '#2d0f0f']
                    const riskBorders = ['#166534', '#92400e', '#7f1d1d']
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleScore(q.id, opt.score)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          backgroundColor: isSelected ? riskBgs[optIdx] : '#080808',
                          border: `1px solid ${isSelected ? riskBorders[optIdx] : '#1E1E1E'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: isSelected ? riskColors[optIdx] : 'transparent', border: `2px solid ${isSelected ? riskColors[optIdx] : '#1E1E1E'}`, flexShrink: 0 }} />
                        <span style={{ color: isSelected ? riskColors[optIdx] : '#ccccdd', fontSize: '13px', flex: 1 }}>{opt.label}</span>
                        <span style={{ color: isSelected ? riskColors[optIdx] : '#8888aa', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{opt.score} pt{opt.score > 1 ? 's' : ''}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Result card */}
          {result && (
            <div style={{ backgroundColor: result.bg, border: `1px solid ${result.border}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <p style={{ color: result.color, fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0' }}>{result.label}</p>
                  <p style={{ color: '#8888aa', fontSize: '13px', margin: 0 }}>Score: {totalScore} / 30</p>
                </div>
                <span style={{ padding: '6px 18px', borderRadius: '999px', fontSize: '16px', fontWeight: '900', backgroundColor: '#080808', color: result.color, border: `1px solid ${result.border}` }}>
                  {result.determination}
                </span>
              </div>
              <p style={{ color: '#ccccdd', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{result.description}</p>
            </div>
          )}

          {/* Notes */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <label style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              ASSESSOR NOTES (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any observations, justifications, or additional context for this risk assessment..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '8px', color: '#ffffff', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => router.push(`/dashboard/clients/${clientId}`)}
              style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '8px', color: '#8888aa', fontSize: '14px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={saveAssessment}
              disabled={!allAnswered || saving}
              style={{
                padding: '10px 24px',
                backgroundColor: allAnswered ? '#C9963F' : '#1E1E1E',
                border: 'none',
                borderRadius: '8px',
                color: allAnswered ? '#ffffff' : '#8888aa',
                fontSize: '14px',
                fontWeight: '700',
                cursor: allAnswered ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : !allAnswered ? `Answer all questions (${answeredCount}/${questions.length})` : 'Save Assessment & Update Risk Level'}
            </button>
          </div>
        </>
      )}

      {/* Past Assessments */}
      {pastAssessments.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>PREVIOUS ASSESSMENTS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pastAssessments.map(a => {
              const det = getDetermination(a.total_score)
              return (
                <div key={a.id} style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', margin: '0 0 3px 0' }}>
                      Score: {a.total_score}/30 —{' '}
                      <span style={{ color: det.color }}>{det.label}</span>
                    </p>
                    <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>
                      Assessed by {a.assessed_by} · {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {a.notes && <p style={{ color: '#8888aa', fontSize: '12px', margin: '4px 0 0 0', fontStyle: 'italic' }}>{a.notes}</p>}
                  </div>
                  <span style={{ padding: '4px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '800', backgroundColor: det.bg, color: det.color, border: `1px solid ${det.border}`, flexShrink: 0, marginLeft: '16px' }}>
                    {a.determination}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
