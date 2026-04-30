'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns'
import { Plus, X, Save } from 'lucide-react'

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#EC4899', twitter: '#1DA1F2', linkedin: '#0A66C2',
  youtube: '#FF0000', facebook: '#1877F2', tiktok: '#06B6D4',
}
const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', twitter: '🐦', linkedin: '💼',
  youtube: '▶️', facebook: '👥', tiktok: '🎵',
}
const POST_TYPES = ['reel','carousel','story','static','thread','blog','newsletter']
const PLATFORMS = ['instagram','twitter','linkedin','youtube','facebook','tiktok']
const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  planned:     { color: '#86868B', bg: '#F5F5F7' },
  in_progress: { color: '#F59E0B', bg: '#FFFBEB' },
  review:      { color: '#3B82F6', bg: '#EFF6FF' },
  approved:    { color: '#10B981', bg: '#ECFDF5' },
  published:   { color: '#065F46', bg: '#D1FAE5' },
}

type Post = {
  id: string; brand_id: string; title: string; platform: string
  post_type: string; scheduled_date: string; status: string
  assigned_to: string | null; drive_file_url: string | null; notes: string | null
  brands?: { name: string; color: string }
}
type Brand = { id: string; name: string; color: string }
type User = { id: string; name: string }

const inputStyle: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#1D1D1F',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
}

