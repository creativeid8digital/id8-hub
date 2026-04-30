'use client'
import { useEffect, useState, useRef } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'

type Notification = {
  id: string; type: string; title: string; body: string | null
  read: boolean; created_at: string; link_type: string | null; link_id: string | null
}

const TYPE_ICON: Record<string, string> = {
  task_assigned: '📋', status_changed: '🔄', approval_needed: '👀',
  approved: '✅', rejected: '↩️', comment: '💬', system: 'ℹ️',
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = async () => {
    const res = await fetch('/api/notifications')
    const data = await res.json()
    setNotifs(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markRead = async (id?: string) => {
    await fetch('/api/notifications', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    load()
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(v => !v); if (!open && unread > 0) markRead() }}
        style={{ width: 36, height: 36, borderRadius: 10, background: open ? 'var(--accent-subtle)' : '#F5F5F7', border: `1px solid ${open ? 'var(--accent)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', transition: 'all 0.15s' }}>
        <Bell size={15} color={open ? 'var(--accent)' : 'var(--text-muted)'} />
        {unread > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 44, right: 0, width: 340, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {unread > 0 && (
                <button onClick={() => markRead()}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                <X size={14} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                No notifications yet
              </div>
            ) : notifs.map(n => (
              <div key={n.id}
                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: n.read ? '#fff' : '#F5F3FF', transition: 'background 0.2s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = n.read ? '#fff' : '#F5F3FF'}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICON[n.type] || '🔔'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)', marginBottom: 3 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.body}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
