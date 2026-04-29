'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, ChevronRight, CheckCircle, XCircle, Clock, ExternalLink, ArrowLeft, MessageSquare } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
type ApprovalStep = {
  id: string
  step_order: number
  step_name: string
  assigned_role: string | null
  status: 'pending' | 'in_review' | 'approved' | 'rejected'
  actioned_at: string | null
  note: string | null
}

type Approval = {
  id: string
  title: string
  brand_id: string | null
  current_stage: string
  creative_approved: boolean
  am_approved: boolean
  client_approved: boolean
  drive_file_url: string | null
  notes: string | null
  created_at: string
  brands?: { name: string; color: string }
  approval_steps?: ApprovalStep[]
}

type Brand = { id: string; name: string; color: string }

// ── Constants ──────────────────────────────────────────────────────────
const DEFAULT_CHAIN = [
  { step_order: 1, step_name: 'Creative Review',      assigned_role: 'creative_head'  },
  { step_order: 2, step_name: 'Account Manager Check', assigned_role: 'am'            },
  { step_order: 3, step_name: 'Client Sign-off',       assigned_role: 'am'            },
]

const STEP_STATUS_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  pending:   { color: '#86868B', bg: '#F5F5F7', icon: '⏳' },
  in_review: { color: '#F59E0B', bg: '#FFFBEB', icon: '👀' },
  approved:  { color: '#10B981', bg: '#ECFDF5', icon: '✓'  },
  rejected:  { color: '#EF4444', bg: '#FEE2E2', icon: '✗'  },
}

const inputStyle: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA',
  borderRadius: 10, padding: '9px 12px', fontSize: 13,
  color: '#1D1D1F', fontFamily: 'var(--font-body)',
  outline: 'none', width: '100%', transition: 'all 0.15s',
}