export default function SocialCalendar({ brandId }: { brandId: string }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [month, setMonth] = useState(new Date())
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterBrand, setFilterBrand] = useState(brandId || '')
  const [form, setForm] = useState({
    title: '', platform: 'instagram', post_type: 'reel',
    scheduled_date: '', status: 'planned', brand_id: brandId || '',
    assigned_to: '', drive_file_url: '', notes: '',
  })

  const load = useCallback(async () => {
    const start = format(startOfMonth(month), 'yyyy-MM-dd')
    const end = format(endOfMonth(month), 'yyyy-MM-dd')
    let q = supabase.from('social_posts').select('*, brands(name,color)')
      .gte('scheduled_date', start).lte('scheduled_date', end)
    if (filterBrand) q = q.eq('brand_id', filterBrand)
    const { data } = await q
    setPosts((data as Post[]) || [])
  }, [month, filterBrand])

  useEffect(() => {
    load()
    supabase.from('brands').select('*').then(({ data }) => { if (data) setBrands(data) })
    supabase.from('users').select('id, name').then(({ data }) => { if (data) setUsers(data) })
  }, [load])

  const createPost = async () => {
    if (!form.title.trim() || !form.scheduled_date) return
    setSaving(true)
    await supabase.from('social_posts').insert({
      title: form.title, platform: form.platform, post_type: form.post_type,
      scheduled_date: form.scheduled_date, status: form.status,
      brand_id: form.brand_id || null, assigned_to: form.assigned_to || null,
      drive_file_url: form.drive_file_url || null, notes: form.notes || null,
    })
    setSaving(false); setShowCreate(false)
    setForm({ title: '', platform: 'instagram', post_type: 'reel', scheduled_date: '', status: 'planned', brand_id: brandId || '', assigned_to: '', drive_file_url: '', notes: '' })
    load()
  }

  const updatePostStatus = async (id: string, status: string) => {
    await supabase.from('social_posts').update({ status }).eq('id', id)
    setPosts(posts.map(p => p.id === id ? { ...p, status } : p))
    if (selectedPost?.id === id) setSelectedPost({ ...selectedPost, status })
  }

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const startPad = (getDay(startOfMonth(month)) + 6) % 7
  const postsForDay = (date: Date) => posts.filter(p => p.scheduled_date === format(date, 'yyyy-MM-dd'))

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    pending: posts.filter(p => ['planned','in_progress','review'].includes(p.status)).length,
    approved: posts.filter(p => p.status === 'approved').length,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Social Calendar</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Plan, assign and track all social posts</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
            style={{ ...inputStyle, width: 'auto', padding: '8px 12px', fontSize: 12 }}>
            <option value="">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => { setShowCreate(true); setSelectedDate('') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', fontFamily: 'var(--font-body)' }}>
            <Plus size={15} strokeWidth={2.5} /> Add Post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Posts', value: stats.total, color: 'var(--accent)' },
          { label: 'Pending', value: stats.pending, color: '#F59E0B' },
          { label: 'Approved', value: stats.approved, color: '#3B82F6' },
          { label: 'Published', value: stats.published, color: '#10B981' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{format(month, 'MMMM yyyy')}</div>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()-1))} style={{ padding: '7px 16px', borderRadius: 100, background: '#fff', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>← Prev</button>
        <button onClick={() => setMonth(new Date())} style={{ padding: '7px 16px', borderRadius: 100, background: 'var(--accent-subtle)', border: '1px solid var(--border-default)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 600 }}>Today</button>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()+1))} style={{ padding: '7px 16px', borderRadius: 100, background: '#fff', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>Next →</button>
      </div>

      {/* Calendar grid */}
      <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border-subtle)', background: '#F5F5F7' }}>{d}</div>
          ))}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} style={{ minHeight: 100, borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: '#FAFAFA', opacity: 0.5 }} />
          ))}
          {days.map((day, i) => {
            const dayPosts = postsForDay(day)
            const col = (startPad + i) % 7
            const today = isToday(day)
            return (
              <div key={day.toISOString()} style={{ minHeight: 100, padding: 8, borderRight: col === 6 ? 'none' : '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: today ? '#F5F3FF' : '#fff', cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => { setSelectedDate(format(day, 'yyyy-MM-dd')); setForm(f => ({ ...f, scheduled_date: format(day, 'yyyy-MM-dd') })); setShowCreate(true) }}
                onMouseEnter={e => { if (!today) (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA' }}
                onMouseLeave={e => { if (!today) (e.currentTarget as HTMLDivElement).style.background = '#fff' }}
              >
                <div style={{ fontSize: 12, fontWeight: today ? 700 : 500, color: today ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: today ? 'var(--accent)' : 'transparent', color: today ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{format(day, 'd')}</span>
                  {dayPosts.length > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 100 }}>{dayPosts.length}</span>}
                </div>
                {dayPosts.slice(0, 3).map(p => (
                  <div key={p.id} onClick={e => { e.stopPropagation(); setSelectedPost(p) }}
                    style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, marginBottom: 3, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', background: `${PLATFORM_COLORS[p.platform] || '#7C3AED'}15`, color: PLATFORM_COLORS[p.platform] || 'var(--accent)', border: `1px solid ${PLATFORM_COLORS[p.platform] || '#7C3AED'}25` }}>
                    {PLATFORM_EMOJI[p.platform]} {p.title}
                  </div>
                ))}
                {dayPosts.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>+{dayPosts.length - 3} more</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Platform legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        {Object.entries(PLATFORM_COLORS).map(([p, c]) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{p}
          </div>
        ))}
      </div>

      {/* Post detail modal */}
      {selectedPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedPost(null)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: 460, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{PLATFORM_EMOJI[selectedPost.platform]}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: `${PLATFORM_COLORS[selectedPost.platform]}15`, color: PLATFORM_COLORS[selectedPost.platform] }}>{selectedPost.platform}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: STATUS_STYLE[selectedPost.status]?.bg, color: STATUS_STYLE[selectedPost.status]?.color }}>{selectedPost.status}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPost.title}</div>
              </div>
              <button onClick={() => setSelectedPost(null)} style={{ width: 30, height: 30, borderRadius: 8, background: '#F5F5F7', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>📅 {selectedPost.scheduled_date} · {selectedPost.post_type}</div>
            {selectedPost.notes && <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: '#F5F5F7', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>{selectedPost.notes}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Update Status</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_STYLE).map(([s, st]) => (
                  <button key={s} onClick={() => updatePostStatus(selectedPost.id, s)}
                    style={{ padding: '5px 12px', borderRadius: 100, border: `1.5px solid ${selectedPost.status === s ? st.color : 'transparent'}`, background: selectedPost.status === s ? st.bg : '#F5F5F7', color: selectedPost.status === s ? st.color : 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            {selectedPost.drive_file_url && (
              <a href={selectedPost.drive_file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3B82F6', fontWeight: 500, textDecoration: 'none' }}>🔗 Open in Drive</a>
            )}
          </div>
        </div>
      )}

      {/* Create post modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: 500, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>New <span style={{ color: 'var(--accent)' }}>Social Post</span></div>
            {selectedDate && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>📅 Scheduled for {selectedDate}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Post Title / Caption *</label>
                <input style={inputStyle} placeholder="e.g. Nike Summer Run — Reel Day 1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Platform</label>
                  <select style={inputStyle} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_EMOJI[p]} {p}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Post Type</label>
                  <select style={inputStyle} value={form.post_type} onChange={e => setForm({ ...form, post_type: e.target.value })}>
                    {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand</label>
                  <select style={inputStyle} value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">No Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Scheduled Date</label>
                  <input style={inputStyle} type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Assign To</label>
                  <select style={inputStyle} value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Notes / Caption</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} placeholder="Caption, hashtags, or instructions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Drive Link</label>
                <input style={inputStyle} placeholder="Link to creative assets" value={form.drive_file_url} onChange={e => setForm({ ...form, drive_file_url: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '9px 18px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
              <button onClick={createPost} disabled={saving || !form.title.trim() || !form.scheduled_date} style={{ padding: '9px 24px', borderRadius: 100, background: saving ? '#C4B5FD' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                {saving ? 'Saving…' : 'Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
