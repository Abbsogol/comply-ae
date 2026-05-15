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
        name: 'ServiceMarket',
        tagline: 'Compare quotes from vetted cleaning companies across Dubai. Book instantly online.',
        priceRange: 'From AED 35/hr',
        url: 'https://servicemarket.com/en/dubai/cleaning-maid-services',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
      {
        name: 'Urban Company',
        tagline: 'On-demand home cleaning with background-verified professionals. App-based booking.',
        priceRange: 'From AED 40/hr',
        url: 'https://www.urbancompany.com/dubai-maid-service',
        badge: 'Popular',
        badgeColor: GOLD,
      },
      {
        name: 'Helpling',
        tagline: 'Hourly home cleaning with flexible scheduling. Vetted, insured professionals.',
        priceRange: 'From AED 37/hr',
        url: 'https://www.helpling.ae/cleaning-services/dubai',
      },
    ],
  },
  {
    icon: '❄️',
    title: 'AC Cleaning & Servicing',
    description: 'AC duct cleaning, filter replacement, coil cleaning, and annual servicing — essential every 6–12 months in Dubai.',
    providers: [
      {
        name: 'Urban Company — AC',
        tagline: 'Trained AC technicians for split unit cleaning, duct servicing, and repair.',
        priceRange: 'AED 180–350 per unit',
        url: 'https://www.urbancompany.com/dubai-ac-service-repair',
        badge: 'Popular',
        badgeColor: GOLD,
      },
      {
        name: 'ServiceMarket — AC',
        tagline: 'Compare multiple AC service providers. Duct cleaning, coil servicing, chemical wash.',
        priceRange: 'AED 180–600 per unit',
        url: 'https://servicemarket.com/en/dubai/ac-cleaning',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
      {
        name: 'The Healthy Home',
        tagline: 'Specialist AC duct hygiene and deep cleaning. Allergy and air quality focused.',
        priceRange: 'AED 500–1,500 (system)',
        url: 'https://thehealthyhome.me/en/ae/services/ac-cleaning-services',
        badge: 'Specialist',
        badgeColor: '#4ade80',
      },
    ],
  },
  {
    icon: '🐛',
    title: 'Pest Control',
    description: 'Cockroach, rodent, bed bug, and general pest treatments. Dubai Municipality-approved providers.',
    providers: [
      {
        name: 'ServiceMarket — Pest',
        tagline: 'Compare licensed pest control companies. Studio to villa packages, warranties included.',
        priceRange: 'AED 149–299 per treatment',
        url: 'https://servicemarket.com/en/dubai/pest-control-companies',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
      {
        name: 'ProShield',
        tagline: 'DM-approved pest control. Residential and commercial. Disinfection services also available.',
        priceRange: 'AED 250 (apt) / AED 450 (villa)',
        url: 'https://www.proshield.ae',
        badge: 'Specialist',
        badgeColor: '#4ade80',
      },
      {
        name: 'Saniservice',
        tagline: 'Established Dubai pest control company. Annual contracts and one-off treatments.',
        priceRange: 'AED 999–2,999/year (contract)',
        url: 'https://saniservice.com',
      },
    ],
  },
  {
    icon: '🔌',
    title: 'Handyman & General Repairs',
    description: 'Plumbing, electrical, painting, and general fix-it jobs between tenancies or during occupancy.',
    providers: [
      {
        name: 'ServiceMarket — Handyman',
        tagline: 'Book vetted handymen for any job. Flat rates or hourly. Same-day availability.',
        priceRange: 'From AED 79/hr',
        url: 'https://servicemarket.com/en/dubai/maintenance-handyman-companies',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
      {
        name: 'Urban Company — Handyman',
        tagline: 'Trained and background-checked handymen. Plumbing, electrical, painting, assembly.',
        priceRange: 'AED 75–150/hr',
        url: 'https://www.urbancompany.com/dubai-handyman',
        badge: 'Popular',
        badgeColor: GOLD,
      },
      {
        name: 'We Will Fix It',
        tagline: 'Full-service maintenance company. Ideal for larger jobs and recurring property upkeep.',
        priceRange: 'From AED 250/visit',
        url: 'https://www.wewillfixit.com/services/handyman',
      },
    ],
  },
  {
    icon: '🚚',
    title: 'Moving & Relocation',
    description: 'Tenant move-in and move-out logistics, furniture assembly, packing, and storage.',
    providers: [
      {
        name: 'MoveConnector',
        tagline: 'Get up to 5 free quotes from pre-screened Dubai movers. Compare, then book.',
        priceRange: '1BHK from AED 1,000',
        url: 'https://moveconnector.com',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
      {
        name: 'Trukker (Logisty)',
        tagline: 'App-based moving platform backed by RTA. Real-time tracking, transparent pricing.',
        priceRange: 'Studio from AED 700',
        url: 'https://trukker.com/home-moving',
        badge: 'Popular',
        badgeColor: GOLD,
      },
      {
        name: 'ServiceMarket — Movers',
        tagline: 'Compare licensed and insured moving companies in Dubai. Free instant quotes.',
        priceRange: 'Studio from AED 700',
        url: 'https://servicemarket.com/en/dubai/local-movers',
      },
    ],
  },
  {
    icon: '🏊',
    title: 'Pool & Outdoor Maintenance',
    description: 'Pool cleaning, water balancing, equipment checks, and garden upkeep for villas and townhouses.',
    providers: [
      {
        name: 'ServiceMarket — Pool',
        tagline: 'Compare pool cleaning and maintenance professionals in Dubai. One-off or monthly.',
        priceRange: 'One-time from AED 250',
        url: 'https://servicemarket.com/en/dubai/pool-cleaning',
        badge: 'Marketplace',
        badgeColor: '#60a5fa',
      },
      {
        name: 'Dubai Pool Care',
        tagline: 'Dedicated residential pool maintenance. Weekly visits, chemical balancing, repairs.',
        priceRange: 'AED 1,000–2,000/month',
        url: 'https://www.dubaipoolcare.com',
        badge: 'Specialist',
        badgeColor: '#4ade80',
      },
      {
        name: 'Total Pools Dubai',
        tagline: 'Full-service pool maintenance and renovation. Residential and community pools.',
        priceRange: 'AED 1,500–3,000/month',
        url: 'https://www.totalpoolsdubai.com',
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
            Researched providers with verified websites and real Dubai market pricing. COMPLY.AE has no affiliate relationship with any of them. Always confirm pricing directly with the provider.
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
          Pricing ranges are based on Dubai market research (2025–2026) and are approximate. Final prices depend on property size, service scope, and provider availability. Always request a formal quote before booking. Know a provider we should add? This directory will grow over time.
        </p>
      </div>
    </div>
  )
}
