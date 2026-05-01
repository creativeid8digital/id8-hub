'use client'
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Check, Upload, X } from 'lucide-react'

type Brand = { id: string; name: string; color: string }

type Manual = {
  tagline?: string; industry?: string; founded_year?: string; website?: string
  primary_color?: string; secondary_color?: string; accent_color?: string; forbidden_colors?: string
  primary_font?: string; secondary_font?: string; font_notes?: string
  tone_words?: string[]; anti_tone_words?: string[]; brand_voice_notes?: string
  target_age?: string; target_gender?: string; target_interests?: string; target_market?: string
  active_platforms?: string[]; platform_notes?: string
  dos?: string; donts?: string; competitors?: string
  instagram_url?: string; linkedin_url?: string; twitter_url?: string; youtube_url?: string; facebook_url?: string
  logo_url?: string; reference_urls?: string[]
  completed?: boolean
}

const STEPS = [
  { id: 'identity',   icon: '🏢', title: 'Brand Identity',      desc: 'Who you are'                },
  { id: 'colours',    icon: '🎨', title: 'Colours',              desc: 'Your colour palette'        },
  { id: 'typography', icon: '✍️', title: 'Typography',           desc: 'Fonts and type rules'       },
  { id: 'voice',      icon: '🎙️', title: 'Voice & Tone',         desc: 'How you speak'              },
  { id: 'audience',   icon: '👥', title: 'Target Audience',      desc: 'Who you talk to'            },
  { id: 'platforms',  icon: '📱', title: 'Platforms',            desc: 'Where you show up'          },
  { id: 'rules',      icon: '📋', title: 'Dos & Don\'ts',        desc: 'Brand rules'                },
  { id: 'social',     icon: '🔗', title: 'Social Links',         desc: 'Your social presence'       },
  { id: 'assets',     icon: '🖼️', title: 'Logo & References',    desc: 'Visual references for AI'   },
]

const PLATFORMS = ['instagram','linkedin','twitter','youtube','facebook','tiktok']
const PLATFORM_EMOJI: Record<string, string> = { instagram:'📸', linkedin:'💼', twitter:'🐦', youtube:'▶️', facebook:'👥', tiktok:'🎵' }

const inp: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
  padding: '10px 14px', fontSize: 13, color: '#1D1D1F',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%', transition: 'all 0.15s',
}

const TONE_SUGGESTIONS = ['Bold','Inspiring','Energetic','Warm','Professional','Playful','Minimal','Luxury','Authentic','Confident','Innovative','Friendly']
const ANTI_TONE_SUGGESTIONS = ['Boring','Weak','Casual','Loud','Cluttered','Generic','Corporate','Fake','Aggressive','Passive']

type Props = { brand: Brand; onBack: () => void }

