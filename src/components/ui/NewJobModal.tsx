'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

type Brand = { id: string; name: string; color: string }
type User  = { id: string; name: string; agency_role: string | null; avatar_url: string | null }
type Deliverable = { id: string; title: string; assigned_to: string; due_date: string }

const inp: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#1D1D1F',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%', transition: 'all 0.15s',
}

function uid() { return Math.random().toString(36).slice(2, 9) }

type Props = { open: boolean; onClose: () => void; onCreated: () => void }

export default function NewJobModal({ open, onClose, onCreated }: Props) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [users, setUsers]   = useState<User[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({ title: '', brand_id: '', description: '', drive_folder_url: '', brief_type: 'campaign' })
  const [deliverables, setDeliverables] = useState<Deliverable[]>([
    { id: uid(), title: 'Design / Creatives', assigned_to: '', due_date: '' },
    { id: uid(), title: 'Copy / Captions',    assigned_to: '', due_date: '' },
  ])

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(d => { if (Array.isArray(d)) setBrands(d) })
    fetch('/api/team').then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d) })
  }, [])

  const update = (id: string, field: keyof Deliverable, val: string) =>
    setDeliverables(deliverables.map(d => d.id === id ? { ...d, [field]: val } : d))

  const handleCreate = async () => {
    if (!form.title.trim()) return
    const valid = deliverables.filter(d => d.title.trim())
    if (!valid.length) return
    setCreating(true); setError(null)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, deliverables: valid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onCreated(); onClose()
      setStep(1); setError(null)
      setForm({ title: '', brand_id: '', description: '', drive_folder_url: '', brief_type: 'campaign' })
      setDeliverables([
        { id: uid(), title: 'Design / Creatives', assigned_to: '', due_date: '' },
        { id: uid(), title: 'Copy / Captions',    assigned_to: '', due_date: '' },
      ])
    } catch (err: any) { setError(err.message) }
    setCreating(false)
  }

  const selectedBrand = brands.find(b => b.id === form.brand_id)

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 24, width: 600, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>New <span style={{ color: 'var(--accent)' }}>Job</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Step {step} of 2 — {step === 1 ? 'Job details' : 'Assign work'}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {[1,2].map(s => (
                <div key={s} style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: step >= s ? 'var(--accent)' : '#F5F5F7', color: step >= s ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>{s}</div>
              ))}
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: '#F5F5F7', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} color="var(--text-muted)" />
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 26px 26px' }}>
          {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#EF4444', fontWeight: 500 }}>⚠️ {error}</div>}

          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Job Title *</label>
                <input style={{ ...inp, fontSize: 15, fontWeight: 500 }} placeholder="e.g. Nike India — June Social Campaign"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E5EA'; (e.target as HTMLInputElement).style.background = '#F5F5F7' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Client Brand</label>
                  <select style={inp} value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">Select brand…</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Job Type</label>
                  <select style={inp} value={form.brief_type} onChange={e => setForm({ ...form, brief_type: e.target.value })}>
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
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brief — What's needed</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }}
                  placeholder="Objective, target audience, key message, deliverables, tone, references, deadline…"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Google Drive Folder</label>
                <input style={inp} placeholder="Paste Drive folder link — team uploads work here"
                  value={form.drive_folder_url} onChange={e => setForm({ ...form, drive_folder_url: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep(2)} disabled={!form.title.trim()}
                  style={{ padding: '11px 28px', borderRadius: 100, background: form.title.trim() ? 'var(--accent)' : '#E5E5EA', color: form.title.trim() ? '#fff' : 'var(--text-muted)', border: 'none', fontSize: 14, fontWeight: 600, cursor: form.title.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', boxShadow: form.title.trim() ? '0 4px 14px rgba(124,58,237,0.3)' : 'none' }}>
                  Next: Assign Work →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              {/* Job summary */}
              <div style={{ background: '#F5F3FF', borderRadius: 12, padding: '12px 16px', marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{form.title}</div>
                {selectedBrand && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selectedBrand.name} · {form.brief_type}</div>}
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Who does what — and by when?</div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 140px 34px', gap: 8, padding: '0 2px', marginBottom: 8 }}>
                {['Deliverable', 'Assigned to', 'Due date', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                {deliverables.map(d => (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 140px 34px', gap: 8, alignItems: 'center' }}>
                    <input style={{ ...inp, padding: '8px 12px' }} placeholder="e.g. Instagram Reels Design"
                      value={d.title} onChange={e => update(d.id, 'title', e.target.value)}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = '#fff' }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E5EA'; (e.target as HTMLInputElement).style.background = '#F5F5F7' }}
                    />
                    <select style={{ ...inp, padding: '8px 10px', fontSize: 12 }} value={d.assigned_to} onChange={e => update(d.id, 'assigned_to', e.target.value)}>
                      <option value="">Assign to…</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}{u.agency_role ? ` (${u.agency_role.replace('_',' ')})` : ''}
                        </option>
                      ))}
                    </select>
                    <input style={{ ...inp, padding: '8px 10px', fontSize: 12 }} type="date"
                      value={d.due_date} onChange={e => update(d.id, 'due_date', e.target.value)}
                    />
                    <button onClick={() => setDeliverables(deliverables.filter(x => x.id !== d.id))}
                      style={{ width: 32, height: 32, borderRadius: 8, background: '#FEE2E2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                  </div>
                ))}
              </div>

              {users.length === 0 && (
                <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, marginBottom: 12, fontSize: 12, color: '#D97706' }}>
                  ⚠️ No team members yet. Go to <strong>Admin Panel → Copy Invite Link</strong> and share it with your team. They sign in with Google and appear here automatically.
                </div>
              )}

              <button onClick={() => setDeliverables([...deliverables, { id: uid(), title: '', assigned_to: '', due_date: '' }])}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 100, background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1.5px dashed var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: 24 }}>
                <Plus size={13} /> Add deliverable
              </button>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <button onClick={() => setStep(1)}
                  style={{ padding: '10px 20px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  ← Back
                </button>
                <button onClick={handleCreate} disabled={creating || !deliverables.some(d => d.title.trim())}
                  style={{ padding: '11px 28px', borderRadius: 100, background: creating ? '#C4B5FD' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}>
                  {creating ? 'Creating…' : '🚀 Create Job & Notify Team'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
