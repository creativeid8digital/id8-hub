'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell } from 'lucide-react'

type Notification = {
  id: string; type: string; title: string; body: string | null
  link_type: string | null; link_id: string | null; read: boolean; created_at: string
}

const TYPE_ICON: Record<string, string> = {
  task_assigned: '📋', status_changed: '🔄', approval_needed: '✅',
  approved: '🎉', rejected: '↩️', brief_created: '📝',
  comment: '💬', time_reminder: '⏰', system: 'ℹ️',
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = () => {
    supabase.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setNotifs((data as Notification[]) || []))
  }

  useEffect(() => {
    if (!userId) return
    load()
    const sub = supabase.channel(`notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [userId])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifs(notifs.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: open ? 'var(--accent-light)' : '#F5F5F7', border: `1px solid ${open ? 'var(--accent)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
        <Bell size={16} color={open ? 'var(--accent)' : 'var(--text-muted)'} />
        {unread > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 44, right: 0, width: 340, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>Mark all read</button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                You're all caught up!
              </div>
            ) : notifs.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', background: n.read ? '#fff' : '#F5F3FF', cursor: 'pointer', display: 'flex', gap: 12, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = n.read ? '#fff' : '#F5F3FF'}
              >
                <div style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{TYPE_ICON[n.type] || '🔔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