export default function BrandManualBuilder({ brand, onBack }: Props) {
  const [step, setStep] = useState(0)
  const [manual, setManual] = useState<Manual>({ primary_color: brand.color, tone_words: [], anti_tone_words: [], active_platforms: [], reference_urls: [] })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toneInput, setToneInput] = useState('')
  const [antiToneInput, setAntiToneInput] = useState('')

  useEffect(() => {
    fetch(`/api/brand-manual?brand_id=${brand.id}`)
      .then(r => r.json())
      .then(d => { if (d) setManual({ ...d, tone_words: d.tone_words || [], anti_tone_words: d.anti_tone_words || [], active_platforms: d.active_platforms || [], reference_urls: d.reference_urls || [] }) })
  }, [brand.id])

  const save = useCallback(async (m = manual, complete = false) => {
    setSaving(true)
    await fetch('/api/brand-manual', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_id: brand.id, ...m, ...(complete ? { completed: true } : {}) })
    })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }, [brand.id, manual])

  const set = (field: keyof Manual, value: any) => setManual(m => ({ ...m, [field]: value }))

  const addToneWord = (word: string, field: 'tone_words' | 'anti_tone_words') => {
    if (!word.trim()) return
    const arr = (manual[field] || []) as string[]
    if (!arr.includes(word)) set(field, [...arr, word])
    if (field === 'tone_words') setToneInput('')
    else setAntiToneInput('')
  }

  const removeToneWord = (word: string, field: 'tone_words' | 'anti_tone_words') => {
    set(field, ((manual[field] || []) as string[]).filter(w => w !== word))
  }

  const togglePlatform = (p: string) => {
    const platforms = manual.active_platforms || []
    set('active_platforms', platforms.includes(p) ? platforms.filter(x => x !== p) : [...platforms, p])
  }

  const uploadFile = async (file: File, type: 'logo' | 'reference') => {
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('task_id', `brand_${brand.id}_${type}`)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.url) {
      if (type === 'logo') {
        set('logo_url', data.url)
      } else {
        set('reference_urls', [...(manual.reference_urls || []), data.url])
      }
    }
    setUploading(false)
  }

  const currentStep = STEPS[step]

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F5F7', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={15} color="var(--text-muted)" />
        </button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Brand Manual — <span style={{ color: brand.color }}>{brand.name}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Complete this so AI can properly critique your creatives
          </div>
        </div>
        <button onClick={() => save(manual, true)} disabled={saving}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 100, background: saved ? '#10B981' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Check size={14} /> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Manual'}
        </button>
      </div>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} onClick={() => { save(); setStep(i) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 100, cursor: 'pointer', flexShrink: 0, background: i === step ? 'var(--accent)' : i < step ? '#ECFDF5' : '#F5F5F7', border: `1.5px solid ${i === step ? 'var(--accent)' : i < step ? '#A7F3D0' : 'transparent'}`, transition: 'all 0.2s' }}>
            <span style={{ fontSize: 14 }}>{i < step ? '✓' : s.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: i === step ? '#fff' : i < step ? '#10B981' : 'var(--text-muted)' }}>{s.title}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', minHeight: 400 }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>{currentStep.icon}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{currentStep.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>{currentStep.desc}</div>

        {/* IDENTITY */}
        {step === 0 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Tagline</label>
                <input style={inp} placeholder="e.g. Just Do It" value={manual.tagline || ''} onChange={e => set('tagline', e.target.value)} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Industry</label>
                <input style={inp} placeholder="e.g. Sports & Lifestyle" value={manual.industry || ''} onChange={e => set('industry', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Founded Year</label>
                <input style={inp} placeholder="e.g. 2015" value={manual.founded_year || ''} onChange={e => set('founded_year', e.target.value)} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Website</label>
                <input style={inp} placeholder="https://brand.com" value={manual.website || ''} onChange={e => set('website', e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* COLOURS */}
        {step === 1 && (
          <div style={{ display: 'grid', gap: 20 }}>
            {[
              { label: 'Primary Colour *', field: 'primary_color' as keyof Manual, desc: 'Main brand colour — most used in creatives' },
              { label: 'Secondary Colour', field: 'secondary_color' as keyof Manual, desc: 'Supporting colour' },
              { label: 'Accent Colour', field: 'accent_color' as keyof Manual, desc: 'Used for CTAs, highlights' },
            ].map(c => (
              <div key={c.field}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{c.label}</label>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{c.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="color" value={(manual[c.field] as string) || '#7C3AED'} onChange={e => set(c.field, e.target.value)}
                    style={{ width: 48, height: 48, borderRadius: 12, border: '2px solid var(--border-default)', cursor: 'pointer', padding: 2 }} />
                  <input style={{ ...inp, width: 140 }} placeholder="#7C3AED" value={(manual[c.field] as string) || ''}
                    onChange={e => set(c.field, e.target.value)} />
                  {manual[c.field] && <div style={{ width: 48, height: 48, borderRadius: 12, background: manual[c.field] as string, border: '1px solid var(--border-subtle)' }} />}
                </div>
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Forbidden Colours</label>
              <input style={inp} placeholder="e.g. #FF0000, bright green — colours that should NEVER appear" value={manual.forbidden_colors || ''} onChange={e => set('forbidden_colors', e.target.value)} />
            </div>
          </div>
        )}

        {/* TYPOGRAPHY */}
        {step === 2 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Primary Font</label>
                <input style={inp} placeholder="e.g. Futura Bold" value={manual.primary_font || ''} onChange={e => set('primary_font', e.target.value)} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Secondary Font</label>
                <input style={inp} placeholder="e.g. Nike Clean" value={manual.secondary_font || ''} onChange={e => set('secondary_font', e.target.value)} /></div>
            </div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Font Rules & Notes</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 100 }}
                placeholder="e.g. Never use serif fonts. Headlines always in uppercase. Body text always in Regular weight. Minimum font size 14px..."
                value={manual.font_notes || ''} onChange={e => set('font_notes', e.target.value)} /></div>
          </div>
        )}

        {/* VOICE & TONE */}
        {step === 3 && (
          <div style={{ display: 'grid', gap: 24 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand IS these words (pick up to 5)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {TONE_SUGGESTIONS.map(w => {
                  const selected = (manual.tone_words || []).includes(w)
                  return <div key={w} onClick={() => selected ? removeToneWord(w, 'tone_words') : addToneWord(w, 'tone_words')}
                    style={{ padding: '6px 14px', borderRadius: 100, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: selected ? 'var(--accent)' : '#F5F5F7', color: selected ? '#fff' : 'var(--text-muted)', border: `1.5px solid ${selected ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.15s' }}>
                    {w}
                  </div>
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Or type your own..." value={toneInput} onChange={e => setToneInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addToneWord(toneInput, 'tone_words') }} />
                <button onClick={() => addToneWord(toneInput, 'tone_words')} style={{ padding: '9px 16px', borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Add</button>
              </div>
              {(manual.tone_words || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {(manual.tone_words || []).map(w => (
                    <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 100, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                      {w} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeToneWord(w, 'tone_words')} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand is NEVER these words</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {ANTI_TONE_SUGGESTIONS.map(w => {
                  const selected = (manual.anti_tone_words || []).includes(w)
                  return <div key={w} onClick={() => selected ? removeToneWord(w, 'anti_tone_words') : addToneWord(w, 'anti_tone_words')}
                    style={{ padding: '6px 14px', borderRadius: 100, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: selected ? '#EF4444' : '#F5F5F7', color: selected ? '#fff' : 'var(--text-muted)', border: `1.5px solid ${selected ? '#EF4444' : 'transparent'}`, transition: 'all 0.15s' }}>
                    {w}
                  </div>
                })}
              </div>
              {(manual.anti_tone_words || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {(manual.anti_tone_words || []).map(w => (
                    <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 100, background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                      {w} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeToneWord(w, 'anti_tone_words')} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand Voice Notes</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }}
                placeholder="e.g. We speak like a coach, not a salesperson. Short punchy sentences. Never use exclamation marks. Always second-person (You, Your)."
                value={manual.brand_voice_notes || ''} onChange={e => set('brand_voice_notes', e.target.value)} /></div>
          </div>
        )}

        {/* AUDIENCE */}
        {step === 4 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Age Range</label>
                <input style={inp} placeholder="e.g. 18-35" value={manual.target_age || ''} onChange={e => set('target_age', e.target.value)} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Gender</label>
                <input style={inp} placeholder="e.g. All genders, skews male" value={manual.target_gender || ''} onChange={e => set('target_gender', e.target.value)} /></div>
            </div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Interests & Psychographics</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }}
                placeholder="e.g. Fitness enthusiasts, sports fans, health-conscious millennials who value performance and style..."
                value={manual.target_interests || ''} onChange={e => set('target_interests', e.target.value)} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Target Market / Geography</label>
              <input style={inp} placeholder="e.g. Urban India, Tier 1 cities, SEC A/B" value={manual.target_market || ''} onChange={e => set('target_market', e.target.value)} /></div>
          </div>
        )}

        {/* PLATFORMS */}
        {step === 5 && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Active Platforms</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {PLATFORMS.map(p => {
                  const active = (manual.active_platforms || []).includes(p)
                  return <div key={p} onClick={() => togglePlatform(p)}
                    style={{ padding: '14px 16px', borderRadius: 14, cursor: 'pointer', border: `2px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`, background: active ? 'var(--accent-subtle)' : '#fff', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{PLATFORM_EMOJI[p]}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text-primary)', textTransform: 'capitalize' }}>{p}</div>
                      {active && <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>✓ Active</div>}
                    </div>
                  </div>
                })}
              </div>
            </div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Platform-specific notes</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }}
                placeholder="e.g. Instagram: always use Reels format. LinkedIn: more formal copy. Twitter: max 2 hashtags..."
                value={manual.platform_notes || ''} onChange={e => set('platform_notes', e.target.value)} /></div>
          </div>
        )}

        {/* DOS & DON'TS */}
        {step === 6 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#10B981', display: 'block', marginBottom: 6 }}>✅ Always Do</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 120, borderColor: '#A7F3D0' }}
                placeholder="e.g.&#10;• Always include the logo in the bottom right&#10;• Always use brand colours for CTA buttons&#10;• Always show product in use, not isolated&#10;• Always include a clear CTA"
                value={manual.dos || ''} onChange={e => set('dos', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', display: 'block', marginBottom: 6 }}>❌ Never Do</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 120, borderColor: '#FECACA' }}
                placeholder="e.g.&#10;• Never use gradients&#10;• Never use serif fonts&#10;• Never show competitors' products&#10;• Never use stock photography"
                value={manual.donts || ''} onChange={e => set('donts', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Main Competitors</label>
              <input style={inp} placeholder="e.g. Adidas India, Puma India, Reebok" value={manual.competitors || ''} onChange={e => set('competitors', e.target.value)} />
            </div>
          </div>
        )}

        {/* SOCIAL LINKS */}
        {step === 7 && (
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              { platform: 'Instagram', field: 'instagram_url' as keyof Manual, emoji: '📸', placeholder: 'https://instagram.com/brand' },
              { platform: 'LinkedIn',  field: 'linkedin_url'  as keyof Manual, emoji: '💼', placeholder: 'https://linkedin.com/company/brand' },
              { platform: 'Twitter/X', field: 'twitter_url'   as keyof Manual, emoji: '🐦', placeholder: 'https://x.com/brand' },
              { platform: 'YouTube',   field: 'youtube_url'   as keyof Manual, emoji: '▶️', placeholder: 'https://youtube.com/@brand' },
              { platform: 'Facebook',  field: 'facebook_url'  as keyof Manual, emoji: '👥', placeholder: 'https://facebook.com/brand' },
            ].map(s => (
              <div key={s.field} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.emoji}</div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{s.platform}</label>
                  <input style={inp} placeholder={s.placeholder} value={(manual[s.field] as string) || ''} onChange={e => set(s.field, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LOGO & REFERENCES */}
        {step === 8 && (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* Logo upload */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Brand Logo</label>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>AI will check if logo appears in creatives</div>
              {manual.logo_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={manual.logo_url} alt="Logo" style={{ height: 60, maxWidth: 200, objectFit: 'contain', background: '#F5F5F7', padding: 8, borderRadius: 10, border: '1px solid var(--border-subtle)' }} />
                  <button onClick={() => set('logo_url', '')} style={{ padding: '6px 14px', borderRadius: 100, background: '#FEE2E2', color: '#EF4444', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Remove</button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px', border: '2px dashed var(--border-default)', borderRadius: 12, cursor: 'pointer', background: '#FAFAFA', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--accent-subtle)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLLabelElement).style.background = '#FAFAFA' }}
                >
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'logo')} />
                  <Upload size={18} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{uploading ? 'Uploading…' : 'Upload logo (PNG with transparency preferred)'}</span>
                </label>
              )}
            </div>

            {/* Reference creatives */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Reference Creatives (3-5 examples)</label>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Upload your best creatives. AI uses these as the visual benchmark when critiquing new work.</div>

              {/* Uploaded references */}
              {(manual.reference_urls || []).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
                  {(manual.reference_urls || []).map((url, i) => (
                    <div key={url} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)', aspectRatio: '1' }}>
                      <img src={url} alt={`Reference ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => set('reference_urls', (manual.reference_urls || []).filter(u => u !== url))}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(manual.reference_urls || []).length < 5 && (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px', border: '2px dashed var(--border-default)', borderRadius: 12, cursor: 'pointer', background: '#FAFAFA', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--accent-subtle)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLLabelElement).style.background = '#FAFAFA' }}
                >
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'reference')} />
                  <Upload size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{uploading ? 'Uploading…' : `Add reference creative (${(manual.reference_urls || []).length}/5)`}</span>
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={() => { save(); if (step > 0) setStep(step - 1) }} disabled={step === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 100, background: step === 0 ? '#F5F5F7' : '#fff', color: step === 0 ? 'var(--text-disabled)' : 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: step === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
          <ArrowLeft size={14} /> Previous
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={() => { save(); setStep(step + 1) }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 24px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={() => save(manual, true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 24px', borderRadius: 100, background: '#10B981', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <Check size={16} /> Complete Brand Manual
          </button>
        )}
      </div>
    </div>
  )
}
