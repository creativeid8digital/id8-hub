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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F5F5F7 0%, #EDE9FE 50%, #F5F5F7 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Decorative blobs */}
      <div style={{ position:'fixed', top:'-10vh', right:'-5vw', width:'50vw', height:'50vh', background:'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-10vh', left:'-5vw', width:'40vw', height:'40vh', background:'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{
        width: 420,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(40px)',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)',
        padding: '48px 40px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #7C3AED, #9F67F7)',
            boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
            marginBottom: 16,
          }}>
            <span style={{ fontFamily:'var(--font-body)', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>ID8</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            ID8 Hub
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
            Agency Workspace
          </div>
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.7 }}>
          Sign in with your ID8 Google account to access the workspace.
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          style={{
            width: '100%', padding: '14px 24px',
            background: 'var(--text-primary)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--font-body)', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-disabled)' }}>
          Access restricted to id8.digital team members only.
        </div>
      </div>
    </div>
  )
}
