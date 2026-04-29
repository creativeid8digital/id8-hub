'use client'
import { useEffect, useState } from 'react'
import { supabase, type SocialPost } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns'

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#ec4899', twitter: '#a3e635', linkedin: '#3b82f6',
  youtube: '#ef4444', facebook: '#3b82f6', tiktok: '#06b6d4',
}
const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📱', twitter: '🐦', linkedin: '💼',
  youtube: '▶️', facebook: '👥', tiktok: '🎵',
}

export default function SocialCalendar({ brandId }: { brandId: string }) {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [month, setMonth] = useState(new Date())

  useEffect(() => {
    const start = format(startOfMonth(month), 'yyyy-MM-dd')
    const end = format(endOfMonth(month), 'yyyy-MM-dd')
    let q = supabase.from('social_posts').select('*, brands(name,color)').gte('scheduled_date', start).lte('scheduled_date', end)
    if (brandId) q = q.eq('brand_id', brandId)
    q.then(({ data }) => setPosts(data || []))
  }, [month, brandId])

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const startPad = (getDay(startOfMonth(month)) + 6) % 7 // Mon start

  const postsForDay = (date: Date) =>
    posts.filter(p => p.scheduled_date === format(date, 'yyyy-MM-dd'))

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:22, letterSpacing:'0.05em', color:'var(--text-primary)', flex:1 }}>
          {format(month, 'MMMM yyyy')}
        </div>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()-1))} style={{ padding:'6px 14px', borderRadius:100, background:'transparent', border:'0.5px solid var(--border-default)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)' }}>← Prev</button>
        <button onClick={() => setMonth(new Date())} style={{ padding:'6px 14px', borderRadius:100, background:'var(--accent-subtle)', border:'0.5px solid var(--border-default)', color:'var(--accent-bright)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)' }}>Today</button>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()+1))} style={{ padding:'6px 14px', borderRadius:100, background:'transparent', border:'0.5px solid var(--border-default)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)' }}>Next →</button>
      </div>

      <div style={{ background:'var(--bg-surface)', border:'0.5px solid var(--border-subtle)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ padding:'10px 8px', textAlign:'center', fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', borderBottom:'0.5px solid var(--border-subtle)', background:'var(--bg-elevated)' }}>{d}</div>
          ))}

          {/* Padding */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} style={{ minHeight:88, borderRight:'0.5px solid var(--border-subtle)', borderBottom:'0.5px solid var(--border-subtle)', opacity:0.3 }} />
          ))}

          {days.map((day, i) => {
            const dayPosts = postsForDay(day)
            const col = (startPad + i) % 7
            return (
              <div key={day.toISOString()} style={{
                minHeight:88, padding:8,
                borderRight: col === 6 ? 'none' : '0.5px solid var(--border-subtle)',
                borderBottom: '0.5px solid var(--border-subtle)',
                background: isToday(day) ? 'var(--accent-subtle)' : 'transparent',
              }}>
                <div style={{ fontSize:11, fontWeight:500, marginBottom:5, fontFamily:'monospace', color: isToday(day) ? 'var(--accent-bright)' : 'var(--text-muted)' }}>
                  {format(day, 'd')}
                </div>
                {dayPosts.map(p => (
                  <div key={p.id} style={{
                    fontSize:10, padding:'3px 7px', borderRadius:4, marginBottom:3,
                    fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    cursor:'pointer',
                    background: `${PLATFORM_COLORS[p.platform] || '#7c3aed'}18`,
                    color: PLATFORM_COLORS[p.platform] || 'var(--accent-bright)',
                  }}>
                    {PLATFORM_EMOJI[p.platform] || '📌'} {p.title}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
        {Object.entries(PLATFORM_COLORS).map(([p, c]) => (
          <div key={p} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
            <div style={{ width:8, height:8, borderRadius:2, background: c }} /> {p}
          </div>
        ))}
      </div>
    </div>
  )
}