// ── Main ───────────────────────────────────────────────────────────────
export default function ApprovalsView({ brandId }: { brandId: string }) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Approval | null>(null)
  const [steps, setSteps] = useState<ApprovalStep[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [actioning, setActioning] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  // Create form
  const [form, setForm] = useState({ title: '', brand_id: '', notes: '', drive_file_url: '' })
  const [creating, setCreating] = useState(false)

  const loadApprovals = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('approvals').select('*, brands(name,color)').order('created_at', { ascending: false })
    if (brandId) q = q.eq('brand_id', brandId)
    const { data } = await q
    setApprovals((data as Approval[]) || [])
    setLoading(false)
  }, [brandId])

  useEffect(() => {
    loadApprovals()
    supabase.from('brands').select('*').then(({ data }) => { if (data) setBrands(data) })
  }, [loadApprovals])

  const openApproval = async (approval: Approval) => {
    setSelected(approval)
    setActionNote('')
    const { data } = await supabase
      .from('approval_steps')
      .select('*')
      .eq('approval_id', approval.id)
      .order('step_order')
    setSteps((data as ApprovalStep[]) || [])
  }

  const createApproval = async () => {
    if (!form.title.trim()) return
    setCreating(true)

    const { data: approval } = await supabase.from('approvals').insert({
      title: form.title,
      brand_id: form.brand_id || null,
      notes: form.notes || null,
      drive_file_url: form.drive_file_url || null,
      current_stage: 'creative',
      creative_approved: false,
      am_approved: false,
      client_approved: false,
    }).select('*, brands(name,color)').single()

    if (approval) {
      // Create the 3-step chain
      await supabase.from('approval_steps').insert(
        DEFAULT_CHAIN.map(step => ({
          approval_id: approval.id,
          ...step,
          status: step.step_order === 1 ? 'in_review' : 'pending',
        }))
      )
      setForm({ title: '', brand_id: '', notes: '', drive_file_url: '' })
      setCreating(false)
      setShowCreate(false)
      await loadApprovals()
      await openApproval(approval as Approval)
    } else {
      setCreating(false)
    }
  }

  const actionStep = async (step: ApprovalStep, action: 'approved' | 'rejected') => {
    setActioning(step.id)

    // Update this step
    await supabase.from('approval_steps').update({
      status: action,
      actioned_at: new Date().toISOString(),
      note: actionNote || null,
    }).eq('id', step.id)

    if (action === 'approved') {
      // Activate next step
      const nextStep = steps.find(s => s.step_order === step.step_order + 1)
      if (nextStep) {
        await supabase.from('approval_steps').update({ status: 'in_review' }).eq('id', nextStep.id)
      }
      // Update parent approval flags
      const updates: Record<string, unknown> = {}
      if (step.step_order === 1) { updates.creative_approved = true; updates.current_stage = 'account_manager' }
      if (step.step_order === 2) { updates.am_approved = true; updates.current_stage = 'client' }
      if (step.step_order === 3) { updates.client_approved = true }
      if (Object.keys(updates).length > 0) {
        await supabase.from('approvals').update(updates).eq('id', selected!.id)
      }
    } else {
      // Rejected — reset all subsequent steps to pending
      const laterSteps = steps.filter(s => s.step_order > step.step_order)
      for (const s of laterSteps) {
        await supabase.from('approval_steps').update({ status: 'pending' }).eq('id', s.id)
      }
    }

    setActionNote('')
    setActioning(null)

    // Reload
    const { data } = await supabase.from('approval_steps').select('*').eq('approval_id', selected!.id).order('step_order')
    setSteps((data as ApprovalStep[]) || [])
    await loadApprovals()
  }

  // Overall approval status
  const getOverallStatus = (a: Approval) => {
    if (a.client_approved) return { label: 'Fully Approved', color: '#10B981', bg: '#ECFDF5' }
    if (a.am_approved)     return { label: 'Awaiting Client', color: '#F59E0B', bg: '#FFFBEB' }
    if (a.creative_approved) return { label: 'AM Review', color: '#3B82F6', bg: '#EFF6FF' }
    return { label: 'Creative Review', color: '#7C3AED', bg: '#EDE9FE' }
  }

  const filtered = approvals.filter(a => {
    if (filter === 'pending')  return !a.client_approved
    if (filter === 'approved') return a.client_approved
    return true
  })

  const pending = approvals.filter(a => !a.client_approved).length

  // ── DETAIL VIEW ──────────────────────────────────────────────────────
  if (selected) {
    const brand = selected.brands as any
    const fullyApproved = selected.client_approved

    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button onClick={() => { setSelected(null); loadApprovals() }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          <ArrowLeft size={14} /> Back to Approvals
        </button>

        {/* Header card */}
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              {brand?.name && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{brand.name}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.title}</div>
            </div>
            {fullyApproved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#ECFDF5', borderRadius: 100, border: '1px solid #A7F3D0', flexShrink: 0 }}>
                <CheckCircle size={14} color="#10B981" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>Fully Approved</span>
              </div>
            )}
          </div>

          {selected.notes && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: '#F5F5F7', borderRadius: 10, padding: '10px 14px', marginBottom: 12, lineHeight: 1.6 }}>{selected.notes}</div>
          )}

          {selected.drive_file_url && (
            <a href={selected.drive_file_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3B82F6', fontWeight: 500, textDecoration: 'none' }}>
              <ExternalLink size={12} /> View in Google Drive
            </a>
          )}
        </div>

        {/* Approval chain */}
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Approval Chain</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>3 steps must be completed in order</div>
          </div>

          {steps.map((step, i) => {
            const st = STEP_STATUS_STYLE[step.status]
            const isActive = step.status === 'in_review'
            const isDone   = step.status === 'approved'
            const isRejected = step.status === 'rejected'

            return (
              <div key={step.id} style={{ padding: '20px 24px', borderBottom: i < steps.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: isActive ? '#FAFAF9' : '#fff', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Step number / status icon */}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: st.bg, border: `2px solid ${st.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isDone || isRejected ? 14 : 13, fontWeight: 700, color: st.color, flexShrink: 0 }}>
                    {isDone ? '✓' : isRejected ? '✗' : step.step_order}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{step.step_name}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 100, background: st.bg, color: st.color }}>
                        {st.icon} {step.status.replace('_', ' ')}
                      </span>
                    </div>

                    {step.assigned_role && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: step.note ? 8 : 0 }}>
                        Assigned to: <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{step.assigned_role.replace('_', ' ')}</span>
                      </div>
                    )}

                    {step.note && (
                      <div style={{ fontSize: 12, color: isRejected ? '#EF4444' : 'var(--text-secondary)', background: isRejected ? '#FEE2E2' : '#F5F5F7', borderRadius: 8, padding: '8px 12px', marginTop: 8, display: 'flex', gap: 6 }}>
                        <MessageSquare size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                        {step.note}
                      </div>
                    )}

                    {step.actioned_at && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        {isDone ? 'Approved' : 'Actioned'} {new Date(step.actioned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}

                    {/* Action buttons — only show for active step */}
                    {isActive && !fullyApproved && (
                      <div style={{ marginTop: 14 }}>
                        <textarea
                          placeholder="Add a note (optional — required if rejecting)"
                          value={actionNote}
                          onChange={e => setActionNote(e.target.value)}
                          style={{ ...inputStyle, resize: 'vertical', minHeight: 72, marginBottom: 10 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => actionStep(step, 'approved')}
                            disabled={!!actioning}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 100, background: '#ECFDF5', color: '#10B981', border: '1.5px solid #A7F3D0', fontSize: 13, fontWeight: 700, cursor: actioning ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#D1FAE5' }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#ECFDF5' }}
                          >
                            <CheckCircle size={14} />
                            {actioning === step.id ? 'Approving…' : step.step_order === 3 ? 'Client Approved ✓' : 'Approve & Pass On'}
                          </button>
                          <button
                            onClick={() => actionStep(step, 'rejected')}
                            disabled={!!actioning}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 100, background: '#FEE2E2', color: '#EF4444', border: '1.5px solid #FECACA', fontSize: 13, fontWeight: 700, cursor: actioning ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#FEE2E2' }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#FEE2E2' }}
                          >
                            <XCircle size={14} />
                            Send Back
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {steps.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading approval chain…</div>
          )}
        </div>
      </div>
    )
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Approvals & Handoff</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Creative Head → Account Manager → Client</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus size={15} strokeWidth={2.5} /> New Approval
        </button>
      </div>

      {/* Stats + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'all',      label: 'All',      count: approvals.length                                 },
          { key: 'pending',  label: 'Pending',  count: approvals.filter(a => !a.client_approved).length },
          { key: 'approved', label: 'Approved', count: approvals.filter(a =>  a.client_approved).length },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 100, border: `1.5px solid ${filter === f.key ? 'var(--accent)' : 'var(--border-default)'}`, background: filter === f.key ? 'var(--accent-subtle)' : '#fff', color: filter === f.key ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 13, fontWeight: filter === f.key ? 600 : 400, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
            {f.label}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 100, background: filter === f.key ? 'var(--accent)' : '#F5F5F7', color: filter === f.key ? '#fff' : 'var(--text-muted)' }}>{f.count}</span>
          </button>
        ))}

        {pending > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#D97706', fontWeight: 600 }}>
            <Clock size={14} /> {pending} item{pending > 1 ? 's' : ''} awaiting action
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading approvals…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '1.5px dashed var(--border-default)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {filter === 'approved' ? 'No approved items yet' : 'All caught up!'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No approvals in this view.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(approval => {
            const st = getOverallStatus(approval)
            const brand = approval.brands as any

            return (
              <div key={approval.id} onClick={() => openApproval(approval)}
                style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; el.style.transform = 'translateY(-1px)'; el.style.borderColor = 'var(--border-default)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; el.style.transform = 'none'; el.style.borderColor = 'var(--border-subtle)' }}
              >
                {/* Status circle */}
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                  {approval.client_approved ? '✓' : approval.am_approved ? '2' : approval.creative_approved ? '1' : '⏳'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {brand?.name && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{brand.name}</div>}
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{approval.title}</div>

                  {/* Step indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {DEFAULT_CHAIN.map((step, i) => {
                      const done = (i === 0 && approval.creative_approved) || (i === 1 && approval.am_approved) || (i === 2 && approval.client_approved)
                      const active = (i === 0 && !approval.creative_approved) || (i === 1 && approval.creative_approved && !approval.am_approved) || (i === 2 && approval.am_approved && !approval.client_approved)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, background: done ? '#ECFDF5' : active ? '#FFFBEB' : '#F5F5F7', border: `1px solid ${done ? '#A7F3D0' : active ? '#FDE68A' : '#E5E5EA'}` }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: done ? '#10B981' : active ? '#F59E0B' : '#D1D1D6' }} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: done ? '#10B981' : active ? '#D97706' : '#86868B' }}>{step.step_name}</span>
                          </div>
                          {i < DEFAULT_CHAIN.length - 1 && <ChevronRight size={10} color="#D1D1D6" />}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: st.bg, color: st.color }}>{st.label}</span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: 480, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>New <span style={{ color: 'var(--accent)' }}>Approval</span></div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>A 3-step chain (Creative Head → AM → Client) will be created automatically.</div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>What needs approval? *</label>
                <input style={inputStyle} placeholder="e.g. Nike June Instagram Reels Pack" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand</label>
                <select style={inputStyle} value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                  <option value="">No Brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Google Drive Link</label>
                <input style={inputStyle} placeholder="Link to the work being approved" value={form.drive_file_url} onChange={e => setForm({ ...form, drive_file_url: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} placeholder="Context for the reviewer…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '9px 18px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
              <button onClick={createApproval} disabled={creating || !form.title.trim()} style={{ padding: '9px 24px', borderRadius: 100, background: creating ? '#C4B5FD' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                {creating ? 'Creating…' : 'Create Approval Chain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
