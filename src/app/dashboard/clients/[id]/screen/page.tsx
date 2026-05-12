'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  full_name: string
  nationality: string
  email: string
  risk_level: string
}

type Screening = {
  id: string
  created_at: string
  screened_by: string
  result: string
  lists_checked: string[]
  notes: string
  next_review_date: string | null
}

const sanctionsLists = [
  {
    id: 'uae_local',
    name: 'UAE Local Terrorist List',
    authority: 'UAE CBUAE',
    url: 'https://www.cbuae.gov.ae/en/Pages/Notices/LocalTerroristList.aspx',
    description: 'UAE Cabinet-designated terrorists and terrorist organisations',
    required: true,
    color: '#f87171',
    bg: '#2d0f0f',
    border: '#7f1d1d',
  },
  {
    id: 'un_consolidated',
    name: 'UN Consolidated Sanctions List',
    authority: 'United Nations Security Council',
    url: 'https://www.un.org/securitycouncil/content/un-sc-consolidated-list',
    description: 'Al-Qaida, Taliban, ISIL and other Security Council-listed individuals and entities',
    required: true,
    color: '#f87171',
    bg: '#2d0f0f',
    border: '#7f1d1d',
  },
  {
    id: 'ofac_sdn',
    name: 'OFAC SDN List',
    authority: 'US Treasury — OFAC',
    url: 'https://sanctionssearch.ofac.treas.gov/',
    description: 'Specially Designated Nationals and Blocked Persons List',
    required: true,
    color: '#f59e0b',
    bg: '#12100A',
    border: '#92400e',
  },
  {
    id: 'eu_sanctions',
    name: 'EU Consolidated Sanctions List',
    authority: 'European Union',
    url: 'https://www.sanctionsmap.eu/',
    description: 'EU sanctions map and consolidated list of persons, groups and entities',
    required: true,
    color: '#f59e0b',
    bg: '#12100A',
    border: '#92400e',
  },
  {
    id: 'uk_sanctions',
    name: 'UK Financial Sanctions List',
    authority: 'HM Treasury — OFSI',
    url: 'https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets',
    description: 'UK consolidated list of asset freeze targets',
    required: false,
    color: '#C9963F',
    bg: '#0D0D0D',
    border: '#1E1E1E',
  },
  {
    id: 'world_bank_debarred',
    name: 'World Bank Debarred Firms',
    authority: 'World Bank Group',
    url: 'https://www.worldbank.org/en/projects-operations/procurement/debarred-firms',
    description: 'Firms and individuals ineligible for World Bank-financed contracts',
    required: false,
    color: '#C9963F',
    bg: '#0D0D0D',
    border: '#1E1E1E',
  },
]

const pepResources = [
  {
    name: 'OpenSanctions PEP Database',
    url: 'https://www.opensanctions.org/search/',
    description: 'Free searchable database of PEPs, sanctions, and criminal watchlists',
  },
  {
    name: 'Interpol Notices',
    url: 'https://www.interpol.int/How-we-work/Notices/View-Red-Notices',
    description: 'Interpol Red Notices for internationally wanted persons',
  },
  {
    name: 'UAE Government Officials',
    url: 'https://u.ae/en/about-the-uae/government/government-officials',
    description: 'Reference for UAE federal and local government officials (PEP check)',
  },
]

const resultOptions = [
  {
    value: 'clear',
    label: 'Clear — No Match Found',
    description: 'Client name checked against all selected lists. No matches found.',
    color: '#4ade80',
    bg: '#052e16',
    border: '#166534',
  },
  {
    value: 'potential_match',
    label: 'Potential Match — Under Review',
    description: 'A possible match was found. Further investigation is required before proceeding.',
    color: '#f59e0b',
    bg: '#12100A',
    border: '#92400e',
  },
  {
    value: 'confirmed_match',
    label: 'Confirmed Match — Escalate Immediately',
    description: 'A confirmed match was found. Do not proceed. Escalate to senior management and consider filing an STR.',
    color: '#f87171',
    bg: '#2d0f0f',
    border: '#7f1d1d',
  },
  {
    value: 'pep_identified',
    label: 'PEP Identified — EDD Required',
    description: 'Client is identified as a Politically Exposed Person. Enhanced Due Diligence is mandatory.',
    color: '#C9963F',
    bg: '#12100A',
    border: '#C9963F44',
  },
]

