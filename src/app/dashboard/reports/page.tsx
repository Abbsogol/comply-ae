'use client'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

const REPORT_FEATURES = [
  {
    icon: '💰',
    title: 'Rent Income Summary',
    description: 'Monthly and annual rent income across your entire portfolio, broken down by property and area.',
  },
  {
    icon: '🏠',
    title: 'Occupancy Report',
    description: 'Vacancy rates, average tenancy length, and which units have been empty the longest.',
  },
  {
    icon: '📋',
    title: 'Ejari Status Report',
    description: 'Full Ejari compliance overview — expired, expiring soon, and up to date — across all properties.',
  },
  {
    icon: '👤',
    title: 'Tenant Document Expiry',
    description: 'A full list of tenants with expired or soon-to-expire passports and Emirates IDs.',
  },
  {
    icon: '📅',
    title: 'Deadline Summary',
    description: 'All upcoming deadlines — Ejari, 90-day notices, insurance, NOCs — in a single exportable report.',
  },
  {
    icon: '📊',
    title: 'Portfolio Overview',
    description: 'High-level snapshot of your full portfolio: total units, total rent, occupancy rate, and alerts.',
  },
]

export default function ReportsPage() {
  return (
    <div style={{ padding: '40px 32px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Reports
        </h2>
        <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
          Portfolio performance, occupancy, rent income, and compliance reporting
        </p>
      </div>

      {/* Coming soon card */}
      <div style={{
        backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`,
        borderRadius: '14px', padding: '48px 40px',
        textAlign: 'center', marginBottom: '40px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3 style={{
          color: '#F5F5F5', fontSize: '22px', fontWeight: '700',
          margin: '0 0 10px 0', fontFamily: 'var(--font-playfair), Georgia, serif',
        }}>
          Coming Soon
        </h3>
        <p style={{ color: '#555', fontSize: '14px', margin: '0 auto', maxWidth: '480px', lineHeight: '1.6' }}>
          Reports will give you a clear view of your portfolio's financial performance, compliance status,
          and operational health — all exportable to PDF so you can share with owners, accountants, or investors.
        </p>
        <div style={{
          display: 'inline-block', marginTop: '24px',
          padding: '8px 20px', borderRadius: '999px',
          backgroundColor: `${GOLD}18`, border: `1px solid ${GOLD}44`,
          color: GOLD, fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em',
        }}>
          IN DEVELOPMENT
        </div>
      </div>

      {/* Report type preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {REPORT_FEATURES.map(report => (
          <div key={report.title} style={{
            backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`,
            borderRadius: '12px', padding: '24px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>{report.icon}</div>
            <h4 style={{ color: '#F5F5F5', fontSize: '15px', fontWeight: '600', margin: '0 0 8px 0' }}>{report.title}</h4>
            <p style={{ color: '#444', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{report.description}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
