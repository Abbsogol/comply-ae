'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOLD = '#C9963F'
const DARK = '#080808'
const CARD = '#0D0D0D'
const BORDER = '#1E1E1E'

const AREAS = ['Dubai Marina', 'Downtown Dubai', 'Business Bay', 'Jumeirah Village Circle', 'Palm Jumeirah', 'Arabian Ranches', 'Dubai Hills Estate', 'Jumeirah Lake Towers', 'Al Barsha', 'Deira', 'Bur Dubai', 'Mirdif', 'Sports City', 'Motor City', 'Other']
const PROP_TYPES = ['apartment', 'villa', 'townhouse', 'studio', 'penthouse', 'office', 'retail']
const STATUSES = ['occupied', 'vacant', 'under maintenance']

type Property = {
  id: string
  unit_number: string | null
  building_name: string | null
  area: string | null
  property_type: string | null
  bedrooms: string | null
  ejari_number: string | null
  ejari_expiry: string | null
  title_deed_number: string | null
  tenant_id: string | null
  monthly_rent: number | null
  status: string | null
  notes: string | null
  created_at: string
  dewa_status: string | null
  dewa_account_number: string | null
  dewa_activation_date: string | null
  internet_provider: string | null
  internet_status: string | null
  internet_account_number: string | null
}

type Tenant = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  nationality: string | null
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || 'vacant').toLowerCase()
  const map: Record<string, { color: string; bg: string; border: string }> = {
    'occupied':           { color: '#4ade80', bg: '#0D1F0D', border: '#2a4a2a' },
    'vacant':             { color: '#888',    bg: '#111',    border: '#222'    },
    'under maintenance':  { color: '#E67E22', bg: '#1F150A', border: '#5a3a10' },
  }
  const st = map[s] || map['vacant']
  return (
    <span style={{
      fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em',
      color: st.color, background: st.bg, border: `1px solid ${st.border}`,
      padding: '4px 10px', borderRadius: '5px',
    }}>
      {s.toUpperCase()}
    </span>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: '12px', color: '#555', fontWeight: '500', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '13.5px', color: highlight ? GOLD : '#F0F0F0', fontWeight: highlight ? '600' : '400' }}>
        {value || '—'}
      </span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  backgroundColor: '#0A0A0A',
  border: `1px solid ${BORDER}`,
  borderRadius: '7px', color: '#F5F5F5',
  fontSize: '13.5px', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  color: '#555', fontSize: '11px', fontWeight: '600',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  display: 'block', marginBottom: '6px',
}

