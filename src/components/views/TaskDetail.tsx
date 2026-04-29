'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, ExternalLink, Clock, Flag, User, FileText, Plus, ChevronRight } from 'lucide-react'

type Task = {
  id: string; title: string; description: string | null
  brand_id: string | null; brief_id: string | null; status: string
  priority: string; assigned_team: string | null; due_date: string | null
  drive_file_url: string | null; estimated_hours: number | null
  created_at: string; updated_at: string
  brands?: { name: string; color: string }
  briefs?: { title: string }
}

type Comment = {
  id: string; task_id: string; user_id: string; content: string; created_at: string
  users?: { name: string; avatar_url: string | null }
}

type Brand = { id: string; name: string; color: string }
type Brief = { id: string; title: string }

const PIPELINE = ['brief','assigned','in_progress','submitted','in_review','approved','live']
const PIPELINE_LABELS: Record<string, string> = {
  brief: 'Brief', assigned: 'Assigned', in_progress: 'In Progress',
  submitted: 'Submitted', in_review: 'In Review', approved: 'Approved', live: 'Live',
}
const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  brief:       { color: '#86868B', bg: '#F5F5F7' },
  assigned:    { color: '#7C3AED', bg: '#EDE9FE' },
  in_progress: { color: '#F59E0B', bg: '#FFFBEB' },
  submitted:   { color: '#3B82F6', bg: '#EFF6FF' },
  in_review:   { color: '#EC4899', bg: '#FDF2F8' },
  approved:    { color: '#10B981', bg: '#ECFDF5' },
  live:        { color: '#065F46', bg: '#D1FAE5' },
}
const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  low:    { color: '#10B981', bg: '#ECFDF5' },
  medium: { color: '#F59E0B', bg: '#FFFBEB' },
  high:   { color: '#EF4444', bg: '#FEE2E2' },
  urgent: { color: '#7C2D12', bg: '#FEF2F2' },
}
const TEAMS = [
  { value: 'creative_team', label: 'Creative Team' },
  { value: 'content_writer', label: 'Content Writers' },
  { value: 'publishing_team', label: 'Publishing Team' },
  { value: 'performance', label: 'Performance' },
  { value: 'tech', label: 'Tech Team' },
  { value: 'am', label: 'Account Manager' },
]

const inputStyle: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#1D1D1F',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
}

type Props = { taskId: string; onBack: () => void; userEmail: string }

