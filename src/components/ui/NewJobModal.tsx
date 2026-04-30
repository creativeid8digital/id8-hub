'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Plus, Trash2 } from 'lucide-react'

type Brand = { id: string; name: string; color: string }
type User  = { id: string; name: string; agency_role: string | null }

type Deliverable = {
  id: string
  title: string
  assigned_to: string
  due_date: string
}

const inputStyle: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#1D1D1F',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%', transition: 'all 0.15s',
}

const PRIORITY_DEFAULTS = [
  { title: 'Design / Creatives', role: 'creative_team'   },
  { title: 'Copy / Captions',    role: 'content_writer'  },
  { title: 'Publish & Schedule', role: 'publishing_team' },
]

function uid() { return Math.random().toString(36).slice(2, 9) }

type Props = { open: boolean; onClose: () => void; onCreated: () => void }

export default function NewJobModal({ open, onClose, onCreated }: Props) {
  const [brands, setBrands]   = useState<Brand[]>([])
  const [users, setUsers]     = useState<User[]>([])
  const [creating, setCreating] = useState(false)
  const [step, setStep]       = useState<1 | 2>(1)

  const [form, setForm] = useState({
    title: '', brand_id: '', description: '',
    drive_folder_url: '', brief_type: 'campaign',
  })

  const [deliverables, setDeliverables] = useState<Deliverable[]>([
    { id: uid(), title: 'Design / Creatives', assigned_to: '', due_date: '' },
    { id: uid(), title: 'Copy / Captions',    assigned_to: '', due_date: '' },
  ])

  useEffect(() => {
    supabase.from('brands').select('*').then(({ data }) => { if (data) setBrands(data) })
    supabase.from('users').select('id, name, agency_role').not('name', 'is', null)
      .then(({ data }) => { if (data) setUsers(data as User[]) })
  }, [])

  const addDeliverable = () => {
    setDeliverables([...deliverables, { id: uid(), title: '', assigned_to: '', due_date: '' }])
  }

  const updateDeliverable = (id: string, field: keyof Deliverable, value: string) => {
    setDeliverables(deliverables.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const removeDeliverable = (id: string) => {
    setDeliverables(deliverables.filter(d => d.id !== id))
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    const validDeliverables = deliverables.filter(d => d.title.trim())
    if (validDeliverables.length === 0) return

    setCreating(true)

    // 1. Create the brief
    const { data: brief } = await supabase.from('briefs').insert({
      title: form.title,
      brand_id: form.brand_id || null,
      brief_type: form.brief_type,
      status: 'in_progress',
      team: 'creative_team',
      description: form.description || null,
      drive_file_url: form.drive_folder_url || null,
    }).select().single()

    if (!brief) { setCreating(false); return }

    // 2. Create one task per deliverable
    const tasks = validDeliverables.map(d => ({
      title: d.title,
      brief_id: brief.id,
      brand_id: form.brand_id || null,
      assigned_to: d.assigned_to || null,
      due_date: d.due_date || null,
      status: 'assigned',
      priority: 'medium',
      description: form.description || null,
    }))

    const { data: createdTasks } = await supabase.from('tasks').insert(tasks).select()

    // 3. Send notifications to each assigned person
    if (createdTasks) {
      for (const task of createdTasks as any[]) {
        if (task.assigned_to) {
          await supabase.from('notifications').insert({
            user_id: task.assigned_to,
            type: 'task_assigned',
            title: `New task assigned: ${task.title}`,
            body: `${form.title}${task.due_date ? ` — due ${task.due_date}` : ''}`,
            link_type: 'task',
            link_id: task.id,
          })
        }
      }
    }

    setCreating(false)
    onCreated()
    onClose()
    // Reset
    setStep(1)
    setForm({ title: '', brand_id: '', description: '', drive_folder_url: '', brief_type: 'campaign' })
    setDeliverables([
      { id: uid(), title: 'Design / Creatives', assigned_to: '', due_date: '' },
      { id: uid(), title: 'Copy / Captions',    assigned_to: '', due_date: '' },
    ])
  }

  const usersByRole = (role: string) => users.filter(u => u.agency_role === role)
  const allUsers = users

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 24, width: 600, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', position: 'relative' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              New <span style={{ color: 'var(--accent)' }}>Job</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Step {step} of 2 — {step === 1 ? 'Job details' : 'Assign deliverables'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2].map(s => (
                <div key={s} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: step >= s ? 'var(--accent)' : '#F5F5F7', color: step >= s ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>{s}</div>
              ))}
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#F5F5F7', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="var(--text-muted)" />
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>

          {/* ── STEP 1 — Job details ── */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Job Title *</label>
                <input style={{ ...inputStyle, fontSize: 15, fontWeight: 500 }}
                  placeholder="e.g. Nike India — June Social Media Campaign"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E5EA'; (e.target as HTMLInputElement).style.background = '#F5F5F7' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Client Brand</label>
                  <select style={inputStyle} value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">Select brand…</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Job Type</label>
                  <select style={inputStyle} value={form.brief_type} onChange={e => setForm({ ...form, brief_type: e.target.value })}>
                    <option value="campaign">Campaign</option>
                    <option value="social_media">Social Media</option>
                    <option value="performance_ads">Performance Ads</option>
                    <option value="brand">Brand</option>
                    <option value="content">Content</option>
                    <option value="tech_dev">Tech / Dev</option>
                    <option value="event">Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brief / What's needed</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }}
                  placeholder="Describe the campaign objective, target audience, key message, deliverables expected, tone of voice, references..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Google Drive Folder</label>
                <input style={inputStyle}
                  placeholder="Paste Drive folder link — team will upload work here"
                  value={form.drive_folder_url}
                  onChange={e => setForm({ ...form, drive_folder_url: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button
                  onClick={() => setStep(2)}
                  disabled={!form.title.trim()}
                  style={{ padding: '11px 28px', borderRadius: 100, background: form.title.trim() ? 'var(--accent)' : '#E5E5EA', color: form.title.trim() ? '#fff' : 'var(--text-muted)', border: 'none', fontSize: 14, fontWeight: 600, cursor: form.title.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', boxShadow: form.title.trim() ? '0 4px 14px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.2s' }}>
                  Next: Assign Work →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Deliverables ── */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, background: '#F5F3FF', borderRadius: 12, padding: '12px 16px', borderLeft: '3px solid var(--accent)' }}>
                <strong style={{ color: 'var(--accent)' }}>{form.title}</strong>
                {form.brand_id && brands.find(b => b.id === form.brand_id) && (
                  <span style={{ color: 'var(--text-muted)' }}> · {brands.find(b => b.id === form.brand_id)?.name}</span>
                )}
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                Who does what — and by when?
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 130px 36px', gap: 8, marginBottom: 8, padding: '0 4px' }}>
                {['Deliverable', 'Assigned to', 'Due date', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                ))}
              </div>

              {/* Deliverable rows */}
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {deliverables.map((d, i) => (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 130px 36px', gap: 8, alignItems: 'center' }}>
                    <input
                      style={{ ...inputStyle, padding: '8px 12px' }}
                      placeholder={`e.g. Design Reels, Copy, Publish...`}
                      value={d.title}
                      onChange={e => updateDeliverable(d.id, 'title', e.target.value)}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = '#fff' }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E5EA'; (e.target as HTMLInputElement).style.background = '#F5F5F7' }}
                    />
                    <select
                      style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                      value={d.assigned_to}
                      onChange={e => updateDeliverable(d.id, 'assigned_to', e.target.value)}>
                      <option value="">Assign to…</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}{u.agency_role ? ` (${u.agency_role.replace('_', ' ')})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                      type="date"
                      value={d.due_date}
                      onChange={e => updateDeliverable(d.id, 'due_date', e.target.value)}
                    />
                    <button
                      onClick={() => removeDeliverable(d.id)}
                      style={{ width: 34, height: 34, borderRadius: 8, background: '#FEE2E2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add deliverable */}
              <button onClick={addDeliverable}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 100, background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1.5px dashed var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: 24 }}>
                <Plus size={13} strokeWidth={2.5} /> Add another deliverable
              </button>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <button onClick={() => setStep(1)}
                  style={{ padding: '10px 20px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  ← Back
                </button>

                <button onClick={handleCreate} disabled={creating || !deliverables.some(d => d.title.trim())}
                  style={{ padding: '11px 28px', borderRadius: 100, background: creating ? '#C4B5FD' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)', transition: 'all 0.2s' }}>
                  {creating ? 'Creating job…' : '🚀 Create Job & Notify Team'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