export default function PropertyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    unit_number: '',
    building_name: '',
    area: '',
    property_type: '',
    bedrooms: '',
    monthly_rent: '',
    status: '',
    ejari_number: '',
    ejari_expiry: '',
    title_deed_number: '',
    notes: '',
  })

  // Notes inline (view mode)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Tenant linking
  const [linkingTenant, setLinkingTenant] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState('')

  // Rent increases
  type RentIncrease = {
    id: string
    current_rent: number
    market_rate: number
    allowed_increase_pct: number
    new_rent: number
    notice_date: string
    effective_date: string
    status: 'draft' | 'sent' | 'acknowledged' | 'active'
    notes: string | null
    tenant_id: string | null
  }
  const [rentIncreases, setRentIncreases] = useState<RentIncrease[]>([])
  const [showRentForm, setShowRentForm] = useState(false)
  const [savingRent, setSavingRent] = useState(false)
  const [rentForm, setRentForm] = useState({
    current_rent: '',
    market_rate: '',
    notice_date: new Date().toISOString().split('T')[0],
    effective_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  })

  const calcRera = (current: number, market: number) => {
    if (!current || !market || market <= 0) return { pct: 0, newRent: current, belowPct: 0 }
    const belowPct = ((market - current) / market) * 100
    let pct = 0
    if (belowPct <= 10) pct = 0
    else if (belowPct <= 20) pct = 5
    else if (belowPct <= 30) pct = 10
    else if (belowPct <= 40) pct = 15
    else pct = 20
    const newRent = Math.round(current * (1 + pct / 100))
    return { pct, newRent, belowPct: Math.round(belowPct * 10) / 10 }
  }

  // Eviction notices
  type EvictionNotice = {
    id: string
    issue_date: string
    vacate_date: string
    reason: string | null
    status: 'draft' | 'sent' | 'acknowledged' | 'vacated'
    notes: string | null
    tenant_id: string | null
  }
  const [notices, setNotices] = useState<EvictionNotice[]>([])
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [savingNotice, setSavingNotice] = useState(false)
  const [noticeForm, setNoticeForm] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    vacate_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: 'non_renewal',
    notes: '',
  })

  // Access items
  type AccessItem = {
    id: string
    type: 'key' | 'access_card'
    issued_to: string | null
    issued_date: string | null
    status: 'active' | 'lost' | 'returned'
    security_company: string | null
    notes: string | null
  }
  const [accessItems, setAccessItems] = useState<AccessItem[]>([])
  const [showAddAccess, setShowAddAccess] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)
  const [accessForm, setAccessForm] = useState({
    type: 'key',
    issued_to: '',
    issued_date: '',
    security_company: '',
    notes: '',
  })

  // Handover
  const [activeHandover, setActiveHandover] = useState<{ id: string; type: string } | null>(null)
  const [startingHandover, setStartingHandover] = useState(false)

  // Utility inline edit
  const [editingUtilities, setEditingUtilities] = useState(false)
  const [savingUtilities, setSavingUtilities] = useState(false)
  const [utilForm, setUtilForm] = useState({
    dewa_status: 'pending',
    dewa_account_number: '',
    dewa_activation_date: '',
    internet_provider: '',
    internet_status: 'pending',
    internet_account_number: '',
  })

  const fetchProperty = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) { router.push('/dashboard/properties'); return }
    setProperty(data)
    setNotes(data.notes || '')
    setForm({
      unit_number:       data.unit_number || '',
      building_name:     data.building_name || '',
      area:              data.area || '',
      property_type:     data.property_type || '',
      bedrooms:          data.bedrooms || '',
      monthly_rent:      data.monthly_rent?.toString() || '',
      status:            (data.status || 'vacant').toLowerCase(),
      ejari_number:      data.ejari_number || '',
      ejari_expiry:      data.ejari_expiry || '',
      title_deed_number: data.title_deed_number || '',
      notes:             data.notes || '',
    })

    setUtilForm({
      dewa_status:            data.dewa_status || 'pending',
      dewa_account_number:    data.dewa_account_number || '',
      dewa_activation_date:   data.dewa_activation_date || '',
      internet_provider:      data.internet_provider || '',
      internet_status:        data.internet_status || 'pending',
      internet_account_number: data.internet_account_number || '',
    })

    if (data.tenant_id) {
      const { data: t } = await supabase.from('clients').select('id, full_name, email, phone, nationality').eq('id', data.tenant_id).single()
      if (t) setTenant(t)
    }
    setLoading(false)
  }

  const saveUtilities = async () => {
    setSavingUtilities(true)
    await supabase.from('properties').update({
      dewa_status:            utilForm.dewa_status,
      dewa_account_number:    utilForm.dewa_account_number || null,
      dewa_activation_date:   utilForm.dewa_activation_date || null,
      internet_provider:      utilForm.internet_provider || null,
      internet_status:        utilForm.internet_status,
      internet_account_number: utilForm.internet_account_number || null,
    }).eq('id', id)
    setProperty(p => p ? {
      ...p,
      dewa_status:            utilForm.dewa_status,
      dewa_account_number:    utilForm.dewa_account_number || null,
      dewa_activation_date:   utilForm.dewa_activation_date || null,
      internet_provider:      utilForm.internet_provider || null,
      internet_status:        utilForm.internet_status,
      internet_account_number: utilForm.internet_account_number || null,
    } : p)
    setSavingUtilities(false)
    setEditingUtilities(false)
  }

  const fetchAllTenants = async () => {
    const { data } = await supabase.from('clients').select('id, full_name, email, phone, nationality').order('full_name')
    if (data) setAllTenants(data)
  }

  const fetchRentIncreases = async () => {
    const { data } = await supabase
      .from('rent_increases')
      .select('*')
      .eq('property_id', id)
      .order('created_at', { ascending: false })
    if (data) setRentIncreases(data)
  }

  const createRentIncrease = async () => {
    const current = parseFloat(rentForm.current_rent)
    const market = parseFloat(rentForm.market_rate)
    if (!current || !market) { alert('Please enter both current rent and market rate.'); return }
    const { pct, newRent } = calcRera(current, market)
    if (pct === 0) { alert('Based on RERA rules, no rent increase is allowed — the current rent is within 10% of the market rate.'); return }
    setSavingRent(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingRent(false); return }
    const { data } = await supabase.from('rent_increases').insert({
      user_id: user.id,
      property_id: id,
      tenant_id: property?.tenant_id || null,
      current_rent: current,
      market_rate: market,
      allowed_increase_pct: pct,
      new_rent: newRent,
      notice_date: rentForm.notice_date,
      effective_date: rentForm.effective_date,
      notes: rentForm.notes || null,
      status: 'draft',
    }).select().single()
    if (data) setRentIncreases(prev => [data, ...prev])
    setShowRentForm(false)
    setSavingRent(false)
  }

  const updateRentIncreaseStatus = async (rid: string, status: RentIncrease['status']) => {
    await supabase.from('rent_increases').update({ status }).eq('id', rid)
    setRentIncreases(prev => prev.map(r => r.id === rid ? { ...r, status } : r))
  }

  const deleteRentIncrease = async (rid: string) => {
    if (!confirm('Delete this rent increase record?')) return
    await supabase.from('rent_increases').delete().eq('id', rid)
    setRentIncreases(prev => prev.filter(r => r.id !== rid))
  }

  const generateRentIncreasePDF = (r: RentIncrease) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { jsPDF } = require('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210
    const margin = 25
    const contentW = pageW - margin * 2
    let y = 25

    const noticeDate = new Date(r.notice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const effectiveDate = new Date(r.effective_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const propertyAddress = [property?.unit_number, property?.building_name, property?.area, 'Dubai, UAE'].filter(Boolean).join(', ')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('NOTICE OF RENT INCREASE', pageW / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Dubai, United Arab Emirates', pageW / 2, y, { align: 'center' })
    y += 12

    doc.setDrawColor(200, 150, 60)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageW - margin, y)
    y += 10

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.text(`Date: ${noticeDate}`, margin, y)
    y += 12

    doc.setFont('helvetica', 'bold')
    doc.text('To:', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.text(tenant?.full_name || 'The Tenant', margin, y)
    y += 5
    doc.text(propertyAddress, margin, y)
    y += 14

    doc.setFont('helvetica', 'bold')
    doc.text('Subject: Notice of Rent Increase', margin, y)
    y += 12

    doc.setFont('helvetica', 'normal')
    doc.text(`Dear ${tenant?.full_name || 'Tenant'},`, margin, y)
    y += 8

    const p1 = `This letter serves as formal notice that, in accordance with Dubai Law No. 26 of 2007 (as amended by Law No. 33 of 2008) and RERA Decree No. 43 of 2013 (Rent Increase Calculator), your rent will be increased effective ${effectiveDate}.`
    const l1 = doc.splitTextToSize(p1, contentW)
    doc.text(l1, margin, y)
    y += l1.length * 5.5 + 8

    doc.setFont('helvetica', 'bold')
    doc.text('Rent Details:', margin, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Current Annual Rent:   AED ${r.current_rent.toLocaleString()}`, margin + 5, y); y += 6
    doc.text(`Market Rate (RERA):    AED ${r.market_rate.toLocaleString()}`, margin + 5, y); y += 6
    doc.text(`Permitted Increase:    ${r.allowed_increase_pct}%`, margin + 5, y); y += 6
    doc.setFont('helvetica', 'bold')
    doc.text(`New Annual Rent:       AED ${r.new_rent.toLocaleString()}`, margin + 5, y)
    y += 10
    doc.setFont('helvetica', 'normal')

    const p2 = `This increase has been calculated in compliance with the RERA Rental Increase Calculator and does not exceed the maximum permitted increase. The new rent of AED ${r.new_rent.toLocaleString()} per annum will be effective from ${effectiveDate}.`
    const l2 = doc.splitTextToSize(p2, contentW)
    doc.text(l2, margin, y)
    y += l2.length * 5.5 + 8

    const p3 = `Please note that this notice is provided 90 days in advance as required by law. Should you have any queries regarding this notice, please contact us at your earliest convenience.`
    const l3 = doc.splitTextToSize(p3, contentW)
    doc.text(l3, margin, y)
    y += l3.length * 5.5 + 8

    if (r.notes) {
      const ln = doc.splitTextToSize(`Notes: ${r.notes}`, contentW)
      doc.text(ln, margin, y)
      y += ln.length * 5.5 + 8
    }

    y += 8
    doc.text('Yours sincerely,', margin, y)
    y += 14
    doc.setFont('helvetica', 'bold')
    doc.text('_______________________________', margin, y)
    y += 6
    doc.text('Landlord / Authorised Representative', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    doc.text(propertyAddress, margin, y)

    doc.setFontSize(9)
    doc.setTextColor(180, 180, 180)
    doc.text('Generated by COMPLY.AE — comply-ae.vercel.app', pageW / 2, 285, { align: 'center' })

    doc.save(`Rent_Increase_Notice_${(property?.unit_number || 'property').replace(/\s+/g, '_')}_${r.notice_date}.pdf`)
  }

  const fetchNotices = async () => {
    const { data } = await supabase
      .from('eviction_notices')
      .select('*')
      .eq('property_id', id)
      .order('created_at', { ascending: false })
    if (data) setNotices(data)
  }

  const createNotice = async () => {
    setSavingNotice(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingNotice(false); return }
    const { data } = await supabase.from('eviction_notices').insert({
      user_id: user.id,
      property_id: id,
      tenant_id: property?.tenant_id || null,
      issue_date: noticeForm.issue_date,
      vacate_date: noticeForm.vacate_date,
      reason: noticeForm.reason,
      notes: noticeForm.notes || null,
      status: 'draft',
    }).select().single()
    if (data) setNotices(prev => [data, ...prev])
    setShowNoticeForm(false)
    setSavingNotice(false)
  }

  const updateNoticeStatus = async (noticeId: string, status: EvictionNotice['status']) => {
    await supabase.from('eviction_notices').update({ status }).eq('id', noticeId)
    setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status } : n))
  }

  const deleteNotice = async (noticeId: string) => {
    if (!confirm('Delete this notice? This cannot be undone.')) return
    await supabase.from('eviction_notices').delete().eq('id', noticeId)
    setNotices(prev => prev.filter(n => n.id !== noticeId))
  }

  const generateNoticePDF = (notice: EvictionNotice) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { jsPDF } = require('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210
    const margin = 25
    const contentW = pageW - margin * 2
    let y = 25

    const reasonLabels: Record<string, string> = {
      non_renewal: 'non-renewal of tenancy contract',
      sale: 'sale of the property',
      personal_use: 'personal use by the landlord or first-degree relatives',
      renovation: 'major renovation or demolition requiring the property to be vacant',
    }
    const reasonText = reasonLabels[notice.reason || 'non_renewal'] || notice.reason || ''
    const issueDate = new Date(notice.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const vacateDate = new Date(notice.vacate_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const propertyAddress = [property?.unit_number, property?.building_name, property?.area, 'Dubai, UAE'].filter(Boolean).join(', ')

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(0, 0, 0)
    doc.text('NOTICE TO VACATE', pageW / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Dubai, United Arab Emirates', pageW / 2, y, { align: 'center' })
    y += 12

    // Divider
    doc.setDrawColor(200, 150, 60)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageW - margin, y)
    y += 10

    // Date
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(`Date: ${issueDate}`, margin, y)
    y += 12

    // To
    doc.setFont('helvetica', 'bold')
    doc.text('To:', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.text(tenant?.full_name || 'The Tenant', margin, y)
    y += 5
    doc.text(propertyAddress, margin, y)
    y += 14

    // Subject
    doc.setFont('helvetica', 'bold')
    doc.text('Subject: Notice to Vacate Premises', margin, y)
    y += 12

    // Body
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const body1 = `Dear ${tenant?.full_name || 'Tenant'},`
    doc.text(body1, margin, y)
    y += 8

    const para1 = `This letter serves as formal notice that you are required to vacate and surrender possession of the above-mentioned premises by ${vacateDate}, in accordance with the provisions of Dubai Law No. 26 of 2007 (as amended by Law No. 33 of 2008) regulating the relationship between landlords and tenants in the Emirate of Dubai.`
    const lines1 = doc.splitTextToSize(para1, contentW)
    doc.text(lines1, margin, y)
    y += lines1.length * 5.5 + 6

    const para2 = `The reason for this notice is: ${reasonText}.`
    const lines2 = doc.splitTextToSize(para2, contentW)
    doc.text(lines2, margin, y)
    y += lines2.length * 5.5 + 6

    const para3 = `Please be advised that this notice period of twelve (12) months is provided in compliance with Article 25 of Law No. 33 of 2008. You are kindly requested to vacate the property in good condition and return all keys and access cards by the specified date.`
    const lines3 = doc.splitTextToSize(para3, contentW)
    doc.text(lines3, margin, y)
    y += lines3.length * 5.5 + 6

    if (notice.notes) {
      const para4 = `Additional notes: ${notice.notes}`
      const lines4 = doc.splitTextToSize(para4, contentW)
      doc.text(lines4, margin, y)
      y += lines4.length * 5.5 + 6
    }

    y += 8
    doc.text('Yours sincerely,', margin, y)
    y += 14
    doc.setFont('helvetica', 'bold')
    doc.text('_______________________________', margin, y)
    y += 6
    doc.text('Landlord / Authorised Representative', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    doc.text(propertyAddress, margin, y)

    // Footer
    doc.setFontSize(9)
    doc.setTextColor(180, 180, 180)
    doc.text('Generated by COMPLY.AE — comply-ae.vercel.app', pageW / 2, 285, { align: 'center' })

    const filename = `Notice_to_Vacate_${(property?.unit_number || 'property').replace(/\s+/g, '_')}_${notice.issue_date}.pdf`
    doc.save(filename)
  }

  const fetchAccessItems = async () => {
    const { data } = await supabase
      .from('access_items')
      .select('*')
      .eq('property_id', id)
      .order('created_at', { ascending: false })
    if (data) setAccessItems(data)
  }

  const addAccessItem = async () => {
    setSavingAccess(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingAccess(false); return }
    const { data } = await supabase.from('access_items').insert({
      user_id: user.id,
      property_id: id,
      type: accessForm.type,
      issued_to: accessForm.issued_to || null,
      issued_date: accessForm.issued_date || null,
      security_company: accessForm.security_company || null,
      notes: accessForm.notes || null,
      status: 'active',
    }).select().single()
    if (data) setAccessItems(prev => [data, ...prev])
    setAccessForm({ type: 'key', issued_to: '', issued_date: '', security_company: '', notes: '' })
    setShowAddAccess(false)
    setSavingAccess(false)
  }

  const updateAccessStatus = async (itemId: string, status: 'active' | 'lost' | 'returned') => {
    await supabase.from('access_items').update({ status }).eq('id', itemId)
    setAccessItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i))
  }

  const deleteAccessItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return
    await supabase.from('access_items').delete().eq('id', itemId)
    setAccessItems(prev => prev.filter(i => i.id !== itemId))
  }

  const fetchActiveHandover = async () => {
    const { data } = await supabase
      .from('handovers')
      .select('id, type')
      .eq('property_id', id)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) setActiveHandover(data)
  }

  const startHandover = async (type: 'move_in' | 'move_out') => {
    setStartingHandover(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStartingHandover(false); return }
    const { data, error } = await supabase.from('handovers').insert({
      user_id: user.id,
      property_id: id,
      tenant_id: property?.tenant_id || null,
      type,
      status: 'in_progress',
      step_completed: 1,
    }).select().single()
    setStartingHandover(false)
    if (!error && data) router.push(`/dashboard/handovers/${data.id}`)
  }

  useEffect(() => {
    fetchProperty()
    fetchAllTenants()
    fetchNotices()
    fetchAccessItems()
    fetchRentIncreases()
    fetchActiveHandover()
  }, [id])

  const saveEdit = async () => {
    if (!form.unit_number.trim()) { alert('Unit number is required.'); return }
    setSaving(true)
    const { error } = await supabase.from('properties').update({
      unit_number:       form.unit_number.trim(),
      building_name:     form.building_name.trim() || null,
      area:              form.area || null,
      property_type:     form.property_type || null,
      bedrooms:          form.bedrooms || null,
      monthly_rent:      form.monthly_rent ? parseFloat(form.monthly_rent) : null,
      status:            form.status,
      ejari_number:      form.ejari_number.trim() || null,
      ejari_expiry:      form.ejari_expiry || null,
      title_deed_number: form.title_deed_number.trim() || null,
      notes:             form.notes.trim() || null,
    }).eq('id', id)
    setSaving(false)
    if (error) { alert('Failed to save. Please try again.'); return }
    setEditing(false)
    fetchProperty()
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    await supabase.from('properties').update({ notes }).eq('id', id)
    setProperty(p => p ? { ...p, notes } : p)
    setEditingNotes(false)
    setSavingNotes(false)
  }

  const linkTenant = async () => {
    if (!selectedTenantId) return
    await supabase.from('properties').update({ tenant_id: selectedTenantId, status: 'occupied' }).eq('id', id)
    const found = allTenants.find(t => t.id === selectedTenantId)
    if (found) setTenant(found)
    setProperty(p => p ? { ...p, tenant_id: selectedTenantId, status: 'occupied' } : p)
    setLinkingTenant(false)
    setSelectedTenantId('')
  }

  const unlinkTenant = async () => {
    if (!confirm('Remove this tenant from the property? The property will be set to Vacant.')) return
    await supabase.from('properties').update({ tenant_id: null, status: 'vacant' }).eq('id', id)
    setTenant(null)
    setProperty(p => p ? { ...p, tenant_id: null, status: 'vacant' } : p)
  }

  if (loading) return (
    <div style={{ padding: '48px', color: '#444', fontSize: '14px' }}>Loading property...</div>
  )
  if (!property) return null

  const ejariDays = daysUntil(property.ejari_expiry)
  const ejariExpired = ejariDays !== null && ejariDays < 0
  const ejariUrgent  = ejariDays !== null && ejariDays >= 0 && ejariDays <= 30
  const ejariWarning = ejariDays !== null && ejariDays > 30 && ejariDays <= 90
  const ejariColor   = ejariExpired ? '#C0392B' : ejariUrgent ? '#E67E22' : ejariWarning ? GOLD : '#4ade80'
  const ejariLabel   = ejariDays === null ? '—'
    : ejariExpired ? `EXPIRED ${Math.abs(ejariDays)}d ago`
    : ejariDays === 0 ? 'Expires TODAY'
    : `${ejariDays} days left`

  const propertyTitle = [property.unit_number, property.building_name].filter(Boolean).join(', ') || 'Unnamed Property'

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ padding: '40px 48px', minHeight: '100vh', backgroundColor: DARK }}>
        <button
          onClick={() => setEditing(false)}
          style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '24px' }}
        >
          ← Cancel editing
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <h2 style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '24px', fontWeight: '700', color: '#F5F5F5', margin: 0,
          }}>
            Edit Property
          </h2>
          <span style={{ color: '#444', fontSize: '13px' }}>{propertyTitle}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
              <p style={{ color: '#444', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', margin: '0 0 20px 0' }}>PROPERTY DETAILS</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Unit Number *</label>
                <input value={form.unit_number} onChange={e => setForm(f => ({ ...f, unit_number: e.target.value }))} placeholder="e.g. 204, Villa 12" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Building Name</label>
                <input value={form.building_name} onChange={e => setForm(f => ({ ...f, building_name: e.target.value }))} placeholder="e.g. Marina Gate" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Area</label>
                <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} style={inputStyle}>
                  <option value="">— Select area —</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Property Type</label>
                  <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))} style={inputStyle}>
                    <option value="">— Select —</option>
                    {PROP_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bedrooms</label>
                  <select value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} style={inputStyle}>
                    <option value="">—</option>
                    {['Studio', '1', '2', '3', '4', '5+'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Monthly Rent (AED)</label>
                  <input type="number" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} placeholder="e.g. 85000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
              <p style={{ color: '#444', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', margin: '0 0 16px 0' }}>NOTES</p>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="Any notes about this property..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
              <p style={{ color: '#444', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', margin: '0 0 20px 0' }}>EJARI & COMPLIANCE</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Ejari Number</label>
                <input value={form.ejari_number} onChange={e => setForm(f => ({ ...f, ejari_number: e.target.value }))} placeholder="e.g. EJ12345678" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Ejari Expiry Date</label>
                <input type="date" value={form.ejari_expiry} onChange={e => setForm(f => ({ ...f, ejari_expiry: e.target.value }))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Title Deed Number</label>
                <input value={form.title_deed_number} onChange={e => setForm(f => ({ ...f, title_deed_number: e.target.value }))} placeholder="e.g. 12345678" style={inputStyle} />
              </div>
            </div>

            {/* Save / Cancel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  padding: '13px', backgroundColor: GOLD, color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '14px',
                  fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{
                  padding: '12px', backgroundColor: 'transparent', color: '#444',
                  border: `1px solid ${BORDER}`, borderRadius: '8px',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px 48px', minHeight: '100vh', backgroundColor: DARK }}>

      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/properties')}
        style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        ← Back to Properties
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
            <h2 style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: '28px', fontWeight: '700', color: '#F5F5F5',
              margin: 0, letterSpacing: '-0.02em',
            }}>
              {propertyTitle}
            </h2>
            <StatusBadge status={property.status} />
          </div>
          <p style={{ color: '#555', fontSize: '13.5px', margin: 0 }}>
            {[property.area, property.property_type, property.bedrooms].filter(Boolean).join(' · ')}
          </p>
        </div>

        <button
          onClick={() => setEditing(true)}
          style={{
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: '#888', borderRadius: '8px', padding: '10px 20px',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          ✏️ Edit Property
        </button>
      </div>

      {/* Ejari Alert Banner */}
      {property.ejari_expiry && (ejariExpired || ejariUrgent || ejariWarning) && (
        <div style={{
          background: `${ejariColor}10`, border: `1px solid ${ejariColor}33`,
          borderRadius: '10px', padding: '16px 20px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '18px' }}>{ejariExpired ? '🚨' : ejariUrgent ? '⚠️' : '📅'}</span>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '700', color: ejariColor, marginBottom: '2px' }}>
              {ejariExpired ? 'Ejari has expired' : ejariUrgent ? 'Ejari expiring very soon' : 'Ejari expiring in under 90 days'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#888' }}>
              {ejariExpired
                ? `Expired ${Math.abs(ejariDays!)} days ago. Renew immediately to avoid fines up to AED 50,000.`
                : `${ejariDays} days remaining. Tenant must receive 90-day notice before renewal.`}
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Property Details */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>PROPERTY DETAILS</h3>
          <InfoRow label="Monthly Rent" value={property.monthly_rent ? `AED ${property.monthly_rent.toLocaleString()}` : null} highlight={!!property.monthly_rent} />
          <InfoRow label="Property Type" value={property.property_type} />
          <InfoRow label="Bedrooms" value={property.bedrooms} />
          <InfoRow label="Area" value={property.area} />
          <InfoRow label="Title Deed No." value={property.title_deed_number} />
          <InfoRow label="Added" value={new Date(property.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
        </div>

        {/* Ejari Details */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>EJARI & COMPLIANCE</h3>
          <InfoRow label="Ejari Number" value={property.ejari_number} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '12px', color: '#555', fontWeight: '500' }}>Ejari Expiry</span>
            <span style={{ fontSize: '13.5px', color: ejariColor, fontWeight: '600' }}>
              {property.ejari_expiry
                ? new Date(property.ejari_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '12px', color: '#555', fontWeight: '500' }}>Status</span>
            <span style={{ fontSize: '13px', color: ejariColor, fontWeight: '700' }}>{ejariLabel}</span>
          </div>
          <InfoRow label="90-Day Notice Due" value={
            property.ejari_expiry
              ? new Date(new Date(property.ejari_expiry).getTime() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : null
          } />
        </div>
      </div>

      {/* Utility Status */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: 0 }}>UTILITIES</h3>
          {!editingUtilities && (
            <button onClick={() => setEditingUtilities(true)} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
              Edit
            </button>
          )}
        </div>

        {editingUtilities ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* DEWA edit */}
              <div>
                <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>DEWA</p>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Status</label>
                  <select value={utilForm.dewa_status} onChange={e => setUtilForm(f => ({ ...f, dewa_status: e.target.value }))} style={inputStyle}>
                    <option value="pending">Pending</option>
                    <option value="activated">Activated</option>
                    <option value="not_applicable">Not applicable</option>
                  </select>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Account Number</label>
                  <input value={utilForm.dewa_account_number} onChange={e => setUtilForm(f => ({ ...f, dewa_account_number: e.target.value }))} placeholder="e.g. 1234567890" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Activation Date</label>
                  <input type="date" value={utilForm.dewa_activation_date} onChange={e => setUtilForm(f => ({ ...f, dewa_activation_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              {/* Internet edit */}
              <div>
                <p style={{ color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>INTERNET</p>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Provider</label>
                  <select value={utilForm.internet_provider} onChange={e => setUtilForm(f => ({ ...f, internet_provider: e.target.value }))} style={inputStyle}>
                    <option value="">— Select —</option>
                    <option value="du">du</option>
                    <option value="etisalat">Etisalat (e&)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Status</label>
                  <select value={utilForm.internet_status} onChange={e => setUtilForm(f => ({ ...f, internet_status: e.target.value }))} style={inputStyle}>
                    <option value="pending">Pending</option>
                    <option value="activated">Activated</option>
                    <option value="not_applicable">Not applicable</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Account Number</label>
                  <input value={utilForm.internet_account_number} onChange={e => setUtilForm(f => ({ ...f, internet_account_number: e.target.value }))} placeholder="Account number" style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveUtilities} disabled={savingUtilities} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                {savingUtilities ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditingUtilities(false)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* DEWA view */}
            <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '9px', padding: '16px 18px' }}>
              <p style={{ color: '#444', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 10px 0' }}>DEWA</p>
              {(() => {
                const s = property.dewa_status || 'pending'
                const color = s === 'activated' ? '#4ade80' : s === 'not_applicable' ? '#444' : '#E67E22'
                const bg = s === 'activated' ? '#0D1F0D' : s === 'not_applicable' ? '#111' : '#1F150A'
                const border = s === 'activated' ? '#2a4a2a' : s === 'not_applicable' ? '#222' : '#5a3a10'
                return (
                  <>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '4px', background: bg, color, border: `1px solid ${border}`, textTransform: 'uppercase', display: 'inline-block', marginBottom: '8px' }}>
                      {s === 'not_applicable' ? 'N/A' : s}
                    </span>
                    {property.dewa_account_number && <p style={{ color: '#888', fontSize: '12.5px', margin: '0 0 3px 0' }}>Acc: <span style={{ color: '#F0F0F0' }}>{property.dewa_account_number}</span></p>}
                    {property.dewa_activation_date && <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>Activated: {new Date(property.dewa_activation_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                    {!property.dewa_account_number && s === 'pending' && <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>No details recorded</p>}
                  </>
                )
              })()}
            </div>
            {/* Internet view */}
            <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '9px', padding: '16px 18px' }}>
              <p style={{ color: '#444', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 10px 0' }}>
                INTERNET{property.internet_provider ? ` · ${property.internet_provider.toUpperCase()}` : ''}
              </p>
              {(() => {
                const s = property.internet_status || 'pending'
                const color = s === 'activated' ? '#4ade80' : s === 'not_applicable' ? '#444' : '#E67E22'
                const bg = s === 'activated' ? '#0D1F0D' : s === 'not_applicable' ? '#111' : '#1F150A'
                const border = s === 'activated' ? '#2a4a2a' : s === 'not_applicable' ? '#222' : '#5a3a10'
                return (
                  <>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '4px', background: bg, color, border: `1px solid ${border}`, textTransform: 'uppercase', display: 'inline-block', marginBottom: '8px' }}>
                      {s === 'not_applicable' ? 'N/A' : s}
                    </span>
                    {property.internet_account_number && <p style={{ color: '#888', fontSize: '12.5px', margin: '0 0 3px 0' }}>Acc: <span style={{ color: '#F0F0F0' }}>{property.internet_account_number}</span></p>}
                    {!property.internet_provider && s === 'pending' && <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>No details recorded</p>}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Tenant Section */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: 0 }}>LINKED TENANT</h3>
          {tenant && (
            <button onClick={unlinkTenant} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
              Remove Tenant
            </button>
          )}
        </div>

        {tenant ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `${GOLD}18`, border: `1px solid ${GOLD}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: GOLD, fontWeight: '700' }}>
                {tenant.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0F0F0', marginBottom: '2px' }}>{tenant.full_name}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{[tenant.nationality, tenant.email].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/dashboard/clients/${tenant.id}`)}
              style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}
            >
              View Profile →
            </button>
          </div>
        ) : (
          <div>
            {linkingTenant ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                  style={{ flex: 1, background: '#111', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '9px 12px', color: '#F5F5F5', fontSize: '13.5px', outline: 'none' }}
                >
                  <option value="">Select a tenant...</option>
                  {allTenants.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
                <button onClick={linkTenant} disabled={!selectedTenantId} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Link</button>
                <button onClick={() => setLinkingTenant(false)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13.5px', color: '#444' }}>No tenant linked to this property.</span>
                <button
                  onClick={() => setLinkingTenant(true)}
                  style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}
                >
                  + Link Tenant
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Access Cards & Keys */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>ACCESS CARDS & KEYS</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['active', 'lost', 'returned'].map(s => {
                const count = accessItems.filter(i => i.status === s).length
                const color = s === 'active' ? '#4ade80' : s === 'lost' ? '#f87171' : '#888'
                return count > 0 ? (
                  <span key={s} style={{ fontSize: '11px', color, fontWeight: '600' }}>
                    {count} {s}
                  </span>
                ) : null
              })}
              {accessItems.length === 0 && <span style={{ fontSize: '12px', color: '#333' }}>No items recorded</span>}
            </div>
          </div>
          <button
            onClick={() => setShowAddAccess(v => !v)}
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            {showAddAccess ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* Add form */}
        {showAddAccess && (
          <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={accessForm.type} onChange={e => setAccessForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                  <option value="key">🔑 Key</option>
                  <option value="access_card">💳 Access Card</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Issued To</label>
                <input value={accessForm.issued_to} onChange={e => setAccessForm(f => ({ ...f, issued_to: e.target.value }))} placeholder="e.g. Tenant name, Agent" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Issued Date</label>
                <input type="date" value={accessForm.issued_date} onChange={e => setAccessForm(f => ({ ...f, issued_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Security Company (for reorders)</label>
                <input value={accessForm.security_company} onChange={e => setAccessForm(f => ({ ...f, security_company: e.target.value }))} placeholder="e.g. G4S, Transguard" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Notes</label>
              <input value={accessForm.notes} onChange={e => setAccessForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." style={inputStyle} />
            </div>
            <button onClick={addAccessItem} disabled={savingAccess} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              {savingAccess ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        )}

        {/* Items list */}
        {accessItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {accessItems.map(item => {
              const statusColor = item.status === 'active' ? '#4ade80' : item.status === 'lost' ? '#f87171' : '#888'
              const statusBg = item.status === 'active' ? '#0D1F0D' : item.status === 'lost' ? '#1F0D0D' : '#111'
              const statusBorder = item.status === 'active' ? '#2a4a2a' : item.status === 'lost' ? '#4a2a2a' : '#222'
              return (
                <div key={item.id} style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '9px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <span style={{ fontSize: '20px' }}>{item.type === 'key' ? '🔑' : '💳'}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#F0F0F0' }}>
                          {item.type === 'key' ? 'Key' : 'Access Card'}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, textTransform: 'uppercase' }}>
                          {item.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#555' }}>
                        {[
                          item.issued_to && `Issued to: ${item.issued_to}`,
                          item.issued_date && new Date(item.issued_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                          item.security_company && `Security: ${item.security_company}`,
                          item.notes,
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {item.status === 'active' && (
                      <button onClick={() => updateAccessStatus(item.id, 'lost')} style={{ background: 'transparent', border: '1px solid #3a1a1a', color: '#f87171', borderRadius: '5px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                        Lost
                      </button>
                    )}
                    {item.status === 'lost' && (
                      <button onClick={() => updateAccessStatus(item.id, 'active')} style={{ background: 'transparent', border: '1px solid #2a4a2a', color: '#4ade80', borderRadius: '5px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                        Found
                      </button>
                    )}
                    {item.status !== 'returned' && (
                      <button onClick={() => updateAccessStatus(item.id, 'returned')} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '5px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
                        Returned
                      </button>
                    )}
                    <button onClick={() => deleteAccessItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#333', borderRadius: '5px', padding: '5px 8px', fontSize: '13px', cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notice to Vacate */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>NOTICE TO VACATE</h3>
            <p style={{ color: '#333', fontSize: '12.5px', margin: 0 }}>
              {notices.length === 0 ? 'No notices issued' : `${notices.length} notice${notices.length > 1 ? 's' : ''} on record`}
            </p>
          </div>
          {!showNoticeForm && (
            <button
              onClick={() => setShowNoticeForm(true)}
              style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              + Issue Notice
            </button>
          )}
        </div>

        {/* Create form */}
        {showNoticeForm && (
          <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Issue Date</label>
                <input
                  type="date"
                  value={noticeForm.issue_date}
                  onChange={e => {
                    const d = e.target.value
                    const vacate = new Date(new Date(d).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    setNoticeForm(f => ({ ...f, issue_date: d, vacate_date: vacate }))
                  }}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Vacate By (auto: 12 months)</label>
                <input
                  type="date"
                  value={noticeForm.vacate_date}
                  onChange={e => setNoticeForm(f => ({ ...f, vacate_date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Reason</label>
                <select value={noticeForm.reason} onChange={e => setNoticeForm(f => ({ ...f, reason: e.target.value }))} style={inputStyle}>
                  <option value="non_renewal">Non-renewal of tenancy contract</option>
                  <option value="sale">Sale of the property</option>
                  <option value="personal_use">Personal use (landlord or first-degree relatives)</option>
                  <option value="renovation">Major renovation or demolition</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Additional Notes (optional)</label>
                <input value={noticeForm.notes} onChange={e => setNoticeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any extra details..." style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={createNotice} disabled={savingNotice} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                {savingNotice ? 'Saving...' : 'Issue Notice'}
              </button>
              <button onClick={() => setShowNoticeForm(false)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Notices list */}
        {notices.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notices.map(notice => {
              const statusColors: Record<string, { color: string; bg: string; border: string }> = {
                draft:        { color: '#888',    bg: '#111',    border: '#222' },
                sent:         { color: '#60a5fa', bg: '#0D1628', border: '#1e3a5f' },
                acknowledged: { color: GOLD,      bg: '#1A1200', border: '#4a3800' },
                vacated:      { color: '#4ade80', bg: '#0D1F0D', border: '#2a4a2a' },
              }
              const sc = statusColors[notice.status]
              const reasonLabels: Record<string, string> = {
                non_renewal:  'Non-renewal',
                sale:         'Sale of property',
                personal_use: 'Personal use',
                renovation:   'Renovation',
              }
              const nextStatuses: Record<string, EvictionNotice['status'][]> = {
                draft:        ['sent'],
                sent:         ['acknowledged'],
                acknowledged: ['vacated'],
                vacated:      [],
              }
              return (
                <div key={notice.id} style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px' }}>📋</span>
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#F0F0F0' }}>Notice to Vacate</span>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'uppercase' }}>
                          {notice.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#555' }}>
                        Issued: {new Date(notice.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}
                        Vacate by: <span style={{ color: '#F0F0F0', fontWeight: '600' }}>{new Date(notice.vacate_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {' · '}
                        {reasonLabels[notice.reason || ''] || notice.reason}
                      </div>
                    </div>
                    <button onClick={() => deleteNotice(notice.id)} style={{ background: 'transparent', border: 'none', color: '#333', fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => generateNoticePDF(notice)}
                      style={{ background: 'transparent', border: `1px solid ${GOLD}44`, color: GOLD, borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      ↓ Download PDF
                    </button>
                    {nextStatuses[notice.status].map(next => (
                      <button
                        key={next}
                        onClick={() => updateNoticeStatus(notice.id, next)}
                        style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Mark as {next.charAt(0).toUpperCase() + next.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rent Increase Manager */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>RENT INCREASE MANAGER</h3>
            <p style={{ color: '#333', fontSize: '12.5px', margin: 0 }}>
              {rentIncreases.length === 0 ? 'No rent increase notices issued' : `${rentIncreases.length} notice${rentIncreases.length > 1 ? 's' : ''} on record`}
              {' · '}
              <span style={{ color: '#444', fontSize: '11.5px' }}>RERA Decree No. 43 of 2013</span>
            </p>
          </div>
          {!showRentForm && (
            <button
              onClick={() => setShowRentForm(true)}
              style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              + Calculate Increase
            </button>
          )}
        </div>

        {/* Create form */}
        {showRentForm && (
          <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Current Annual Rent (AED)</label>
                <input
                  type="number"
                  value={rentForm.current_rent}
                  onChange={e => setRentForm(f => ({ ...f, current_rent: e.target.value }))}
                  placeholder="e.g. 85000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Market Rate / RERA Index (AED)</label>
                <input
                  type="number"
                  value={rentForm.market_rate}
                  onChange={e => setRentForm(f => ({ ...f, market_rate: e.target.value }))}
                  placeholder="e.g. 100000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Notice Date</label>
                <input type="date" value={rentForm.notice_date} onChange={e => setRentForm(f => ({ ...f, notice_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Effective Date (min 90 days from notice)</label>
                <input type="date" value={rentForm.effective_date} onChange={e => setRentForm(f => ({ ...f, effective_date: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            {/* RERA live preview */}
            {rentForm.current_rent && rentForm.market_rate && (() => {
              const { pct, newRent, belowPct } = calcRera(parseFloat(rentForm.current_rent), parseFloat(rentForm.market_rate))
              return (
                <div style={{ background: pct === 0 ? '#0D1F0D' : `${GOLD}0D`, border: `1px solid ${pct === 0 ? '#2a4a2a' : GOLD + '33'}`, borderRadius: '8px', padding: '14px 16px', marginBottom: '14px' }}>
                  <p style={{ color: '#555', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 8px 0' }}>RERA CALCULATION RESULT</p>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ color: '#444', fontSize: '11px', margin: '0 0 2px 0' }}>Below Market</p>
                      <p style={{ color: '#F0F0F0', fontSize: '14px', fontWeight: '700', margin: 0 }}>{belowPct}%</p>
                    </div>
                    <div>
                      <p style={{ color: '#444', fontSize: '11px', margin: '0 0 2px 0' }}>Allowed Increase</p>
                      <p style={{ color: pct === 0 ? '#4ade80' : GOLD, fontSize: '14px', fontWeight: '700', margin: 0 }}>{pct === 0 ? 'No increase allowed' : `${pct}%`}</p>
                    </div>
                    {pct > 0 && (
                      <div>
                        <p style={{ color: '#444', fontSize: '11px', margin: '0 0 2px 0' }}>New Annual Rent</p>
                        <p style={{ color: GOLD, fontSize: '14px', fontWeight: '700', margin: 0 }}>AED {newRent.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Notes (optional)</label>
              <input value={rentForm.notes} onChange={e => setRentForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={createRentIncrease} disabled={savingRent} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                {savingRent ? 'Saving...' : 'Issue Notice'}
              </button>
              <button onClick={() => setShowRentForm(false)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Rent increases list */}
        {rentIncreases.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rentIncreases.map(r => {
              const statusColors: Record<string, { color: string; bg: string; border: string }> = {
                draft:        { color: '#888',    bg: '#111',    border: '#222' },
                sent:         { color: '#60a5fa', bg: '#0D1628', border: '#1e3a5f' },
                acknowledged: { color: GOLD,      bg: '#1A1200', border: '#4a3800' },
                active:       { color: '#4ade80', bg: '#0D1F0D', border: '#2a4a2a' },
              }
              const sc = statusColors[r.status]
              const nextStatuses: Record<string, RentIncrease['status'][]> = {
                draft:        ['sent'],
                sent:         ['acknowledged'],
                acknowledged: ['active'],
                active:       [],
              }
              return (
                <div key={r.id} style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px' }}>📈</span>
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#F0F0F0' }}>Rent Increase Notice</span>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'uppercase' }}>
                          {r.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#555' }}>
                        {`AED ${r.current_rent.toLocaleString()} → `}
                        <span style={{ color: GOLD, fontWeight: '700' }}>{`AED ${r.new_rent.toLocaleString()}`}</span>
                        {` (+${r.allowed_increase_pct}%) · Notice: ${new Date(r.notice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · Effective: ${new Date(r.effective_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </div>
                    </div>
                    <button onClick={() => deleteRentIncrease(r.id)} style={{ background: 'transparent', border: 'none', color: '#333', fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => generateRentIncreasePDF(r)}
                      style={{ background: 'transparent', border: `1px solid ${GOLD}44`, color: GOLD, borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      ↓ Download PDF
                    </button>
                    {nextStatuses[r.status].map(next => (
                      <button
                        key={next}
                        onClick={() => updateRentIncreaseStatus(r.id, next)}
                        style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#888', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Mark as {next.charAt(0).toUpperCase() + next.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Handover Section */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>HANDOVER</h3>
            <p style={{ color: '#333', fontSize: '12.5px', margin: 0 }}>Move-in and move-out workflows for this property</p>
          </div>
        </div>

        {activeHandover ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${GOLD}0D`, border: `1px solid ${GOLD}33`, borderRadius: '8px', padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>{activeHandover.type === 'move_in' ? '🟢' : '🔴'}</span>
              <div>
                <p style={{ color: GOLD, fontSize: '13px', fontWeight: '700', margin: '0 0 2px 0' }}>
                  {activeHandover.type === 'move_in' ? 'Move-In in Progress' : 'Move-Out in Progress'}
                </p>
                <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>You have an active handover workflow</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/dashboard/handovers/${activeHandover.id}`)}
              style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '7px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              Continue →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => startHandover('move_in')}
              disabled={startingHandover}
              style={{
                flex: 1, padding: '13px', background: '#0D1F0D',
                border: '1px solid #2a4a2a', color: '#4ade80',
                borderRadius: '8px', fontSize: '13.5px', fontWeight: '700',
                cursor: startingHandover ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              🟢 Start Move-In
            </button>
            <button
              onClick={() => startHandover('move_out')}
              disabled={startingHandover}
              style={{
                flex: 1, padding: '13px', background: '#1F0D0D',
                border: '1px solid #4a2a2a', color: '#f87171',
                borderRadius: '8px', fontSize: '13.5px', fontWeight: '700',
                cursor: startingHandover ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              🔴 Start Move-Out
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#444', letterSpacing: '0.1em', margin: 0 }}>NOTES</h3>
          {!editingNotes && (
            <button onClick={() => setEditingNotes(true)} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#555', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about this property..."
              style={{ width: '100%', background: '#111', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '10px 12px', color: '#F5F5F5', fontSize: '13.5px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button onClick={saveNotes} disabled={savingNotes} style={{ background: GOLD, border: 'none', color: '#000', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditingNotes(false); setNotes(property.notes || '') }} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '13.5px', color: notes ? '#888' : '#333', margin: 0, lineHeight: '1.6' }}>
            {notes || 'No notes added yet.'}
          </p>
        )}
      </div>

    </div>
  )
}