export default function TaskDetail({ taskId, onBack, userEmail }: Props) {
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [edit, setEdit] = useState({
    title: '', description: '', assigned_team: '', priority: '',
    due_date: '', drive_file_url: '', estimated_hours: '', status: '',
    brand_id: '', brief_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t }, { data: b }, { data: br }, { data: u }] = await Promise.all([
      supabase.from('tasks').select('*, brands(name,color), briefs(title)').eq('id', taskId).single(),
      supabase.from('brands').select('id, name, color'),
      supabase.from('briefs').select('id, title'),
      supabase.from('users').select('id').eq('email', userEmail).single(),
    ])
    if (t) {
      setTask(t as Task)
      setEdit({
        title: t.title, description: t.description || '',
        assigned_team: t.assigned_team || '', priority: t.priority,
        due_date: t.due_date || '', drive_file_url: t.drive_file_url || '',
        estimated_hours: t.estimated_hours?.toString() || '',
        status: t.status, brand_id: t.brand_id || '', brief_id: t.brief_id || '',
      })
    }
    if (b) setBrands(b as Brand[])
    if (br) setBriefs(br as Brief[])
    if (u) setUserId(u.id)
    setLoading(false)
  }, [taskId, userEmail])

  const loadComments = useCallback(async () => {
    const { data } = await supabase.from('task_comments').select('*, users(name, avatar_url)').eq('task_id', taskId).order('created_at', { ascending: true })
    setComments((data as Comment[]) || [])
  }, [taskId])

  useEffect(() => { load(); loadComments() }, [load, loadComments])

  const saveTask = async () => {
    if (!task) return
    setSaving(true)
    await supabase.from('tasks').update({
      title: edit.title, description: edit.description || null,
      assigned_team: edit.assigned_team || null, priority: edit.priority,
      due_date: edit.due_date || null, drive_file_url: edit.drive_file_url || null,
      estimated_hours: edit.estimated_hours ? parseFloat(edit.estimated_hours) : null,
      status: edit.status, brand_id: edit.brand_id || null, brief_id: edit.brief_id || null,
    }).eq('id', task.id)
    await load()
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const advanceStatus = async () => {
    if (!task) return
    const idx = PIPELINE.indexOf(task.status)
    if (idx < PIPELINE.length - 1) {
      const next = PIPELINE[idx + 1]
      await supabase.from('tasks').update({ status: next }).eq('id', task.id)
      setTask({ ...task, status: next }); setEdit({ ...edit, status: next })
    }
  }

  const postComment = async () => {
    if (!newComment.trim() || !userId) return
    setPostingComment(true)
    await supabase.from('task_comments').insert({ task_id: taskId, user_id: userId, content: newComment })
    setNewComment(''); await loadComments(); setPostingComment(false)
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading task…</div>
  if (!task) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Task not found.</div>

  const st = STATUS_COLORS[task.status] || STATUS_COLORS.brief
  const pr = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
  const currentIdx = PIPELINE.indexOf(task.status)
  const nextStatus = PIPELINE[currentIdx + 1]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back button */}
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
        <ArrowLeft size={14} /> Back to Pipeline
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* LEFT — main content */}
        <div>
          {/* Header */}
          <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: st.bg, color: st.color }}>{PIPELINE_LABELS[task.status]}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: pr.bg, color: pr.color }}>{task.priority}</span>
              {(task.brands as any)?.name && (
                <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 100, background: '#F5F5F7', color: 'var(--text-muted)' }}>{(task.brands as any).name}</span>
              )}
            </div>

            <input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })}
              style={{ ...inputStyle, fontSize: 18, fontWeight: 700, background: 'transparent', border: 'none', padding: '0 0 12px', borderBottom: '1.5px solid #E5E5EA', borderRadius: 0, marginBottom: 14 }}
              onFocus={e => (e.target as HTMLInputElement).style.borderBottomColor = 'var(--accent)'}
              onBlur={e => (e.target as HTMLInputElement).style.borderBottomColor = '#E5E5EA'}
            />

            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })}
              placeholder="Add task description, context, or instructions…"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6 }}
            />

            {/* Pipeline progress */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Pipeline Progress</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {PIPELINE.map((s, i) => {
                  const done = i < currentIdx; const active = i === currentIdx
                  const sc = STATUS_COLORS[s]
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: done ? '#ECFDF5' : active ? sc.bg : '#F5F5F7', color: done ? '#10B981' : active ? sc.color : 'var(--text-disabled)', border: `1px solid ${done ? '#A7F3D0' : active ? `${sc.color}30` : 'transparent'}` }}>
                        {done ? '✓ ' : ''}{PIPELINE_LABELS[s]}
                      </div>
                      {i < PIPELINE.length - 1 && <ChevronRight size={10} color="#D1D1D6" />}
                    </div>
                  )
                })}
              </div>
            </div>

            {nextStatus && (
              <button onClick={advanceStatus} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 100, background: st.bg, color: st.color, border: `1.5px solid ${st.color}30`, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                Move to {PIPELINE_LABELS[nextStatus]} →
              </button>
            )}
          </div>

          {/* Comments */}
          <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              Comments {comments.length > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>({comments.length})</span>}
            </div>

            {comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>No comments yet. Be the first!</div>
            )}

            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                  {(c.users as any)?.name?.[0] || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{(c.users as any)?.name || 'Team Member'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, background: '#F5F5F7', borderRadius: 10, padding: '10px 14px' }}>{c.content}</div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment…"
                style={{ ...inputStyle, resize: 'none', minHeight: 80, flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
              />
              <button onClick={postComment} disabled={postingComment || !newComment.trim()} style={{ alignSelf: 'flex-end', padding: '9px 18px', borderRadius: 100, background: newComment.trim() ? 'var(--accent)' : '#F5F5F7', color: newComment.trim() ? '#fff' : 'var(--text-muted)', border: 'none', fontSize: 13, fontWeight: 600, cursor: newComment.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                {postingComment ? 'Posting…' : 'Post'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 6 }}>Tip: Cmd+Enter to post</div>
          </div>
        </div>

        {/* RIGHT — task details */}
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Task Details</div>

            {[
              { label: 'Status', field: 'status', type: 'select', options: PIPELINE.map(s => ({ value: s, label: PIPELINE_LABELS[s] })) },
              { label: 'Priority', field: 'priority', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }] },
              { label: 'Assign to Team', field: 'assigned_team', type: 'select', options: TEAMS.map(t => ({ value: t.value, label: t.label })) },
              { label: 'Brand', field: 'brand_id', type: 'select', options: [{ value: '', label: 'No Brand' }, ...brands.map(b => ({ value: b.id, label: b.name }))] },
              { label: 'Linked Brief', field: 'brief_id', type: 'select', options: [{ value: '', label: 'No Brief' }, ...briefs.map(b => ({ value: b.id, label: b.title }))] },
              { label: 'Due Date', field: 'due_date', type: 'date' },
              { label: 'Est. Hours', field: 'estimated_hours', type: 'number', placeholder: 'e.g. 4' },
            ].map(({ label, field, type, options, placeholder }: any) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{label}</label>
                {type === 'select' ? (
                  <select style={{ ...inputStyle, padding: '8px 10px' }} value={(edit as any)[field]} onChange={e => setEdit({ ...edit, [field]: e.target.value })}>
                    {options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} type={type} placeholder={placeholder} value={(edit as any)[field]} onChange={e => setEdit({ ...edit, [field]: e.target.value })} />
                )}
              </div>
            ))}

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Drive Link</label>
              <input style={inputStyle} placeholder="Paste Drive URL" value={edit.drive_file_url} onChange={e => setEdit({ ...edit, drive_file_url: e.target.value })} />
              {edit.drive_file_url && (
                <a href={edit.drive_file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#3B82F6', fontWeight: 500, textDecoration: 'none' }}>
                  <ExternalLink size={11} /> Open in Drive
                </a>
              )}
            </div>

            <button onClick={saveTask} disabled={saving} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 100, background: saved ? '#10B981' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.25)', transition: 'background 0.3s' }}>
              <Save size={14} />{saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          {/* Meta */}
          <div style={{ background: '#F5F5F7', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: 4 }}>Created: {new Date(task.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div>Updated: {new Date(task.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
