'use client'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Save, ExternalLink, ChevronRight, Clock } from 'lucide-react'

type Task = {
  id: string; title: string; description: string | null
  brand_id: string | null; brief_id: string | null; status: string
  priority: string; assigned_team: string | null; due_date: string | null
  drive_file_url: string | null; estimated_hours: number | null
  created_at: string; updated_at: string
  brands?: { name: string; color: string }
  briefs?: { title: string; description: string | null; drive_file_url: string | null }
  users?: { id: string; name: string; avatar_url: string | null }
}
type Comment = {
  id: string; content: string; created_at: string
  users?: { name: string; avatar_url: string | null }
}

const PIPELINE = ['brief','assigned','in_progress','submitted','in_review','approved','live']
const PIPELINE_LABELS: Record<string,string> = { brief:'Brief', assigned:'Assigned', in_progress:'In Progress', submitted:'Submitted', in_review:'In Review', approved:'Approved', live:'Live' }
const STATUS_COLORS: Record<string,{color:string;bg:string}> = {
  brief:{color:'#86868B',bg:'#F5F5F7'}, assigned:{color:'#7C3AED',bg:'#EDE9FE'},
  in_progress:{color:'#F59E0B',bg:'#FFFBEB'}, submitted:{color:'#3B82F6',bg:'#EFF6FF'},
  in_review:{color:'#EC4899',bg:'#FDF2F8'}, approved:{color:'#10B981',bg:'#ECFDF5'}, live:{color:'#065F46',bg:'#D1FAE5'},
}

const inp: React.CSSProperties = {
  background:'#F5F5F7', border:'1.5px solid #E5E5EA', borderRadius:10,
  padding:'9px 12px', fontSize:13, color:'#1D1D1F', fontFamily:'var(--font-body)', outline:'none', width:'100%',
}

type Props = { taskId: string; onBack: () => void; userEmail: string }