export default function SanctionsScreenPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pastScreenings, setPastScreenings] = useState<Screening[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  const [checkedLists, setCheckedLists] = useState<string[]>([])
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')
  const [nextReview, setNextReview] = useState('')

  // Default next review to 12 months from today
  useEffect(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    setNextReview(d.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserEmail(user.email || '')

      const { data: clientData } = await supabase.from('clients').select('*').eq('id', clientId).single()
      if (clientData) setClient(clientData)

      const { data: screenings } = await supabase
        .from('sanctions_screenings')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      setPastScreenings(screenings || [])

      setLoading(false)
    }
    init()
  }, [clientId, router])

  const toggleList = (id: string) => {
    setCheckedLists(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  const checkAllRequired = () => {
    const required = sanctionsLists.filter(l => l.required).map(l => l.id)
    const allChecked = required.every(id => checkedLists.includes(id))
    if (allChecked) setCheckedLists(prev => prev.filter(id => !required.includes(id)))
    else setCheckedLists(prev => [...new Set([...prev, ...required])])
  }

  const saveScreening = async () => {
    if (!client || !result || checkedLists.length === 0) return
    setSaving(true)

    const { error } = await supabase.from('sanctions_screenings').insert([{
      client_id: client.id,
      screened_by: currentUserEmail,
      result,
      lists_checked: checkedLists,
      notes,
      next_review_date: nextReview || null,
    }])

    if (!error) {
      // Update client risk level if confirmed match or PEP
      if (result === 'confirmed_match' || result === 'pep_identified') {
        await supabase.from('clients').update({ risk_level: 'high' }).eq('id', client.id)
      }

      const { data } = await supabase
        .from('sanctions_screenings')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      setPastScreenings(data || [])

      setSaved(true)
      setCheckedLists([])
      setResult('')
      setNotes('')
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const requiredChecked = sanctionsLists.filter(l => l.required).every(l => checkedLists.includes(l.id))
  const canSave = result && checkedLists.length > 0

  if (loading) return <div style={{ padding: '40px 32px' }}><p style={{ color: '#8888aa' }}>Loading...</p></div>

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    backgroundColor: '#080808',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const sectionStyle = {
    backgroundColor: '#0D0D0D',
    border: '1px solid #1E1E1E',
    borderRadius: '12px',
    marginBottom: '20px',
    overflow: 'hidden',
  }

  const sectionHeaderStyle = {
    backgroundColor: '#0D0D07',
    padding: '14px 24px',
    borderBottom: '1px solid #1E1E1E',
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button
            onClick={() => router.push(`/dashboard/clients/${clientId}`)}
            style={{ background: 'none', border: 'none', color: '#C9963F', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '8px' }}
          >
            ← Back to {client?.full_name}
          </button>
          <h2 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0' }}>PEP & Sanctions Screen</h2>
          <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>Screen client against international sanctions lists and PEP databases</p>
        </div>
        {saved && (
          <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: '600', marginTop: '8px' }}>✓ Screening Saved</span>
        )}
      </div>

      {/* Client name card */}
      <div style={{ backgroundColor: '#0D0D07', border: '1px solid #C9963F44', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px' }}>
        <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>SCREENING SUBJECT</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0' }}>{client?.full_name}</p>
            <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>{client?.nationality}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>LAST SCREENED</p>
            <p style={{ color: pastScreenings.length > 0 ? '#4ade80' : '#f59e0b', fontSize: '13px', fontWeight: '600', margin: 0 }}>
              {pastScreenings.length > 0
                ? new Date(pastScreenings[0].created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Never screened'}
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Sanctions Lists */}
      <div style={sectionStyle}>
        <div style={{ ...sectionHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Step 1 — Check Sanctions Lists</h3>
            <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Open each link, search the client name, then tick the box confirming you checked it</p>
          </div>
          <button
            onClick={checkAllRequired}
            style={{ padding: '6px 14px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#C9963F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            {requiredChecked ? 'Uncheck Required' : '✓ Check All Required'}
          </button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sanctionsLists.map(list => {
            const isChecked = checkedLists.includes(list.id)
            return (
              <div
                key={list.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  backgroundColor: isChecked ? list.bg : '#080808',
                  border: `1px solid ${isChecked ? list.border : '#1E1E1E'}`,
                  borderRadius: '10px',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleList(list.id)}
                  style={{
                    width: '22px', height: '22px',
                    borderRadius: '5px',
                    backgroundColor: isChecked ? list.color : 'transparent',
                    border: `2px solid ${isChecked ? list.color : '#1E1E1E'}`,
                    flexShrink: 0,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isChecked && <span style={{ color: '#000000', fontSize: '13px', fontWeight: '900', lineHeight: 1 }}>✓</span>}
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <p style={{ color: isChecked ? list.color : '#ffffff', fontSize: '14px', fontWeight: '600', margin: 0 }}>{list.name}</p>
                    {list.required && (
                      <span style={{ padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', backgroundColor: '#2d0f0f', color: '#f87171', border: '1px solid #7f1d1d' }}>REQUIRED</span>
                    )}
                  </div>
                  <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>{list.authority} · {list.description}</p>
                </div>

                {/* Link */}
                <a
                  href={list.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px 14px',
                    backgroundColor: 'transparent',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#C9963F',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Open List ↗
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 2: PEP Check */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Step 2 — PEP Check (Politically Exposed Person)</h3>
          <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Search these databases to determine if the client holds or held a public position</p>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pepResources.map(res => (
            <div key={res.name} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '8px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600', margin: '0 0 2px 0' }}>{res.name}</p>
                <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>{res.description}</p>
              </div>
              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '6px 14px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '6px', color: '#C9963F', fontSize: '12px', fontWeight: '600', textDecoration: 'none', flexShrink: 0 }}
              >
                Open ↗
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Step 3: Record Result */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', margin: 0 }}>Step 3 — Record Screening Result</h3>
          <p style={{ color: '#8888aa', fontSize: '12px', margin: '2px 0 0 0' }}>Select the outcome and save to create an auditable compliance record</p>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Result options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {resultOptions.map(opt => {
              const isSelected = result === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setResult(opt.value)}
                  style={{
                    padding: '14px 16px',
                    backgroundColor: isSelected ? opt.bg : '#080808',
                    border: `2px solid ${isSelected ? opt.color : '#1E1E1E'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: isSelected ? opt.color : 'transparent', border: `2px solid ${isSelected ? opt.color : '#1E1E1E'}`, flexShrink: 0 }} />
                    <span style={{ color: isSelected ? opt.color : '#ccccdd', fontSize: '13px', fontWeight: '700' }}>{opt.label}</span>
                  </div>
                  <p style={{ color: '#8888aa', fontSize: '11px', margin: '0 0 0 22px', lineHeight: '1.4' }}>{opt.description}</p>
                </button>
              )
            })}
          </div>

          {/* Notes */}
          <div>
            <label style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
              SCREENING NOTES
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe what was found, what was checked, any partial matches investigated, or other observations relevant to this screening..."
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' as const, lineHeight: '1.6' }}
            />
          </div>

          {/* Next review date */}
          <div>
            <label style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
              NEXT REVIEW DATE
            </label>
            <input
              type="date"
              value={nextReview}
              onChange={e => setNextReview(e.target.value)}
              style={{ ...inputStyle, maxWidth: '240px' }}
            />
            <p style={{ color: '#8888aa', fontSize: '12px', margin: '6px 0 0 0' }}>Regulators recommend screening at least annually, or when risk profile changes</p>
          </div>

          {/* Lists checked summary */}
          <div style={{ backgroundColor: '#080808', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '12px 16px' }}>
            <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', margin: '0 0 6px 0' }}>LISTS CHECKED ({checkedLists.length}/{sanctionsLists.length})</p>
            {checkedLists.length === 0 ? (
              <p style={{ color: '#8888aa', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>No lists checked yet — tick the checkboxes in Step 1 above</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {checkedLists.map(id => {
                  const list = sanctionsLists.find(l => l.id === id)
                  return list ? (
                    <span key={id} style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', backgroundColor: list.bg, color: list.color, border: `1px solid ${list.border}` }}>
                      {list.name}
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
        <button
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #1E1E1E', borderRadius: '8px', color: '#8888aa', fontSize: '14px', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={saveScreening}
          disabled={!canSave || saving}
          style={{
            padding: '10px 24px',
            backgroundColor: canSave ? '#C9963F' : '#1E1E1E',
            border: 'none',
            borderRadius: '8px',
            color: canSave ? '#ffffff' : '#8888aa',
            fontSize: '14px',
            fontWeight: '700',
            cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : !result ? 'Select a result to save' : checkedLists.length === 0 ? 'Check at least one list' : 'Save Screening Record'}
        </button>
      </div>

      {/* Past Screenings */}
      {pastScreenings.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <p style={{ color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>SCREENING HISTORY</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pastScreenings.map(s => {
              const opt = resultOptions.find(o => o.value === s.result)
              return (
                <div key={s.id} style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: s.notes ? '8px' : 0 }}>
                    <div>
                      <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', margin: '0 0 3px 0' }}>
                        {opt?.label || s.result}
                      </p>
                      <p style={{ color: '#8888aa', fontSize: '12px', margin: '0 0 4px 0' }}>
                        Screened by {s.screened_by} · {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>
                        Lists checked: {(s.lists_checked || []).length} ·
                        {s.next_review_date ? ` Next review: ${new Date(s.next_review_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' No review date set'}
                      </p>
                    </div>
                    {opt && (
                      <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: opt.bg, color: opt.color, border: `1px solid ${opt.border}`, flexShrink: 0, marginLeft: '16px' }}>
                        {s.result === 'clear' ? 'CLEAR' : s.result === 'potential_match' ? 'POTENTIAL MATCH' : s.result === 'confirmed_match' ? 'CONFIRMED MATCH' : 'PEP'}
                      </span>
                    )}
                  </div>
                  {s.notes && (
                    <p style={{ color: '#8888aa', fontSize: '12px', margin: 0, fontStyle: 'italic', borderTop: '1px solid #1E1E1E', paddingTop: '8px' }}>{s.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
