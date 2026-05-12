'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/RoleContext'

type Profile = {
  id: string
  email: string
  role: string
  created_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useRole()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchProfiles()
    }
    init()
  }, [router])

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setProfiles(data || [])
    setLoading(false)
  }

  const updateRole = async (id: string, role: string) => {
    setSaving(id)
    await supabase.from('profiles').update({ role }).eq('id', id)
    await fetchProfiles()
    setSaving(null)
  }

  if (roleLoading || loading) {
    return <div style={{ padding: '40px 32px' }}><p style={{ color: '#8888aa' }}>Loading...</p></div>
  }

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0' }}>Settings</h2>
        <p style={{ color: '#8888aa', fontSize: '14px', margin: 0 }}>Manage users and roles</p>
      </div>

      {!isAdmin ? (
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#8888aa', fontSize: '15px', margin: 0 }}>⚠️ Only admins can access settings.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E1E1E' }}>
            <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Team Members</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                {['Email', 'Role', 'Joined', 'Change Role'].map(h => (
                  <th key={h} style={{ padding: '12px 24px', textAlign: 'left', color: '#8888aa', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map(profile => (
                <tr key={profile.id} style={{ borderBottom: '1px solid #111111' }}>
                  <td style={{ padding: '16px 24px', color: '#ffffff', fontSize: '14px' }}>{profile.email}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', backgroundColor: profile.role === 'admin' ? '#C9963F44' : '#0D150D', color: profile.role === 'admin' ? '#C9963F' : '#4ade80' }}>
                      {profile.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#8888aa', fontSize: '13px' }}>
                    {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['admin', 'agent'].map(r => (
                        <button
                          key={r}
                          onClick={() => updateRole(profile.id, r)}
                          disabled={profile.role === r || saving === profile.id}
                          style={{
                            padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: profile.role === r ? 'default' : 'pointer',
                            border: '1px solid #1E1E1E',
                            backgroundColor: profile.role === r ? '#1E1E1E' : 'transparent',
                            color: profile.role === r ? '#8888aa' : '#ffffff',
                            opacity: saving === profile.id ? 0.5 : 1,
                          }}
                        >
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
