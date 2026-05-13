'use client'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

const VAULT_FEATURES = [
  {
    icon: '📜',
    title: 'Title Deeds',
    description: 'Store and access title deed documents for every property in your portfolio.',
  },
  {
    icon: '📋',
    title: 'NOCs & Permits',
    description: 'Keep No Objection Certificates, DEWA permits, and municipality approvals in one place.',
  },
  {
    icon: '🛡️',
    title: 'Insurance Certificates',
    description: 'Track building and contents insurance with expiry alerts before renewals are missed.',
  },
  {
    icon: '📑',
    title: 'Service Charge Records',
    description: 'Store Mollak statements, RERA service charge certificates, and payment receipts.',
  },
  {
    icon: '🔒',
    title: 'Encrypted Storage',
    description: 'All vault documents stored with access controls. Only authorised users can view sensitive files.',
  },
  {
    icon: '⚡',
    title: 'Expiry Alerts',
    description: 'Get notified before any vault document — insurance, permit, or NOC — expires.',
  },
]

export default function VaultPage() {
  return (
    <div style={{ padding: '40px 32px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Property Vault
        </h2>
        <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
          Secure storage for title deeds, NOCs, insurance, and critical property documents
        </p>
      </div>

      {/* Coming soon card */}
      <div style={{
        backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`,
        borderRadius: '14px', padding: '48px 40px',
        textAlign: 'center', marginBottom: '40px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h3 style={{
          color: '#F5F5F5', fontSize: '22px', fontWeight: '700',
          margin: '0 0 10px 0', fontFamily: 'var(--font-playfair), Georgia, serif',
        }}>
          Coming Soon
        </h3>
        <p style={{ color: '#555', fontSize: '14px', margin: '0 auto', maxWidth: '480px', lineHeight: '1.6' }}>
          The Property Vault will be your secure hub for every critical document across your portfolio —
          title deeds, NOCs, insurance certificates, service charge records, and more.
          All in one place, with expiry alerts so nothing slips through.
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

      {/* Feature preview grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {VAULT_FEATURES.map(feature => (
          <div key={feature.title} style={{
            backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`,
            borderRadius: '12px', padding: '24px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>{feature.icon}</div>
            <h4 style={{ color: '#F5F5F5', fontSize: '15px', fontWeight: '600', margin: '0 0 8px 0' }}>{feature.title}</h4>
            <p style={{ color: '#444', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{feature.description}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
