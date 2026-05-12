'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Hero Video ───────────────────────────────────────────────────────────────
const HERO_SRC = '/hero2.mp4'

function HeroCanvas() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.play().catch(() => {})
  }, [])
  return (
    <>
      <video ref={videoRef} src={HERO_SRC} autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', zIndex: 0 }}
      />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(3,3,10,0.68) 0%, rgba(3,3,10,0.28) 28%, rgba(3,3,10,0.38) 62%, rgba(8,8,8,0.92) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.52) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '48%', zIndex: 1, background: 'linear-gradient(to top, rgba(10,6,2,0.65) 0%, rgba(201,150,63,0.05) 55%, transparent 100%)' }} />
    </>
  )
}

// ─── Scroll fade-in + blur + scale wrapper ────────────────────────────────────
function FadeIn({ children, delay = 0, direction = 'up', style = {} }: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.08 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  const tx = direction === 'left' ? '-32px' : direction === 'right' ? '32px' : '0px'
  const ty = direction === 'up' ? '40px' : '0px'
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1) translate(0,0)' : `scale(0.95) translate(${tx},${ty})`,
      filter: visible ? 'blur(0px)' : 'blur(6px)',
      transition: `opacity 0.85s ease ${delay}ms, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}ms, filter 0.85s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Text reveal — slides up from clip (for headings) ─────────────────────────
function RevealText({ children, delay = 0, style = {} }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.2 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ overflow: 'hidden', ...style }}>
      <div style={{
        transform: visible ? 'translateY(0)' : 'translateY(110%)',
        transition: `transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}>
        {children}
      </div>
    </div>
  )
}

