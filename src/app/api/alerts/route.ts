import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const resend = new Resend(process.env.RESEND_API_KEY)

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function propName(p: { unit_number: string | null; building_name: string | null }) {
  return [p.unit_number, p.building_name].filter(Boolean).join(', ') || 'Unnamed Property'
}

export async function GET(request: Request) {
  // Simple auth check — only Vercel cron or manual trigger with secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── 1. Get all users ───────────────────────────────────────────────────
    const { data: users } = await supabase.auth.admin.listUsers()
    if (!users?.users?.length) {
      return NextResponse.json({ message: 'No users found' })
    }

    const results: string[] = []

    for (const user of users.users) {
      if (!user.email) continue
      const userId = user.id
      const email = user.email

      const alerts: string[] = []

      // ── 2. Ejari alerts ──────────────────────────────────────────────────
      const { data: properties } = await supabase
        .from('properties')
        .select('unit_number, building_name, ejari_expiry, status')
        .eq('user_id', userId)
        .not('ejari_expiry', 'is', null)

      for (const prop of properties || []) {
        const days = daysUntil(prop.ejari_expiry)
        const name = propName(prop)

        if (days < 0) {
          alerts.push(`🚨 <strong>${name}</strong> — Ejari EXPIRED ${Math.abs(days)} days ago. Renew immediately to avoid fines up to AED 50,000.`)
        } else if (days <= 30) {
          alerts.push(`⚠️ <strong>${name}</strong> — Ejari expires in <strong>${days} days</strong>. Urgent renewal required.`)
        } else if (days <= 90) {
          alerts.push(`📅 <strong>${name}</strong> — Ejari expires in ${days} days. Start renewal process soon.`)
        }
      }

      // ── 3. Rent alerts ───────────────────────────────────────────────────
      const { data: rentPayments } = await supabase
        .from('rent_payments')
        .select('period_label, due_date, expected_amount, status, properties(unit_number, building_name)')
        .eq('user_id', userId)
        .in('status', ['outstanding', 'late'])
        .not('due_date', 'is', null)

      for (const payment of rentPayments || []) {
        const days = daysUntil(payment.due_date)
        const prop = payment.properties as { unit_number: string | null; building_name: string | null } | null
        const name = prop ? propName(prop) : 'Unknown Property'
        const amount = payment.expected_amount ? `AED ${Number(payment.expected_amount).toLocaleString()}` : ''
        const period = payment.period_label || ''

        if (days < 0) {
          alerts.push(`💸 <strong>${name}</strong> — Rent ${period ? `for ${period}` : ''} is <strong>${Math.abs(days)} days overdue</strong>${amount ? ` (${amount})` : ''}. Follow up with tenant.`)
        } else if (days <= 7) {
          alerts.push(`💰 <strong>${name}</strong> — Rent ${period ? `for ${period}` : ''} is due in <strong>${days} days</strong>${amount ? ` (${amount})` : ''}.`)
        }
      }

      // ── 4. Vault document expiry alerts ──────────────────────────────────
      const { data: vaultDocs } = await supabase
        .from('vault_documents')
        .select('name, expiry_date, properties(unit_number, building_name)')
        .eq('user_id', userId)
        .not('expiry_date', 'is', null)

      for (const doc of vaultDocs || []) {
        const days = daysUntil(doc.expiry_date)
        const prop = doc.properties as { unit_number: string | null; building_name: string | null } | null
        const propLabel = prop ? ` (${propName(prop)})` : ''

        if (days < 0) {
          alerts.push(`🔒 Document <strong>${doc.name}</strong>${propLabel} has <strong>expired</strong>. Update it in your Vault.`)
        } else if (days <= 30) {
          alerts.push(`🔒 Document <strong>${doc.name}</strong>${propLabel} expires in <strong>${days} days</strong>. Renew it soon.`)
        }
      }

      // ── 5. Send email if there are alerts ────────────────────────────────
      if (alerts.length === 0) {
        results.push(`${email}: no alerts`)
        continue
      }

      const alertRows = alerts
        .map(a => `
          <tr>
            <td style="padding: 14px 0; border-bottom: 1px solid #1E1E1E; font-size: 14px; color: #CCCCCC; line-height: 1.6;">
              ${a}
            </td>
          </tr>`)
        .join('')

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0; padding:0; background-color:#080808; font-family: system-ui, -apple-system, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080808; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0D0D0D; border: 1px solid #1E1E1E; border-radius: 12px; overflow: hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="padding: 28px 32px; border-bottom: 1px solid #1E1E1E;">
                      <span style="font-size: 18px; font-weight: 800; color: #F5F5F5; letter-spacing: 0.06em;">
                        COMPLY<span style="color: #C9963F;">.AE</span>
                      </span>
                      <p style="margin: 6px 0 0 0; font-size: 12px; color: #444; letter-spacing: 0.04em;">Daily Property Alert</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 28px 32px;">
                      <p style="margin: 0 0 6px 0; font-size: 13px; color: #555;">
                        Here's what needs your attention today:
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                        ${alertRows}
                      </table>

                      <div style="margin-top: 28px;">
                        <a href="https://comply-ae.vercel.app/dashboard"
                          style="display: inline-block; padding: 12px 24px; background-color: #C9963F; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                          Open Dashboard →
                        </a>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 32px; border-top: 1px solid #1E1E1E;">
                      <p style="margin: 0; font-size: 11px; color: #333;">
                        You're receiving this because you have a COMPLY.AE account. Alerts are sent daily for expiring Ejari, overdue rent, and expiring documents.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      await resend.emails.send({
        from: 'COMPLY.AE <onboarding@resend.dev>',
        to: email,
        subject: `⚠️ ${alerts.length} alert${alerts.length > 1 ? 's' : ''} need your attention — COMPLY.AE`,
        html,
      })

      results.push(`${email}: sent ${alerts.length} alert(s)`)
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('Alert error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
