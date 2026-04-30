'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, ChevronRight, X, ExternalLink, FileText, Save, ArrowLeft } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────
type Brief = {
  id: string
  title: string
  brand_id: string
  team: string
  status: 'not_started' | 'in_progress' | 'review' | 'approved'
  due_date: string | null
  drive_file_url: string | null
  description: string | null
  brief_type: string | null
  month_year: string | null
  brands?: { name: string; color: string }
}

type BriefSection = {
  section_key: string
  content: string
}

// ── Section definitions ───────────────────────────────────────────────
const SECTIONS = [
  { key: 'objective',       label: 'Campaign Objective',    placeholder: 'What is this campaign trying to achieve? What does success look like?',         icon: '🎯', required: true  },
  { key: 'target_audience', label: 'Target Audience',       placeholder: 'Who are we talking to? Age, interests, behaviour, pain points.',                 icon: '👥', required: true  },
  { key: 'key_message',     label: 'Key Message',           placeholder: 'One sentence: what must the audience feel, think or do after seeing this?',       icon: '💬', required: true  },
  { key: 'deliverables',    label: 'Deliverables',          placeholder: 'List everything that needs to be produced. e.g. 5 IG reels, 3 static posts…',    icon: '📦', required: true  },
  { key: 'platforms',       label: 'Platforms & Formats',   placeholder: 'Which platforms? Instagram, LinkedIn, YouTube? What sizes/formats?',              icon: '📱', required: false },
  { key: 'tone',            label: 'Tone & Voice',          placeholder: 'How should the brand sound? Bold, playful, authoritative, warm?',                 icon: '🎙️', required: false },
  { key: 'references',      label: 'References & Moodboard',placeholder: 'Paste links to reference ads, competitor work, or moodboard images.',             icon: '🖼️', required: false },
  { key: 'dos_donts',       label: "Do's & Don'ts",         placeholder: "Brand rules. e.g. Never use the word 'cheap'. Always show product in lifestyle.", icon: '✅', required: false },
  { key: 'timeline',        label: 'Timeline & Milestones', placeholder: 'Key dates: brief date, first draft due, review, final delivery, go-live.',        icon: '📅', required: false },
  { key: 'budget',          label: 'Budget',                placeholder: 'Total budget or per-deliverable budget. Include production + media spends.',      icon: '💰', required: false },
  { key: 'notes',           label: 'Additional Notes',      placeholder: 'Anything else the team needs to know.',                                           icon: '📝', required: false },
]

const BRIEF_TYPES = [
  { value: 'social_media',     label: 'Social Media'      },
  { value: 'campaign',         label: 'Campaign'          },
  { value: 'performance_ads',  label: 'Performance Ads'   },
  { value: 'brand',            label: 'Brand'             },
  { value: 'content',          label: 'Content'           },
  { value: 'tech_dev',         label: 'Tech / Dev'        },
  { value: 'event',            label: 'Event'             },
]

const TEAMS = [
  { value: 'creative_team',   label: 'Creative Team'    },
  { value: 'content_writer',  label: 'Content Writers'  },
  { value: 'publishing_team', label: 'Publishing Team'  },
  { value: 'performance',     label: 'Performance'      },
  { value: 'tech',            label: 'Tech Team'        },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  not_started: { bg: '#F5F5F7', color: '#86868B', label: 'Draft'       },
  in_progress: { bg: '#FFFBEB', color: '#D97706', label: 'In Progress' },
  review:      { bg: '#EFF6FF', color: '#3B82F6', label: 'In Review'   },
  approved:    { bg: '#ECFDF5', color: '#10B981', label: 'Approved'    },
}

const inputStyle: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA',
  borderRadius: 10, padding: '10px 14px', fontSize: 13,
  color: '#1D1D1F', fontFamily: 'var(--font-body)',
  outline: 'none', width: '100%', transition: 'all 0.15s',
}

