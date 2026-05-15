import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // Hand off to the client-side page so the app's own Supabase client
  // can exchange the code (it needs the PKCE verifier from localStorage).
  const dest = code
    ? `/auth/complete?code=${encodeURIComponent(code)}`
    : '/login'
  return NextResponse.redirect(new URL(dest, requestUrl.origin))
}
