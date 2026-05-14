'use client'

const GOLD = '#C9963F'
const BORDER = '#1E1E1E'

type Provider = {
  name: string
  tagline: string
  priceRange?: string
  url: string
  badge?: string
  badgeColor?: string
}

type Category = {
  icon: string
  title: string
  description: string
  providers: Provider[]
}

const CATEGORIES: Category[] = [
  {
    icon: '🧹',
    title: 'Regular & Deep Cleaning',
    description: 'Scheduled home cleaning, end-of-tenancy deep cleans, and move-in preparation.',
    providers: [
      {
        name: 'Helpling',
        tagline: 'On-demand home cleaning. Book by the hour, vetted professionals.',
        priceRange: 'From AED 50/hr',
        url: 'https://www.helpling.ae',
        badge: 'Popular',
        badgeColor: GOLD,
      },
      {
        name: 'Justmop',
        tagline: 'Regular cleaning, deep cleans, and move-in/move-out packages.',
        priceRange: 'From AED 45/hr',
        url: 'https://www.justmop.com',
      },
      {
        name: 'ServiceMarket',
        tagline: 'Compare quotes from vetted cleaning companies across Dubai.',
        url: 'https://www.servicemarket.com/cleaning',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
    ],
  },
  {
    icon: '❄️',
    title: 'AC Cleaning & Servicing',
    description: 'AC duct cleaning, filter replacement, and annual servicing — essential in Dubai.',
    providers: [
      {
        name: 'ServiceMarket — AC',
        tagline: 'Get quotes from multiple AC service providers. Compare and book.',
        url: 'https://www.servicemarket.com/ac-maintenance',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
      {
        name: 'Justmop — AC',
        tagline: 'AC duct cleaning and filter servicing packages.',
        url: 'https://www.justmop.com/ac-cleaning',
      },
    ],
  },
  {
    icon: '🐛',
    title: 'Pest Control',
    description: 'Cockroach, rodent, bedbugs, and general pest treatments for residential units.',
    providers: [
      {
        name: 'Rentokil Initial',
        tagline: 'Global pest control leader. Residential treatments across the UAE.',
        url: 'https://www.rentokil.ae',
        badge: 'Specialist',
        badgeColor: '#4ade80',
      },
      {
        name: 'ServiceMarket — Pest',
        tagline: 'Compare pest control companies. One-off and scheduled treatments.',
        url: 'https://www.servicemarket.com/pest-control',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
    ],
  },
  {
    icon: '🔌',
    title: 'Handyman & General Repairs',
    description: 'Plumbing, electrical, painting, and general fix-it jobs between tenancies.',
    providers: [
      {
        name: 'ServiceMarket — Handyman',
        tagline: 'Book vetted handymen for any job. Flat rates or hourly.',
        url: 'https://www.servicemarket.com/handyman',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
      {
        name: 'Justmop — Handyman',
        tagline: 'Trusted handyman services alongside cleaning packages.',
        url: 'https://www.justmop.com/handyman',
      },
    ],
  },
  {
    icon: '🚚',
    title: 'Moving & Furniture',
    description: 'Tenant move-in/move-out logistics, furniture assembly, and storage.',
    providers: [
      {
        name: 'ServiceMarket — Movers',
        tagline: 'Compare moving companies across Dubai. Fully insured movers.',
        url: 'https://www.servicemarket.com/movers',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
    ],
  },
  {
    icon: '🏊',
    title: 'Pool & Outdoor Maintenance',
    description: 'Pool cleaning, garden maintenance, and outdoor upkeep for villas and townhouses.',
    providers: [
      {
        name: 'ServiceMarket — Pool',
        tagline: 'Find pool cleaning and maintenance professionals in Dubai.',
        url: 'https://www.servicemarket.com/pool-cleaning',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
    ],
  },
]

export default function ServicesPage() {
  return (
    <div style={{ padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#F5F5F5', fontSize: '26px', fontWeight: '700', margin: '0 0 4px 0', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Services
        </h2>
        <p style={{ color: '#444', fontSize: '13px', margin: '0 0 12px 0' }}>
          Trusted Dubai service providers for your properties — click any card to book directly.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}33`, borderRadius: '8px' }}>
          <span style={{ fontSize: '14px' }}>💡</span>
          <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
            These are independently verified Dubai providers. COMPLY.AE has no affiliate relationship with any of them.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {CATEGORIES.map(cat => (
          <div key={cat.title}>

            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '20px' }}>{cat.icon}</span>
              <div>
                <h3 style={{ color: '#F5F5F5', fontSize: '16px', fontWeight: '700', margin: '0 0 2px 0' }}>{cat.title}</h3>
                <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>{cat.description}</p>
              </div>
            </div>

            {/* Provider cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {cat.providers.map(p => (
                <div key={p.name}
                  style={{
                    backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`,
                    borderRadius: '10px', padding: '20px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${GOLD}55`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <p style={{ color: '#F5F5F5', fontSize: '15px', fontWeight: '700', margin: 0 }}>{p.name}</p>
                      {p.badge && (
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                          backgroundColor: `${p.badgeColor}18`, color: p.badgeColor,
                          border: `1px solid ${p.badgeColor}33`, whiteSpace: 'nowrap', marginLeft: '8px',
                        }}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#555', fontSize: '13px', margin: '0 0 8px 0', lineHeight: '1.5' }}>{p.tagline}</p>
                    {p.priceRange && (
                      <p style={{ color: GOLD, fontSize: '12px', fontWeight: '600', margin: 0 }}>{p.priceRange}</p>
                    )}
                  </div>

                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'block', textAlign: 'center',
                      padding: '9px 16px', backgroundColor: 'transparent',
                      border: `1px solid ${GOLD}`, borderRadius: '7px',
                      color: GOLD, fontSize: '13px', fontWeight: '600',
                      textDecoration: 'none', transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = GOLD
                      ;(e.currentTarget as HTMLAnchorElement).style.color = '#fff'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'
                      ;(e.currentTarget as HTMLAnchorElement).style.color = GOLD
                    }}
                  >
                    Book Now →
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: '40px', padding: '20px 24px', backgroundColor: '#0D0D0D', border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
        <p style={{ color: '#333', fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
          Know a good service provider we should add? This directory will grow over time.
          Prices shown are approximate and subject to change — always confirm directly with the provider.
        </p>
      </div>
    </div>
  )
}
