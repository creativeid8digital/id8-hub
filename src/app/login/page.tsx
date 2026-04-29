'use client'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  if (status === 'loading') return null

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        width: 400, padding: '40px 36px',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 60px var(--accent-glow)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36, letterSpacing: '0.06em',
          marginBottom: 8, color: 'var(--text-primary)',
        }}>
          ID<span style={{ color: 'var(--accent-bright)' }}>8</span> HUB
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text-muted)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          marginBottom: 32,
        }}>
          Agency Workspace
        </div>

        <div style={{
          fontSize: 14, color: 'var(--text-secondary)',
          marginBottom: 28, lineHeight: 1.6,
        }}>
          Sign in with your ID8 Google account to access the workspace.
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          style={{
            width: '100%', padding: '13px 24px',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: '100px',
            fontFamily: 'var(--font-body)', fontSize: 13,
            fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10,
            boxShadow: '0 8px 30px var(--accent-glow)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".8"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity=".6"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          marginTop: 24, fontSize: 11,
          color: 'var(--text-disabled)', lineHeight: 1.6,
        }}>
          Access restricted to id8.digital team members only.
        </div>
      </div>
    </div>
  )
}