// ─── Floating gold particles (CTA background) ─────────────────────────────────
function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.4 + Math.random() * 2,
      s: 0.2 + Math.random() * 0.6,
      o: 0.06 + Math.random() * 0.38,
      a: Math.random() * Math.PI * 2,
    }))
    let id: number
    const draw = () => {
      id = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pts.forEach(p => {
        p.y -= p.s * 0.4
        p.x += Math.sin(p.a) * 0.3
        p.a += 0.007
        if (p.y < -8) { p.y = canvas.height + 8; p.x = Math.random() * canvas.width }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,150,63,${p.o})`; ctx.fill()
      })
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
}

// ─── Grid Background ──────────────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="grid2" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#C9963F" strokeWidth="0.4" opacity="0.1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid2)" />
      </svg>
    </div>
  )
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0
        const step = (end / 1200) * 16
        const timer = setInterval(() => {
          start += step
          if (start >= end) { setCount(end); clearInterval(timer) }
          else setCount(Math.floor(start))
        }, 16)
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ─── Animated step line ───────────────────────────────────────────────────────
function StepLine({ delay = 0 }: { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      width: visible ? '40px' : '0px',
      height: '2px',
      background: 'linear-gradient(90deg, #C9963F, rgba(201,150,63,0.3))',
      borderRadius: '1px',
      boxShadow: visible ? '0 0 8px rgba(201,150,63,0.4)' : 'none',
      transition: `width 1s cubic-bezier(0.16,1,0.3,1) ${delay + 300}ms, box-shadow 0.5s ease ${delay + 600}ms`,
    }} />
  )
}

// ─── Vertical timeline connector ──────────────────────────────────────────────
function TimelineConnector() {
  const ref = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current || !fillRef.current) return
      const rect = ref.current.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1,
        (window.innerHeight - rect.top) / (rect.height + window.innerHeight * 0.2)
      ))
      fillRef.current.style.height = `${progress * 100}%`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div ref={ref} style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '1px', height: '100%', background: '#1E1E1E', pointerEvents: 'none' }}>
      <div ref={fillRef} style={{ width: '100%', height: '0%', background: 'linear-gradient(to bottom, #C9963F, rgba(201,150,63,0.2))', boxShadow: '0 0 6px rgba(201,150,63,0.5)', transition: 'height 0.15s linear' }} />
    </div>
  )
}

// ─── Trust marquee ticker ─────────────────────────────────────────────────────
const TRUST_ITEMS = ['UAE AML Law No. 20 / 2018', 'RERA', 'CBUAE', 'FATF Recommendations', 'goAML', 'UAE Law Art. 14', 'OFAC SDN', 'UN Sanctions', 'EU Sanctions', 'OFSI']

function TrustMarquee() {
  const items = [...TRUST_ITEMS, ...TRUST_ITEMS]
  return (
    <div style={{ overflow: 'hidden', width: '100%', maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)' }}>
      <div className="marquee-track" style={{ display: 'flex', gap: '0px', width: 'max-content' }}>
        {items.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '0 24px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#444', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{b}</span>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#C9963F', opacity: 0.4, display: 'inline-block', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const S = styles

  return (
    <div style={S.page}>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav style={{ ...S.nav, ...(scrolled ? S.navScrolled : {}) }}>
        <div style={S.navInner}>
          <div style={S.logo}>COMPLY<span style={S.logoDot}>.AE</span></div>
          <div style={S.navLinks}>
            <a href="#features" style={S.navLink}>Features</a>
            <a href="#compliance" style={S.navLink}>How it works</a>
            <a href="#pricing" style={S.navLink}>Pricing</a>
            <button onClick={() => router.push('/login')} style={S.navLogin}>Sign in</button>
            <button onClick={() => router.push('/login')} style={S.navCTA}>Get started</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={S.hero}>
        <HeroCanvas />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '160px', background: 'linear-gradient(to bottom, #030308 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to top, #080808 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={S.heroContent}>
          <div style={S.heroBadge}>
            <span style={S.heroBadgeDot} className="hero-badge-dot" />
            Built for UAE Federal AML Law No. 20 of 2018
          </div>
          <h1 style={S.heroTitle}>
            Compliance that moves{' '}
            <em style={S.heroTitleItalic}>at the speed</em>
            <br />of Dubai real estate.
          </h1>
          <p style={S.heroSub}>
            Automate AML/KYC workflows, file STRs to goAML, screen PEPs and sanctions lists,
            and stay audit-ready — all in one platform built for RERA-registered agencies.
          </p>
          <div style={S.heroCTAs}>
            <button onClick={() => router.push('/login')} style={S.ctaPrimary}>
              Start free trial <span style={S.ctaArrow}>→</span>
            </button>
            <button onClick={() => router.push('/login')} style={S.ctaSecondary}>
              View dashboard demo
            </button>
          </div>
          <p style={S.heroNote}>No credit card required · RERA-compliant · Setup in 15 minutes</p>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section style={S.statsSection}>
        <div style={S.statsGrid}>
          {[
            { value: 2700, suffix: '+', label: 'RERA-registered agencies', sub: 'potential users', dir: 'left' as const },
            { value: 40000, suffix: '+', label: 'Licensed brokers in Dubai', sub: 'covered by AML law', dir: 'up' as const },
            { value: 55000, suffix: ' AED', label: 'Cash transaction threshold', sub: 'triggering REAR report', dir: 'up' as const },
            { value: 5, suffix: ' years', label: 'Mandatory record retention', sub: 'UAE Law Art. 14', dir: 'right' as const },
          ].map((stat, i) => (
            <FadeIn key={i} delay={i * 110} direction={stat.dir} style={{ ...(i < 3 ? { borderRight: '1px solid #1A1A1A' } : {}) }}>
              <div style={S.statCard}>
                <div style={S.statValue} className="stat-value"><Counter end={stat.value} suffix={stat.suffix} /></div>
                <div style={S.statLabel}>{stat.label}</div>
                <div style={S.statSub}>{stat.sub}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.sectionHeader}>
            <FadeIn direction="none">
              <div style={S.sectionTag} className="section-tag">FEATURES</div>
            </FadeIn>
            <RevealText delay={100}><h2 style={S.sectionTitle}>Everything your compliance officer needs</h2></RevealText>
            <FadeIn delay={200} direction="none">
              <p style={S.sectionSub}>Built around the actual workflows Dubai agencies run every day — not a generic template.</p>
            </FadeIn>
          </div>
          <div style={S.featuresGrid}>
            {[
              { num: '01', icon: '🛡️', title: 'KYC Client Profiles', desc: 'Full KYC intake — passport, Emirates ID, source of funds, property interest. Compliance checklist auto-populated from real data. Color-coded expiry alerts.' },
              { num: '02', icon: '📊', title: 'CDD/EDD Risk Scoring', desc: '10-question risk assessment based on UAE/FATF risk factors. Auto-scores to CDD, CDD+, or EDD. Saves history and updates client risk level in real time.' },
              { num: '03', icon: '💸', title: 'Cash Transaction Tracker', desc: "Running total toward the AED 55,000 threshold. Red alert fires the moment it's exceeded and links directly to the REAR report generator." },
              { num: '04', icon: '🚨', title: 'STR Builder', desc: '16 red-flag checkboxes grouped by category. Tipping-off warning banner. One-click goAML-ready PDF output. All STRs archived with full history.' },
              { num: '05', icon: '🔍', title: 'PEP & Sanctions Screening', desc: '6 official lists including CBUAE, OFAC SDN, UN, EU, and OFSI. Step-by-step confirmation workflow. Auto-sets risk level to High on match.' },
              { num: '06', icon: '🔒', title: '5-Year Records Vault', desc: 'Tracks every client through their retention window post-relationship. Progress bars, disposal dates, and UAE Law Art. 14 compliance built in.' },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 90} direction={i % 2 === 0 ? 'left' : 'right'}>
                <div style={S.featureCard} className="feature-card">
                  <div style={S.featureNum}>{f.num}</div>
                  <div style={S.featureIcon}>{f.icon}</div>
                  <h3 style={S.featureTitle}>{f.title}</h3>
                  <p style={S.featureDesc}>{f.desc}</p>
                  <div className="feature-card-line" />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="compliance" style={{ ...S.section, backgroundColor: '#0a0a0a' }}>
        <GridBackground />
        <div style={{ ...S.sectionInner, position: 'relative', zIndex: 1 }}>
          <div style={S.sectionHeader}>
            <FadeIn direction="none">
              <div style={S.sectionTag} className="section-tag">HOW IT WORKS</div>
            </FadeIn>
            <RevealText delay={100}><h2 style={S.sectionTitle}>From client intake to full AML compliance</h2></RevealText>
            <FadeIn delay={200} direction="none">
              <p style={S.sectionSub}>A structured workflow that replaces spreadsheets, WhatsApp, and manual goAML filing.</p>
            </FadeIn>
          </div>

          {/* Steps with vertical timeline */}
          <div style={{ position: 'relative' }}>
            <TimelineConnector />
            <div style={S.stepsRow}>
              {[
                { num: '01', title: 'Onboard the client', desc: 'Create KYC profile. Upload passport, Emirates ID, source of funds declaration. Compliance checklist auto-tracks completeness.' },
                { num: '02', title: 'Assess the risk', desc: 'Run the CDD/EDD scoring form. Score is calculated instantly — CDD, CDD+, or EDD — and saved to the client record.' },
                { num: '03', title: 'Screen & monitor', desc: 'Check 6 official sanctions lists and PEP databases. Track cash transactions toward the AED 55,000 threshold.' },
                { num: '04', title: 'Report & retain', desc: 'File STRs or REAR reports as PDFs. Store everything for the mandatory 5-year window. Stay audit-ready at all times.' },
              ].map((step, i) => (
                <FadeIn key={i} delay={i * 150} direction={i % 2 === 0 ? 'left' : 'right'}>
                  <div style={S.step} className="step-card">
                    <div style={S.stepNum}>{step.num}</div>
                    <StepLine delay={i * 150} />
                    <h3 style={S.stepTitle}>{step.title}</h3>
                    <p style={S.stepDesc}>{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="pricing" style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.sectionHeader}>
            <FadeIn direction="none">
              <div style={S.sectionTag} className="section-tag">PRICING</div>
            </FadeIn>
            <RevealText delay={100}><h2 style={S.sectionTitle}>Simple, transparent pricing</h2></RevealText>
            <FadeIn delay={200} direction="none">
              <p style={S.sectionSub}>Cancel any time. No setup fees. Onboarding included.</p>
            </FadeIn>
          </div>
          <div style={S.pricingGrid}>
            {[
              { name: 'Starter', price: '1,500', period: '/month', desc: 'For small agencies managing up to 50 clients.', features: ['Up to 50 active clients', 'KYC profiles & documents', 'Risk assessments', 'STR builder', 'PEP/Sanctions screening', '5-year vault', 'Email support'], cta: 'Start free trial', highlight: false },
              { name: 'Pro', price: '3,500', period: '/month', desc: 'For established agencies with a dedicated compliance officer.', features: ['Unlimited clients', 'Everything in Starter', 'Cash transaction tracker', 'REAR report generator', 'Compliance calendar', 'Priority support', 'Team access (5 users)'], cta: 'Start free trial', highlight: true },
              { name: 'Enterprise', price: '8,000+', period: '/month', desc: 'For large agencies, property developers, and groups.', features: ['Everything in Pro', 'Custom user seats', 'API access', 'Mollak/Ejari integration (coming)', 'Dedicated account manager', 'SLA guarantee', 'Custom onboarding'], cta: 'Contact us', highlight: false },
            ].map((plan, i) => (
              <FadeIn key={i} delay={i * 130} direction={i === 0 ? 'left' : i === 2 ? 'right' : 'up'}>
                <div style={{ ...S.pricingCard, ...(plan.highlight ? S.pricingCardHighlight : {}) }}
                  className={plan.highlight ? 'pricing-card-highlight' : 'pricing-card'}>
                  {plan.highlight && <div style={S.pricingBadge}>MOST POPULAR</div>}
                  <div style={S.planName}>{plan.name}</div>
                  <div style={S.planPrice}><span style={S.planCurrency}>AED </span>{plan.price}<span style={S.planPeriod}>{plan.period}</span></div>
                  <p style={S.planDesc}>{plan.desc}</p>
                  <div style={S.planDivider} />
                  <ul style={S.planFeatures}>
                    {plan.features.map((f, j) => (
                      <li key={j} style={S.planFeature}><span style={S.planCheck}>✓</span> {f}</li>
                    ))}
                  </ul>
                  <button onClick={() => router.push('/login')} style={plan.highlight ? S.planCTAHighlight : S.planCTA}>{plan.cta}</button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust marquee ──────────────────────────────────────────────── */}
      <section style={S.trustSection}>
        <FadeIn direction="none">
          <p style={{ ...S.trustLabel, textAlign: 'center', marginBottom: '24px' }}>Built in compliance with</p>
        </FadeIn>
        <TrustMarquee />
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section style={S.ctaSection}>
        <GridBackground />
        <GoldParticles />
        <div style={S.ctaInner}>
          <FadeIn direction="none">
            <h2 style={S.ctaTitle}>Ready to meet your AML obligations?</h2>
          </FadeIn>
          <FadeIn delay={120} direction="none">
            <p style={S.ctaSub}>Join RERA-registered agencies using COMPLY.AE to stay compliant without the manual work.</p>
          </FadeIn>
          <FadeIn delay={240} direction="none">
            <button onClick={() => router.push('/login')} style={S.ctaPrimaryLarge} className="cta-btn-glow">
              Start your free trial →
            </button>
          </FadeIn>
          <FadeIn delay={360} direction="none">
            <p style={S.ctaNote}>14-day free trial · No credit card · Cancel any time</p>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerTop}>
            <div>
              <div style={S.footerLogo}>COMPLY<span style={S.logoDot}>.AE</span></div>
              <p style={S.footerTagline}>UAE Real Estate AML/KYC Compliance Platform</p>
            </div>
            <div style={S.footerLinks}>
              <div style={S.footerCol}>
                <div style={S.footerColTitle}>Product</div>
                <a href="#features" style={S.footerLink}>Features</a>
                <a href="#pricing" style={S.footerLink}>Pricing</a>
                <a href="/login" style={S.footerLink}>Sign in</a>
              </div>
              <div style={S.footerCol}>
                <div style={S.footerColTitle}>Legal</div>
                <span style={S.footerLink}>UAE AML Law No. 20</span>
                <span style={S.footerLink}>RERA Compliance</span>
                <span style={S.footerLink}>Privacy Policy</span>
              </div>
            </div>
          </div>
          <div style={S.footerBottom}>
            <span>© 2026 COMPLY.AE. All rights reserved.</span>
            <span>Built for Dubai real estate professionals.</span>
          </div>
        </div>
      </footer>

      <style>{`
        /* ── Feature cards ─────────────────────────────────────────────── */
        .feature-card {
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
          cursor: default;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .feature-card-line {
          position: absolute;
          bottom: 0; left: 0;
          height: 1px;
          width: 0%;
          background: linear-gradient(90deg, #C9963F, transparent);
          transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
        }
        .feature-card:hover .feature-card-line {
          width: 100%;
        }
        .feature-card:hover {
          border-color: rgba(201,150,63,0.3) !important;
          transform: translateY(-8px) scale(1.01);
          background: #111 !important;
          box-shadow: 0 0 50px rgba(201,150,63,0.07), 0 24px 48px rgba(0,0,0,0.5);
        }

        /* ── Step card hover ───────────────────────────────────────────── */
        .step-card {
          transition: transform 0.35s ease, background 0.35s ease;
          border-radius: 8px;
          padding: 24px;
          margin: -24px;
        }
        .step-card:hover {
          background: rgba(201,150,63,0.03);
        }

        /* ── Stat value glow ───────────────────────────────────────────── */
        .stat-value {
          animation: statGlow 3s ease-in-out infinite;
        }
        @keyframes statGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3) drop-shadow(0 0 16px rgba(201,150,63,0.7)); }
        }

        /* ── Section tag shimmer ───────────────────────────────────────── */
        .section-tag {
          background: linear-gradient(90deg, transparent 0%, rgba(201,150,63,0.18) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        /* ── Pricing card — highlight breathing glow ───────────────────── */
        .pricing-card-highlight {
          animation: breatheGold 3.5s ease-in-out infinite;
        }
        @keyframes breatheGold {
          0%, 100% { box-shadow: 0 0 30px rgba(201,150,63,0.08), 0 0 0 1px rgba(201,150,63,0.12); }
          50% { box-shadow: 0 0 80px rgba(201,150,63,0.25), 0 0 0 1px rgba(201,150,63,0.35); }
        }

        /* ── Pricing card hover ────────────────────────────────────────── */
        .pricing-card {
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease;
        }
        .pricing-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }

        /* ── CTA button pulsing glow ───────────────────────────────────── */
        .cta-btn-glow {
          animation: ctaGlow 2.5s ease-in-out infinite;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .cta-btn-glow:hover {
          transform: scale(1.05);
          filter: brightness(1.12);
        }
        @keyframes ctaGlow {
          0%, 100% { box-shadow: 0 0 25px rgba(201,150,63,0.3), 0 4px 20px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 65px rgba(201,150,63,0.65), 0 4px 40px rgba(0,0,0,0.5); }
        }

        /* ── Hero badge dot pulse ──────────────────────────────────────── */
        .hero-badge-dot {
          animation: dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { box-shadow: 0 0 6px #C9963F; }
          50% { box-shadow: 0 0 18px #C9963F, 0 0 30px rgba(201,150,63,0.4); }
        }

        /* ── Trust marquee ticker ──────────────────────────────────────── */
        .marquee-track {
          animation: marquee 28s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        a { text-decoration: none; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const GOLD = '#C9963F'
const DARK = '#080808'

const styles: Record<string, React.CSSProperties> = {
  page: { backgroundColor: DARK, color: '#F5F5F5', fontFamily: 'var(--font-inter), system-ui, sans-serif', minHeight: '100vh', overflowX: 'hidden' },

  nav: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 40px', transition: 'background 0.3s, border-color 0.3s', borderBottom: '1px solid transparent' },
  navScrolled: { background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1E1E1E' },
  navInner: { maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' },
  logo: { fontSize: '18px', fontWeight: '800', letterSpacing: '0.06em', color: '#F5F5F5' },
  logoDot: { color: GOLD },
  navLinks: { display: 'flex', alignItems: 'center', gap: '32px' },
  navLink: { color: '#888', fontSize: '14px', cursor: 'pointer', textDecoration: 'none' },
  navLogin: { background: 'transparent', border: 'none', color: '#888', fontSize: '14px', cursor: 'pointer', padding: '8px 16px' },
  navCTA: { background: GOLD, border: 'none', color: '#000', fontSize: '13px', fontWeight: '700', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer' },

  hero: { position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#030308' },
  heroContent: { position: 'relative', zIndex: 3, textAlign: 'center', maxWidth: '860px', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', marginTop: '-60px' },
  heroBadge: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', border: '1px solid #C9963F55', background: '#C9963F14', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', color: '#C9963F' },
  heroBadgeDot: { width: '6px', height: '6px', borderRadius: '50%', background: GOLD, boxShadow: `0 0 10px ${GOLD}`, display: 'inline-block' },
  heroTitle: { fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(44px, 7vw, 82px)', fontWeight: '700', lineHeight: '1.1', color: '#F5F5F5', margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 40px rgba(0,0,0,0.9)' },
  heroTitleItalic: { fontStyle: 'italic', color: GOLD },
  heroSub: { fontSize: '17px', lineHeight: '1.7', color: '#AAAABB', maxWidth: '580px', margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.9)' },
  heroCTAs: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  ctaPrimary: { background: GOLD, color: '#000', border: 'none', borderRadius: '8px', padding: '14px 28px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  ctaArrow: { fontSize: '18px' },
  ctaSecondary: { background: 'rgba(255,255,255,0.08)', color: '#F5F5F5', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', padding: '14px 28px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', backdropFilter: 'blur(8px)' },
  heroNote: { fontSize: '12px', color: '#555', margin: 0, letterSpacing: '0.03em' },

  statsSection: { borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', padding: '60px 40px' },
  statsGrid: { maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' },
  statCard: { textAlign: 'center', padding: '0 32px' },
  statValue: { fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '36px', fontWeight: '700', color: GOLD, letterSpacing: '-0.02em', lineHeight: '1.1' },
  statLabel: { fontSize: '13px', fontWeight: '600', color: '#F5F5F5', marginTop: '8px' },
  statSub: { fontSize: '11px', color: '#555', marginTop: '4px' },

  section: { padding: '100px 40px', position: 'relative' },
  sectionInner: { maxWidth: '1200px', margin: '0 auto' },
  sectionHeader: { textAlign: 'center', marginBottom: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  sectionTag: { fontSize: '10px', fontWeight: '700', letterSpacing: '0.18em', color: GOLD, padding: '4px 12px', border: '1px solid #C9963F33', borderRadius: '4px' },
  sectionTitle: { fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '700', color: '#F5F5F5', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.2' },
  sectionSub: { fontSize: '16px', color: '#8888AA', maxWidth: '520px', margin: 0, lineHeight: '1.6' },

  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', border: '1px solid #1A1A1A', borderRadius: '12px', overflow: 'hidden' },
  featureCard: { background: '#0D0D0D', padding: '36px 32px', border: '1px solid transparent' },
  featureNum: { fontSize: '11px', fontWeight: '700', color: '#333', letterSpacing: '0.1em', marginBottom: '16px' },
  featureIcon: { fontSize: '28px', marginBottom: '16px', display: 'block' },
  featureTitle: { fontSize: '15px', fontWeight: '700', color: '#F0F0F0', margin: '0 0 12px 0' },
  featureDesc: { fontSize: '13.5px', color: '#666', lineHeight: '1.65', margin: 0 },

  stepsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '48px', paddingTop: '8px' },
  step: { display: 'flex', flexDirection: 'column', gap: '12px' },
  stepNum: { fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '44px', fontWeight: '700', color: '#1E1E1E', lineHeight: '1', letterSpacing: '-0.03em' },
  stepLine: { width: '32px', height: '2px', background: GOLD, borderRadius: '1px' },
  stepTitle: { fontSize: '16px', fontWeight: '700', color: '#F0F0F0', margin: 0 },
  stepDesc: { fontSize: '13.5px', color: '#666', lineHeight: '1.65', margin: 0 },

  pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', border: '1px solid #1A1A1A', borderRadius: '12px', overflow: 'hidden' },
  pricingCard: { background: '#0D0D0D', padding: '40px 36px', position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' },
  pricingCardHighlight: { background: '#0F0D0A', borderTop: `2px solid ${GOLD}` },
  pricingBadge: { position: 'absolute', top: '16px', right: '20px', fontSize: '9px', fontWeight: '800', letterSpacing: '0.12em', color: GOLD, border: '1px solid #C9963F44', padding: '3px 8px', borderRadius: '4px' },
  planName: { fontSize: '12px', fontWeight: '700', letterSpacing: '0.1em', color: '#555', marginBottom: '16px' },
  planPrice: { fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '40px', fontWeight: '700', color: '#F5F5F5', letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '12px' },
  planCurrency: { fontSize: '16px', fontWeight: '400', verticalAlign: 'top', marginTop: '8px', display: 'inline-block' },
  planPeriod: { fontSize: '14px', fontWeight: '400', color: '#555' },
  planDesc: { fontSize: '13px', color: '#666', lineHeight: '1.5', marginBottom: '24px' },
  planDivider: { height: '1px', background: '#1A1A1A', marginBottom: '24px' },
  planFeatures: { listStyle: 'none', margin: '0 0 32px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  planFeature: { fontSize: '13px', color: '#888', display: 'flex', alignItems: 'flex-start', gap: '10px' },
  planCheck: { color: GOLD, fontWeight: '700', flexShrink: 0 },
  planCTA: { background: 'transparent', color: '#F5F5F5', border: '1px solid #2E2E2E', borderRadius: '7px', padding: '13px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', width: '100%' },
  planCTAHighlight: { background: GOLD, color: '#000', border: 'none', borderRadius: '7px', padding: '13px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' },

  trustSection: { padding: '48px 0', borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', overflow: 'hidden' },
  trustLabel: { fontSize: '12px', color: '#444', fontWeight: '500', margin: '0 0 24px', letterSpacing: '0.06em' },

  ctaSection: { padding: '120px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  ctaInner: { position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' },
  ctaTitle: { fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: '700', color: '#F5F5F5', margin: 0, lineHeight: '1.15', letterSpacing: '-0.02em' },
  ctaSub: { fontSize: '16px', color: '#8888AA', margin: 0, lineHeight: '1.6' },
  ctaPrimaryLarge: { background: GOLD, color: '#000', border: 'none', borderRadius: '8px', padding: '16px 36px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  ctaNote: { fontSize: '12px', color: '#444', margin: 0 },

  footer: { borderTop: '1px solid #1A1A1A', padding: '64px 40px 40px', backgroundColor: '#060606' },
  footerInner: { maxWidth: '1200px', margin: '0 auto' },
  footerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', gap: '40px', flexWrap: 'wrap' },
  footerLogo: { fontSize: '20px', fontWeight: '800', color: '#F5F5F5', letterSpacing: '0.05em', marginBottom: '8px' },
  footerTagline: { fontSize: '12px', color: '#444', margin: 0 },
  footerLinks: { display: 'flex', gap: '60px' },
  footerCol: { display: 'flex', flexDirection: 'column', gap: '12px' },
  footerColTitle: { fontSize: '11px', fontWeight: '700', color: '#555', letterSpacing: '0.1em', marginBottom: '4px' },
  footerLink: { fontSize: '13px', color: '#444', cursor: 'pointer', textDecoration: 'none' },
  footerBottom: { borderTop: '1px solid #141414', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#333', flexWrap: 'wrap', gap: '8px' },
}