// ── Main component ────────────────────────────────────────────────────
export default function BriefHub({ brandId }: { brandId: string }) {
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list')
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null)
  const [sections, setSections] = useState<Record<string, string>>({})
  const [loadingSections, setLoadingSections] = useState(false)

  // Create form state
  const [form, setForm] = useState({
    title: '', brand_id: brandId || '', team: 'creative_team',
    brief_type: 'campaign', due_date: '', drive_file_url: '', month_year: '',
  })
  const [creating, setCreating] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [sectionDraft, setSectionDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadBriefs = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('briefs').select('*, brands(name,color)').order('created_at', { ascending: false })
    if (brandId) q = q.eq('brand_id', brandId)
    const { data } = await q
    setBriefs((data as Brief[]) || [])
    setLoading(false)
  }, [brandId])

  useEffect(() => {
    loadBriefs()
    supabase.from('brands').select('*').then(({ data }) => { if (data) setBrands(data) })
  }, [loadBriefs])

  const openBrief = async (brief: Brief) => {
    setSelectedBrief(brief)
    setLoadingSections(true)
    setView('detail')
    const { data } = await supabase.from('brief_sections').select('*').eq('brief_id', brief.id)
    const map: Record<string, string> = {}
    if (data) data.forEach((s: BriefSection) => { map[s.section_key] = s.content || '' })
    setSections(map)
    setSectionDraft(map)
    setLoadingSections(false)
  }

  const createBrief = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    const { data: brief } = await supabase.from('briefs').insert({
      title: form.title,
      brand_id: form.brand_id || null,
      team: form.team,
      brief_type: form.brief_type,
      due_date: form.due_date || null,
      drive_file_url: form.drive_file_url || null,
      month_year: form.month_year || null,
      status: 'not_started',
    }).select('*, brands(name,color)').single()

    if (brief) {
      setSectionDraft({})
      setSections({})
      setSelectedBrief(brief as Brief)
      setView('detail')
      setForm({ title: '', brand_id: brandId || '', team: 'creative_team', brief_type: 'campaign', due_date: '', drive_file_url: '', month_year: '' })
    }
    setCreating(false)
  }

  const saveSections = async () => {
    if (!selectedBrief) return
    setSaving(true)
    const upserts = Object.entries(sectionDraft)
      .filter(([, content]) => content.trim())
      .map(([section_key, content]) => ({
        brief_id: selectedBrief.id,
        section_key,
        content,
      }))
    if (upserts.length > 0) {
      await supabase.from('brief_sections').upsert(upserts, { onConflict: 'brief_id,section_key' })
    }
    setSections({ ...sectionDraft })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateStatus = async (status: string) => {
    if (!selectedBrief) return
    await supabase.from('briefs').update({ status }).eq('id', selectedBrief.id)
    setSelectedBrief({ ...selectedBrief, status: status as Brief['status'] })
    setBriefs(briefs.map(b => b.id === selectedBrief.id ? { ...b, status: status as Brief['status'] } : b))
  }

  const completedSections = SECTIONS.filter(s => sectionDraft[s.key]?.trim()).length
  const requiredDone = SECTIONS.filter(s => s.required && sectionDraft[s.key]?.trim()).length
  const totalRequired = SECTIONS.filter(s => s.required).length

  // ── LIST VIEW ─────────────────────────────────────────────────────
  if (view === 'list') return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Brief & Asset Hub</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>All job briefs — read and reference. Create jobs using the "New Job" button.</div>
        </div>

      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Briefs', value: briefs.length,                                              color: 'var(--accent)'  },
          { label: 'In Progress',  value: briefs.filter(b => b.status === 'in_progress').length,      color: '#D97706'        },
          { label: 'In Review',    value: briefs.filter(b => b.status === 'review').length,           color: '#3B82F6'        },
          { label: 'Approved',     value: briefs.filter(b => b.status === 'approved').length,         color: '#10B981'        },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Brief cards */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading briefs…</div>
      ) : briefs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '1.5px dashed var(--border-default)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No briefs yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Create your first structured brief to get the team aligned.</div>
          <button onClick={() => setView('create')} style={{ padding: '10px 22px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Create First Brief</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {briefs.map(brief => {
            const st = STATUS_STYLE[brief.status] || STATUS_STYLE.not_started
            const brand = brief.brands as any
            return (
              <div key={brief.id} onClick={() => openBrief(brief)} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: '18px 20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; el.style.transform = 'translateY(-2px)'; el.style.borderColor = 'var(--border-default)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; el.style.transform = 'none'; el.style.borderColor = 'var(--border-subtle)' }}
              >
                {/* Brand colour top bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: brand?.color || 'var(--accent)', borderRadius: '18px 18px 0 0' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10, marginTop: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {brand?.name || 'No Brand'} {brief.brief_type ? `· ${brief.brief_type.replace('_', ' ')}` : ''}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{brief.title}</div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: st.bg, color: st.color }}>{st.label}</span>
                  {brief.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Due {brief.due_date}</span>}
                  {brief.team && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→ {brief.team.replace('_', ' ')}</span>}
                </div>

                {brief.drive_file_url && (
                  <a href={brief.drive_file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#3B82F6', fontWeight: 500, textDecoration: 'none' }}>
                    <ExternalLink size={11} /> Open in Drive
                  </a>
                )}
              </div>
            )
          })}


        </div>
      )}
    </div>
  )

  // ── CREATE VIEW ───────────────────────────────────────────────────
  if (view === 'create') return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button onClick={() => setView('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
        <ArrowLeft size={14} /> Back to briefs
      </button>

      <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Create New Brief</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Fill in the basics — you'll add section details after.</div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brief Title *</label>
            <input style={{ ...inputStyle, fontSize: 14 }} placeholder="e.g. Nike India — June Social Media Brief" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = '#fff' }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E5EA'; (e.target as HTMLInputElement).style.background = '#F5F5F7' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand</label>
              <select style={inputStyle} value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                <option value="">No Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brief Type</label>
              <select style={inputStyle} value={form.brief_type} onChange={e => setForm({ ...form, brief_type: e.target.value })}>
                {BRIEF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Assign To Team</label>
              <select style={inputStyle} value={form.team} onChange={e => setForm({ ...form, team: e.target.value })}>
                {TEAMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Due Date</label>
              <input style={inputStyle} type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Month (for social calendars)</label>
              <input style={inputStyle} type="month" value={form.month_year} onChange={e => setForm({ ...form, month_year: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Google Drive Link</label>
              <input style={inputStyle} placeholder="Paste Drive folder URL" value={form.drive_file_url} onChange={e => setForm({ ...form, drive_file_url: e.target.value })} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
          <button onClick={() => setView('list')} style={{ padding: '10px 20px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
          <button onClick={createBrief} disabled={creating || !form.title.trim()} style={{ padding: '10px 24px', borderRadius: 100, background: creating ? '#C4B5FD' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            {creating ? 'Creating…' : 'Create & Fill Sections →'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── DETAIL VIEW (section builder) ─────────────────────────────────
  if (view === 'detail' && selectedBrief) {
    const brand = selectedBrief.brands as any
    const st = STATUS_STYLE[selectedBrief.status] || STATUS_STYLE.not_started

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <button onClick={() => { setView('list'); loadBriefs() }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 10, cursor: 'pointer', padding: '8px 14px', fontFamily: 'var(--font-body)', fontWeight: 500, flexShrink: 0 }}>
            <ArrowLeft size={13} /> Briefs
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {brand?.name || 'No Brand'} {selectedBrief.brief_type ? `· ${selectedBrief.brief_type.replace('_', ' ')}` : ''}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBrief.title}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {/* Status selector */}
            <select value={selectedBrief.status} onChange={e => updateStatus(e.target.value)}
              style={{ fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 100, border: 'none', background: st.bg, color: st.color, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <option value="not_started">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
            </select>

            {/* Save button */}
            <button onClick={saveSections} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 100, background: saved ? '#10B981' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.25)', transition: 'background 0.3s' }}>
              <Save size={13} />
              {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Brief'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
              <span>Brief completeness</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{completedSections}/{SECTIONS.length} sections</span>
            </div>
            <div style={{ height: 6, background: '#F5F5F7', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(completedSections / SECTIONS.length) * 100}%`, background: 'linear-gradient(90deg, var(--accent), #9F67F7)', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: requiredDone === totalRequired ? '#10B981' : '#F59E0B', fontWeight: 600, flexShrink: 0 }}>
            {requiredDone === totalRequired ? '✓ All required sections done' : `${totalRequired - requiredDone} required section${totalRequired - requiredDone > 1 ? 's' : ''} missing`}
          </div>
          {selectedBrief.drive_file_url && (
            <a href={selectedBrief.drive_file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3B82F6', fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}>
              <ExternalLink size={12} /> Drive
            </a>
          )}
        </div>

        {loadingSections ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading sections…</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {SECTIONS.map(section => {
              const isOpen = activeSection === section.key
              const hasContent = sectionDraft[section.key]?.trim()

              return (
                <div key={section.key} style={{ background: '#fff', border: `1.5px solid ${isOpen ? 'var(--accent)' : hasContent ? '#D1FAE5' : 'var(--border-subtle)'}`, borderRadius: 16, overflow: 'hidden', boxShadow: isOpen ? '0 4px 16px rgba(124,58,237,0.10)' : '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>

                  {/* Section header */}
                  <div onClick={() => setActiveSection(isOpen ? null : section.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{section.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {section.label}
                        {section.required && <span style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', background: '#FEE2E2', padding: '1px 7px', borderRadius: 100 }}>Required</span>}
                      </div>
                      {!isOpen && hasContent && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>{sectionDraft[section.key]}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {hasContent && !isOpen && <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: 100 }}>✓ Done</span>}
                      <ChevronRight size={16} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                  </div>

                  {/* Section content */}
                  {isOpen && (
                    <div style={{ padding: '0 18px 18px' }}>
                      <textarea
                        value={sectionDraft[section.key] || ''}
                        onChange={e => setSectionDraft({ ...sectionDraft, [section.key]: e.target.value })}
                        placeholder={section.placeholder}
                        style={{ width: '100%', minHeight: 120, background: '#F5F5F7', border: '1.5px solid var(--border-default)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                        onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent)'}
                        onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-default)'}
                        autoFocus
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button onClick={() => setActiveSection(null)} style={{ padding: '7px 16px', borderRadius: 100, background: 'var(--accent-subtle)', color: 'var(--accent)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          Done ✓
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return null
}
