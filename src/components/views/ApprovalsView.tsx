'use client'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, Clock, Image } from 'lucide-react'

type ApprovalStep = {
  id: string; step_order: number; step_name: string
  assigned_role: string | null; status: string
  actioned_at: string | null; note: string | null
}
type Approval = {
  id: string; title: string; brand_id: string | null
  current_stage: string; creative_approved: boolean
  am_approved: boolean; client_approved: boolean
  drive_file_url: string | null; notes: string | null; created_at: string
  brands?: { name: string; color: string }
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending:   { color: '#86868B', bg: '#F5F5F7' },
  in_review: { color: '#F59E0B', bg: '#FFFBEB' },
  approved:  { color: '#10B981', bg: '#ECFDF5' },
  rejected:  { color: '#EF4444', bg: '#FEE2E2' },
}

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)

export default function ApprovalsView({ brandId }: { brandId: string }) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Approval | null>(null)
  const [steps, setSteps] = useState<ApprovalStep[]>([])
  const [actionNote, setActionNote] = useState('')
  const [actioning, setActioning] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/approvals' + (brandId ? `?brand_id=${brandId}` : ''))
    const data = await res.json()
    setApprovals(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [brandId])

  useEffect(() => { load() }, [load])

  const openApproval = async (approval: Approval) => {
    setSelected(approval)
    setActionNote('')
    const res = await fetch(`/api/approvals/${approval.id}/steps`)
    const data = await res.json()
    setSteps(Array.isArray(data) ? data : [])
  }

  const doAction = async (action: 'approve' | 'reject') => {
    if (!selected || actioning) return
    setActioning(true)
    await fetch('/api/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_id: selected.id, action, note: actionNote })
    })
    setActionNote('')
    setActioning(false)
    // Reload steps + approvals
    const res = await fetch(`/api/approvals/${selected.id}/steps`)
    const data = await res.json()
    setSteps(Array.isArray(data) ? data : [])
    await load()
    // Update selected
    const fresh = await fetch('/api/approvals')
    const all = await fresh.json()
    const updated = (Array.isArray(all) ? all : []).find((a: Approval) => a.id === selected.id)
    if (updated) setSelected(updated)
  }

  const getOverallStatus = (a: Approval) => {
    if (a.client_approved && a.am_approved && a.creative_approved) return { label: 'Fully Approved', color: '#10B981', bg: '#ECFDF5' }
    if (a.creative_approved) return { label: 'AM Review', color: '#3B82F6', bg: '#EFF6FF' }
    return { label: 'Creative Review', color: '#F59E0B', bg: '#FFFBEB' }
  }

  const filtered = approvals.filter(a => {
    if (filter === 'pending')  return !(a.creative_approved && a.am_approved && a.client_approved)
    if (filter === 'approved') return a.creative_approved && a.am_approved && a.client_approved
    return true
  })

  // ── DETAIL VIEW ──────────────────────────────────────────────────
  if (selected) {
    const fullyApproved = selected.creative_approved && selected.am_approved && selected.client_approved
    const activeStep = steps.find(s => s.status === 'in_review')
    const brand = selected.brands as any

    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <button onClick={() => { setSelected(null); load() }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          <ArrowLeft size={14} /> Back to Approvals
        </button>

        {/* Header */}
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
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
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: '#F5F5F7', borderRadius: 10, padding: '10px 14px', marginBottom: 16, lineHeight: 1.6 }}>
              {selected.notes}
            </div>
          )}

          {/* Creative file — image preview or drive link */}
          {selected.drive_file_url && (
            <div style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Submitted Creative</div>
              {isImage(selected.drive_file_url) ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: 10, background: '#F5F5F7' }}>
                  <img src={selected.drive_file_url} alt="Creative" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#F5F3FF', borderRadius: 12, border: '1px solid #C4B5FD', marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Image size={18} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Creative File</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.drive_file_url}</div>
                  </div>
                  <a href={selected.drive_file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: 'var(--accent)', color: '#fff', borderRadius: 100, fontSize: 12, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                    <ExternalLink size={12} /> Open File
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Approval chain */}
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Approval Chain</div>
          </div>

          {steps.map((step, i) => {
            const st = STATUS_STYLE[step.status] || STATUS_STYLE.pending
            const isActive = step.status === 'in_review'
            const isRejected = step.status === 'rejected'

            return (
              <div key={step.id} style={{ padding: '20px 24px', borderBottom: i < steps.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: isActive ? '#FAFAF9' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: st.bg, border: `2px solid ${st.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: st.color, flexShrink: 0 }}>
                    {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✗' : step.step_order}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{step.step_name}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 100, background: st.bg, color: st.color }}>
                        {step.status.replace('_', ' ')}
                      </span>
                    </div>
                    {step.assigned_role && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: step.note ? 8 : 0 }}>
                        {step.assigned_role.replace('_', ' ')}
                      </div>
                    )}
                    {step.note && (
                      <div style={{ fontSize: 13, color: isRejected ? '#EF4444' : 'var(--text-secondary)', background: isRejected ? '#FEE2E2' : '#F5F5F7', borderRadius: 10, padding: '10px 14px', marginTop: 8, lineHeight: 1.6 }}>
                        💬 {step.note}
                      </div>
                    )}
                    {step.actioned_at && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        {new Date(step.actioned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* Action buttons — only for active step */}
                    {isActive && !fullyApproved && (
                      <div style={{ marginTop: 16 }}>
                        <textarea value={actionNote} onChange={e => setActionNote(e.target.value)}
                          placeholder="Add a note (required if rejecting)…"
                          style={{ width: '100%', background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical', minHeight: 80, marginBottom: 12, lineHeight: 1.6 }}
                        />
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => doAction('approve')} disabled={actioning}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 100, background: '#ECFDF5', color: '#10B981', border: '1.5px solid #A7F3D0', fontSize: 13, fontWeight: 700, cursor: actioning ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}>
                            <CheckCircle size={15} /> {actioning ? 'Approving…' : step.step_order === steps.length ? '✅ Final Approve' : 'Approve & Pass On →'}
                          </button>
                          <button onClick={() => doAction('reject')} disabled={actioning || !actionNote.trim()}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 100, background: '#FEE2E2', color: '#EF4444', border: '1.5px solid #FECACA', fontSize: 13, fontWeight: 700, cursor: (!actioning && actionNote.trim()) ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', opacity: actionNote.trim() ? 1 : 0.5 }}>
                            <XCircle size={15} /> Send Back
                          </button>
                        </div>
                        {!actionNote.trim() && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Add a note before sending back</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {steps.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading steps…</div>}
        </div>
      </div>
    )
  }

  // ── LIST VIEW ────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Approvals & Handoff</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Review submitted work — Creative Head → AM → Client</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F5F7', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {[
          { key: 'pending',  label: `⏳ Pending (${approvals.filter(a => !(a.creative_approved && a.am_approved && a.client_approved)).length})`  },
          { key: 'approved', label: `✅ Approved (${approvals.filter(a => a.creative_approved && a.am_approved && a.client_approved).length})` },
          { key: 'all',      label: `All (${approvals.length})`                                                                                  },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            style={{ padding: '7px 16px', borderRadius: 9, border: 'none', background: filter === f.key ? '#fff' : 'transparent', color: filter === f.key ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: filter === f.key ? 600 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: filter === f.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '1.5px dashed var(--border-default)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {filter === 'pending' ? 'All caught up! No pending reviews.' : 'No approvals yet.'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Approvals appear when a team member submits their task for review.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(approval => {
            const st = getOverallStatus(approval)
            const brand = approval.brands as any
            const fullyApproved = approval.creative_approved && approval.am_approved && approval.client_approved

            return (
              <div key={approval.id} onClick={() => openApproval(approval)}
                style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; el.style.transform = 'translateY(-1px)'; el.style.borderColor = 'var(--border-default)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; el.style.transform = 'none'; el.style.borderColor = 'var(--border-subtle)' }}
              >
                {/* Status circle */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                  {fullyApproved ? '✅' : approval.creative_approved ? '2️⃣' : '👀'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {brand?.name && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{brand.name}</div>}
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{approval.title}</div>

                  {/* Step indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {[
                      { label: 'Creative Head', done: approval.creative_approved, active: !approval.creative_approved },
                      { label: 'Account Manager', done: approval.am_approved, active: approval.creative_approved && !approval.am_approved },
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, background: step.done ? '#ECFDF5' : step.active ? '#FFFBEB' : '#F5F5F7', border: `1px solid ${step.done ? '#A7F3D0' : step.active ? '#FDE68A' : '#E5E5EA'}` }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: step.done ? '#10B981' : step.active ? '#F59E0B' : '#D1D1D6' }} />
                          <span style={{ fontSize: 10, fontWeight: 600, color: step.done ? '#10B981' : step.active ? '#D97706' : '#86868B' }}>{step.label}</span>
                        </div>
                        {i < 1 && <span style={{ fontSize: 10, color: '#D1D1D6' }}>→</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {approval.drive_file_url && (
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isImage(approval.drive_file_url)
                        ? <img src={approval.drive_file_url} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} alt="" />
                        : <ExternalLink size={14} color="var(--accent)" />
                      }
                    </div>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