export default function TaskDetail({ taskId, onBack, userEmail }: Props) {
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [edit, setEdit] = useState({ title:'', description:'', priority:'medium', due_date:'', drive_file_url:'', status:'brief' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tasks/${taskId}`)
    const data = await res.json()
    if (data.task) {
      setTask(data.task)
      setEdit({
        title: data.task.title, description: data.task.description || '',
        priority: data.task.priority, due_date: data.task.due_date || '',
        drive_file_url: data.task.drive_file_url || '', status: data.task.status,
      })
    }
    setComments(data.comments || [])
    setLoading(false)
  }, [taskId])

  useEffect(() => { load() }, [load])


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { alert('File too large. Max 50MB.'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('task_id', taskId)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setUploadedUrl(data.url)
        setEdit(prev => ({ ...prev, drive_file_url: data.url }))
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  const saveTask = async () => {
    setSaving(true)
    await fetch(`/api/tasks/${taskId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(edit) })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  const advanceStatus = async () => {
    if (!task) return
    const idx = PIPELINE.indexOf(task.status)
    if (idx < PIPELINE.length - 1) {
      const next = PIPELINE[idx + 1]
      await fetch(`/api/tasks/${taskId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: next }) })
      setTask({ ...task, status: next }); setEdit({ ...edit, status: next })
    }
  }

  const postComment = async () => {
    if (!newComment.trim()) return
    setPostingComment(true)
    const res = await fetch('/api/comments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ task_id: taskId, content: newComment }) })
    const comment = await res.json()
    if (comment.id) setComments([...comments, comment])
    setNewComment(''); setPostingComment(false)
  }

  if (loading) return <div style={{ padding:40, color:'var(--text-muted)', fontSize:13 }}>Loading task…</div>
  if (!task) return <div style={{ padding:40, color:'var(--text-muted)', fontSize:13 }}>Task not found.</div>

  const st = STATUS_COLORS[task.status] || STATUS_COLORS.brief
  const currentIdx = PIPELINE.indexOf(task.status)
  const nextStatus = PIPELINE[currentIdx + 1]
  const brief = task.briefs as any

  return (
    <div>
      <button onClick={onBack} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', padding:'0 0 20px', fontFamily:'var(--font-body)', fontWeight:500 }}>
        <ArrowLeft size={14} /> Back to Pipeline
      </button>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20 }}>
        {/* LEFT */}
        <div>
          {/* Header card */}
          <div style={{ background:'#fff', border:'1px solid var(--border-subtle)', borderRadius:20, padding:24, marginBottom:16, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:100, background:st.bg, color:st.color }}>{PIPELINE_LABELS[task.status]}</span>
              {(task.brands as any)?.name && <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:100, background:'#F5F5F7', color:'var(--text-muted)' }}>{(task.brands as any).name}</span>}
            </div>

            <input value={edit.title} onChange={e => setEdit({...edit, title:e.target.value})}
              style={{...inp, fontSize:18, fontWeight:700, background:'transparent', border:'none', padding:'0 0 12px', borderBottom:'1.5px solid #E5E5EA', borderRadius:0, marginBottom:14}}
              onFocus={e => (e.target as HTMLInputElement).style.borderBottomColor='var(--accent)'}
              onBlur={e => (e.target as HTMLInputElement).style.borderBottomColor='#E5E5EA'}
            />

            <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Description</label>
            <textarea value={edit.description} onChange={e => setEdit({...edit, description:e.target.value})}
              placeholder="Add task description, context, or instructions…"
              style={{...inp, resize:'vertical', minHeight:100, lineHeight:1.6}}
            />

            {/* Brief context */}
            {brief?.description && (
              <div style={{ marginTop:16, padding:'14px 16px', background:'#F5F3FF', borderRadius:12, borderLeft:'3px solid var(--accent)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Brief / Job Description</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>{brief.description}</div>
                {brief.drive_file_url && (
                  <a href={brief.drive_file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:8, fontSize:12, color:'#3B82F6', fontWeight:500, textDecoration:'none' }}>
                    <ExternalLink size={11} /> Open Drive Folder
                  </a>
                )}
              </div>
            )}


            {/* Upload Creative */}
            <div style={{ marginTop: 16, background: '#fff', border: '1.5px solid var(--border-default)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>📎 Upload Creative</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Upload your work for review. Images, PDFs and videos accepted.</div>
              
              {uploading && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10, fontWeight: 500 }}>⏳ Uploading…</div>}
              {uploadedUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: '#ECFDF5', borderRadius: 10, border: '1px solid #A7F3D0' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>✓ File uploaded</span>
                  <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3B82F6', fontWeight: 500, textDecoration: 'none' }}>View file →</a>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px', border: '2px dashed var(--border-default)', borderRadius: 12, cursor: 'pointer', background: '#FAFAFA', transition: 'all 0.2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLLabelElement; el.style.borderColor = 'var(--accent)'; el.style.background = 'var(--accent-subtle)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLLabelElement; el.style.borderColor = 'var(--border-default)'; el.style.background = '#FAFAFA' }}
              >
                <input type="file" accept="image/*,video/*,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>☁️</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Click to upload creative</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>JPG, PNG, PDF, MP4 · Max 50MB</div>
                </div>
              </label>
            </div>

            {/* Pipeline progress */}
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginBottom:10 }}>Pipeline</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {PIPELINE.map((s, i) => {
                  const done = i < currentIdx; const active = i === currentIdx
                  const sc = STATUS_COLORS[s]
                  return (
                    <div key={s} style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:600, background:done?'#ECFDF5':active?sc.bg:'#F5F5F7', color:done?'#10B981':active?sc.color:'var(--text-disabled)', border:`1px solid ${done?'#A7F3D0':active?`${sc.color}30`:'transparent'}` }}>
                        {done?'✓ ':''}{PIPELINE_LABELS[s]}
                      </div>
                      {i < PIPELINE.length-1 && <ChevronRight size={10} color="#D1D1D6" />}
                    </div>
                  )
                })}
              </div>
            </div>

            {nextStatus && (
              <button onClick={advanceStatus}
                style={{ marginTop:14, display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:100, background:st.bg, color:st.color, border:`1.5px solid ${st.color}30`, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all 0.15s' }}>
                Move to {PIPELINE_LABELS[nextStatus]} →
              </button>
            )}
          </div>

          {/* Comments */}
          <div style={{ background:'#fff', border:'1px solid var(--border-subtle)', borderRadius:20, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>
              Comments {comments.length > 0 && <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)' }}>({comments.length})</span>}
            </div>

            {comments.length === 0 && <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-muted)', fontSize:13 }}>No comments yet.</div>}

            {comments.map(c => (
              <div key={c.id} style={{ display:'flex', gap:10, marginBottom:16 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--accent)', flexShrink:0 }}>
                  {(c.users as any)?.name?.[0] || '?'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{(c.users as any)?.name || 'Team'}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, background:'#F5F5F7', borderRadius:10, padding:'10px 14px' }}>{c.content}</div>
                </div>
              </div>
            ))}

            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                style={{...inp, resize:'none', minHeight:72, flex:1}}
                onKeyDown={e => { if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)) postComment() }}
              />
              <button onClick={postComment} disabled={postingComment||!newComment.trim()}
                style={{ alignSelf:'flex-end', padding:'9px 18px', borderRadius:100, background:newComment.trim()?'var(--accent)':'#F5F5F7', color:newComment.trim()?'#fff':'var(--text-muted)', border:'none', fontSize:13, fontWeight:600, cursor:newComment.trim()?'pointer':'not-allowed', fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}>
                {postingComment?'Posting…':'Post'}
              </button>
            </div>
            <div style={{ fontSize:11, color:'var(--text-disabled)', marginTop:6 }}>Cmd+Enter to post</div>
          </div>
        </div>

        {/* RIGHT — details panel */}
        <div>
          <div style={{ background:'#fff', border:'1px solid var(--border-subtle)', borderRadius:20, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.05)', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>Task Details</div>

            {[
              { label:'Status', field:'status', type:'select', options:PIPELINE.map(s=>({value:s,label:PIPELINE_LABELS[s]})) },
              { label:'Priority', field:'priority', type:'select', options:[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'},{value:'urgent',label:'Urgent'}] },
              { label:'Due Date', field:'due_date', type:'date' },
              { label:'Drive Link', field:'drive_file_url', type:'text', placeholder:'Paste Drive URL' },
            ].map(({ label, field, type, options, placeholder }:any) => (
              <div key={field} style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>{label}</label>
                {type==='select' ? (
                  <select style={{...inp, padding:'8px 10px'}} value={(edit as any)[field]} onChange={e=>setEdit({...edit,[field]:e.target.value})}>
                    {options?.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input style={inp} type={type} placeholder={placeholder} value={(edit as any)[field]} onChange={e=>setEdit({...edit,[field]:e.target.value})} />
                )}
              </div>
            ))}

            {edit.drive_file_url && (
              <a href={edit.drive_file_url} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:4, marginBottom:14, fontSize:12, color:'#3B82F6', fontWeight:500, textDecoration:'none' }}>
                <ExternalLink size={11} /> Open in Drive
              </a>
            )}

            <button onClick={saveTask} disabled={saving}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px', borderRadius:100, background:saved?'#10B981':'var(--accent)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:saving?'not-allowed':'pointer', fontFamily:'var(--font-body)', boxShadow:'0 4px 12px rgba(124,58,237,0.25)', transition:'background 0.3s' }}>
              <Save size={14} />{saved?'Saved ✓':saving?'Saving…':'Save Changes'}
            </button>
          </div>

          {/* Assignee */}
          {(task.users as any)?.name && (
            <div style={{ background:'#fff', border:'1px solid var(--border-subtle)', borderRadius:14, padding:'14px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'var(--accent)', flexShrink:0 }}>
                {(task.users as any).name[0]}
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500, marginBottom:2 }}>Assigned to</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{(task.users as any).name}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
