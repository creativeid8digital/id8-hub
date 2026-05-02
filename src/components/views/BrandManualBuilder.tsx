'use client'
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Check, Upload, X, Sparkles, FileText } from 'lucide-react'

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
  logo_url?: string; reference_urls?: string[]; completed?: boolean
}

const STEPS = [
  { id: 'upload',     icon: '🤖', title: 'AI Auto-Fill',       desc: 'Upload PDF to auto-populate'    },
  { id: 'identity',   icon: '🏢', title: 'Brand Identity',      desc: 'Who you are'                    },
  { id: 'colours',    icon: '🎨', title: 'Colours',              desc: 'Your colour palette'            },
  { id: 'typography', icon: '✍️', title: 'Typography',           desc: 'Fonts and type rules'           },
  { id: 'voice',      icon: '🎙️', title: 'Voice & Tone',         desc: 'How you speak'                  },
  { id: 'audience',   icon: '👥', title: 'Target Audience',      desc: 'Who you talk to'                },
  { id: 'platforms',  icon: '📱', title: 'Platforms',            desc: 'Where you show up'              },
  { id: 'rules',      icon: '📋', title: 'Dos & Don\'ts',        desc: 'Brand rules'                    },
  { id: 'social',     icon: '🔗', title: 'Social Links',         desc: 'Your social presence'           },
  { id: 'assets',     icon: '🖼️', title: 'Logo & References',    desc: 'Visual references for AI'       },
]

// Dropdown options
const INDUSTRIES = ['Advertising & Marketing','Automotive','Banking & Finance','Consumer Goods','Education','Entertainment','Fashion & Lifestyle','FMCG','Food & Beverage','Healthcare & Pharma','Hospitality & Travel','Insurance','Manufacturing','Media & Publishing','Non-Profit','Real Estate','Retail','Sports & Fitness','Technology','Telecommunications','Other']
const AGE_RANGES = ['Under 18','18–24','25–34','35–44','45–54','55–64','65+','All ages','18–35','25–45','18–45']
const GENDERS = ['All genders','Skews male','Skews female','Predominantly male','Predominantly female','Male','Female','Non-binary inclusive']
const MARKETS = ['Pan India','Urban India — Tier 1','Urban India — Tier 1 & 2','Rural India','North India','South India','West India','East India','Global','Southeast Asia','Middle East & Africa','US & Canada','Europe','APAC']
const TONE_SUGGESTIONS = ['Bold','Inspiring','Energetic','Warm','Professional','Playful','Minimal','Luxury','Authentic','Confident','Innovative','Friendly','Authoritative','Aspirational','Empowering','Witty','Sincere','Dynamic']
const ANTI_TONE_SUGGESTIONS = ['Boring','Weak','Casual','Loud','Cluttered','Generic','Corporate','Fake','Aggressive','Passive','Preachy','Salesy','Outdated','Complex']
const PLATFORMS = ['instagram','linkedin','twitter','youtube','facebook','tiktok']
const PLATFORM_EMOJI: Record<string,string> = { instagram:'📸', linkedin:'💼', twitter:'🐦', youtube:'▶️', facebook:'👥', tiktok:'🎵' }
const FONT_STYLES = ['Sans-serif only','Serif only','Both serif and sans-serif','Display/decorative fonts allowed','Monospace allowed','System fonts only']

const inp: React.CSSProperties = { background:'#F5F5F7', border:'1.5px solid #E5E5EA', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#1D1D1F', fontFamily:'var(--font-body)', outline:'none', width:'100%', transition:'all 0.15s' }
const sel: React.CSSProperties = { ...inp, cursor:'pointer' }

type Props = { brand: Brand; onBack: () => void }

export default function BrandManualBuilder({ brand, onBack }: Props) {
  const [step, setStep] = useState(0)
  const [manual, setManual] = useState<Manual>({ primary_color: brand.color, tone_words:[], anti_tone_words:[], active_platforms:[], reference_urls:[] })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [toneInput, setToneInput] = useState('')
  const [antiToneInput, setAntiToneInput] = useState('')

  useEffect(() => {
    fetch(`/api/brand-manual?brand_id=${brand.id}`)
      .then(r => r.json())
      .then(d => { if (d) setManual({ ...d, tone_words:d.tone_words||[], anti_tone_words:d.anti_tone_words||[], active_platforms:d.active_platforms||[], reference_urls:d.reference_urls||[] }) })
  }, [brand.id])

  const save = useCallback(async (m = manual, complete = false) => {
    setSaving(true)
    await fetch('/api/brand-manual', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ brand_id:brand.id, ...m, ...(complete?{completed:true}:{}) }) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }, [brand.id, manual])

  const set = (field: keyof Manual, value: any) => setManual(m => ({ ...m, [field]:value }))

  const addToneWord = (word: string, field: 'tone_words'|'anti_tone_words') => {
    if (!word.trim()) return
    const arr = (manual[field]||[]) as string[]
    if (!arr.includes(word)) set(field, [...arr, word])
    if (field==='tone_words') setToneInput(''); else setAntiToneInput('')
  }
  const removeToneWord = (word: string, field: 'tone_words'|'anti_tone_words') => set(field, ((manual[field]||[]) as string[]).filter(w=>w!==word))
  const togglePlatform = (p: string) => { const pl=manual.active_platforms||[]; set('active_platforms', pl.includes(p)?pl.filter(x=>x!==p):[...pl,p]) }

  // AI extract from PDF
  const extractFromPDF = async (file: File, docType: 'brand_guide'|'sop') => {
    setExtracting(true); setExtractSuccess(false)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', docType)
    try {
      const res = await fetch('/api/extract-brand', { method:'POST', body:formData })
      const data = await res.json()
      if (data.extracted) {
        const ex = data.extracted
        setManual(m => ({
          ...m,
          ...(ex.tagline && { tagline:ex.tagline }),
          ...(ex.industry && { industry:ex.industry }),
          ...(ex.website && { website:ex.website }),
          ...(ex.primary_color && { primary_color:ex.primary_color }),
          ...(ex.secondary_color && { secondary_color:ex.secondary_color }),
          ...(ex.accent_color && { accent_color:ex.accent_color }),
          ...(ex.forbidden_colors && { forbidden_colors:ex.forbidden_colors }),
          ...(ex.primary_font && { primary_font:ex.primary_font }),
          ...(ex.secondary_font && { secondary_font:ex.secondary_font }),
          ...(ex.font_notes && { font_notes:ex.font_notes }),
          ...(ex.tone_words?.length && { tone_words: (m.tone_words||[]).concat(ex.tone_words).filter((v:string,i:number,a:string[])=>a.indexOf(v)===i) }),
          ...(ex.anti_tone_words?.length && { anti_tone_words: (m.anti_tone_words||[]).concat(ex.anti_tone_words).filter((v:string,i:number,a:string[])=>a.indexOf(v)===i) }),
          ...(ex.brand_voice_notes && { brand_voice_notes:ex.brand_voice_notes }),
          ...(ex.target_age && { target_age:ex.target_age }),
          ...(ex.target_gender && { target_gender:ex.target_gender }),
          ...(ex.target_interests && { target_interests:ex.target_interests }),
          ...(ex.target_market && { target_market:ex.target_market }),
          ...(ex.active_platforms?.length && { active_platforms: (m.active_platforms||[]).concat(ex.active_platforms).filter((v:string,i:number,a:string[])=>a.indexOf(v)===i) }),
          ...(ex.platform_notes && { platform_notes:ex.platform_notes }),
          ...(ex.dos && { dos:ex.dos }),
          ...(ex.donts && { donts:ex.donts }),
          ...(ex.competitors && { competitors:ex.competitors }),
          ...(ex.instagram_url && { instagram_url:ex.instagram_url }),
          ...(ex.linkedin_url && { linkedin_url:ex.linkedin_url }),
          ...(ex.twitter_url && { twitter_url:ex.twitter_url }),
          ...(ex.youtube_url && { youtube_url:ex.youtube_url }),
          ...(ex.facebook_url && { facebook_url:ex.facebook_url }),
        }))
        setExtractSuccess(true)
      }
    } catch(err) { console.error(err) }
    setExtracting(false)
  }

  const uploadAsset = async (file: File, type: 'logo'|'reference') => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('task_id', `brand_${brand.id}_${type}`)
    const res = await fetch('/api/upload', { method:'POST', body:formData })
    const data = await res.json()
    if (data.url) { if (type==='logo') set('logo_url', data.url); else set('reference_urls', [...(manual.reference_urls||[]), data.url]) }
    setUploading(false)
  }

  const Label = ({ text, sub }: { text: string; sub?: string }) => (
    <div style={{ marginBottom: sub ? 4 : 8 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block' }}>{text}</label>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>{sub}</div>}
    </div>
  )

  const Tags = ({ items, color, onRemove }: { items: string[]; color: string; onRemove: (w:string)=>void }) => (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
      {items.map(w => (
        <div key={w} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:100, background:color, color:'#fff', fontSize:12, fontWeight:600 }}>
          {w} <X size={11} style={{ cursor:'pointer' }} onClick={() => onRemove(w)} />
        </div>
      ))}
    </div>
  )

  const currentStep = STEPS[step]

  return (
    <div style={{ maxWidth:780, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
        <button onClick={onBack} style={{ width:36, height:36, borderRadius:10, background:'#F5F5F7', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <ArrowLeft size={15} color="var(--text-muted)" />
        </button>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)' }}>Brand Manual — <span style={{ color:brand.color }}>{brand.name}</span></div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Complete this so AI can properly critique your team's creatives</div>
        </div>
        <button onClick={() => save(manual, true)} disabled={saving}
          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:100, background:saved?'#10B981':'var(--accent)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', boxShadow:'0 4px 12px rgba(124,58,237,0.3)', whiteSpace:'nowrap' }}>
          <Check size={14} /> {saved?'Saved!':saving?'Saving…':'Save Manual'}
        </button>
      </div>

      {/* Step pills */}
      <div style={{ display:'flex', gap:5, marginBottom:24, overflowX:'auto', paddingBottom:4 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} onClick={() => { save(); setStep(i) }}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:100, cursor:'pointer', flexShrink:0, background:i===step?'var(--accent)':i<step?'#ECFDF5':'#F5F5F7', border:`1.5px solid ${i===step?'var(--accent)':i<step?'#A7F3D0':'transparent'}`, transition:'all 0.2s' }}>
            <span style={{ fontSize:13 }}>{i<step?'✓':s.icon}</span>
            <span style={{ fontSize:11, fontWeight:600, color:i===step?'#fff':i<step?'#10B981':'var(--text-muted)' }}>{s.title}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ background:'#fff', border:'1px solid var(--border-subtle)', borderRadius:20, padding:32, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', minHeight:380 }}>
        <div style={{ fontSize:22, marginBottom:6 }}>{currentStep.icon}</div>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{currentStep.title}</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>{currentStep.desc}</div>

        {/* ── STEP 0: AI AUTO-FILL ── */}
        {step === 0 && (
          <div style={{ display:'grid', gap:20 }}>
            {extractSuccess && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', background:'#ECFDF5', borderRadius:12, border:'1px solid #A7F3D0' }}>
                <span style={{ fontSize:20 }}>✅</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#10B981' }}>Brand manual auto-filled!</div>
                  <div style={{ fontSize:12, color:'#065F46' }}>Review each section and make any corrections. Click Next to continue.</div>
                </div>
              </div>
            )}

            {/* Brand Guide PDF */}
            <div style={{ border:'2px solid var(--border-default)', borderRadius:16, padding:24, background:'#FAFAF9' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'var(--accent-subtle)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20 }}>📄</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Brand Guide / Style Guide PDF</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>AI will extract colours, fonts, tone, audience, dos & don'ts automatically from the PDF</div>
                </div>
              </div>
              <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'18px', border:`2px dashed ${extracting?'var(--accent)':'var(--border-default)'}`, borderRadius:12, cursor:extracting?'not-allowed':'pointer', background:extracting?'var(--accent-subtle)':'#fff', transition:'all 0.2s' }}
                onMouseEnter={e => { if (!extracting) (e.currentTarget as HTMLLabelElement).style.borderColor='var(--accent)' }}
                onMouseLeave={e => { if (!extracting) (e.currentTarget as HTMLLabelElement).style.borderColor='var(--border-default)' }}
              >
                <input type="file" accept=".pdf,image/*" style={{ display:'none' }} disabled={extracting}
                  onChange={e => e.target.files?.[0] && extractFromPDF(e.target.files[0], 'brand_guide')} />
                {extracting ? (
                  <><Sparkles size={18} color="var(--accent)" /><span style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>AI is reading your brand guide…</span></>
                ) : (
                  <><Upload size={16} color="var(--text-muted)" /><span style={{ fontSize:13, fontWeight:500, color:'var(--text-muted)' }}>Upload brand guide PDF or image</span></>
                )}
              </label>
            </div>

            {/* SOP / Internal doc */}
            <div style={{ border:'2px solid var(--border-default)', borderRadius:16, padding:24, background:'#FAFAF9' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'#FFFBEB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20 }}>📋</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Agency SOP / Internal Guidelines</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>Upload your internal dos & don'ts document — AI extracts the rules and adds them to this brand</div>
                </div>
              </div>
              <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'18px', border:`2px dashed ${extracting?'#F59E0B':'var(--border-default)'}`, borderRadius:12, cursor:extracting?'not-allowed':'pointer', background:'#fff', transition:'all 0.2s' }}
                onMouseEnter={e => { if (!extracting) (e.currentTarget as HTMLLabelElement).style.borderColor='#F59E0B' }}
                onMouseLeave={e => { if (!extracting) (e.currentTarget as HTMLLabelElement).style.borderColor='var(--border-default)' }}
              >
                <input type="file" accept=".pdf,.doc,.docx,image/*" style={{ display:'none' }} disabled={extracting}
                  onChange={e => e.target.files?.[0] && extractFromPDF(e.target.files[0], 'sop')} />
                <FileText size={16} color="var(--text-muted)" />
                <span style={{ fontSize:13, fontWeight:500, color:'var(--text-muted)' }}>Upload SOP / guidelines document</span>
              </label>
            </div>

            <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>
              — or skip this step and fill the manual manually —
            </div>
          </div>
        )}

        {/* ── STEP 1: IDENTITY ── */}
        {step === 1 && (
          <div style={{ display:'grid', gap:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div><Label text="Tagline" /><input style={inp} placeholder="e.g. Just Do It" value={manual.tagline||''} onChange={e=>set('tagline',e.target.value)} /></div>
              <div>
                <Label text="Industry" />
                <select style={sel} value={manual.industry||''} onChange={e=>set('industry',e.target.value)}>
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div><Label text="Founded Year" /><input style={inp} placeholder="e.g. 2015" value={manual.founded_year||''} onChange={e=>set('founded_year',e.target.value)} /></div>
              <div><Label text="Website" /><input style={inp} placeholder="https://brand.com" value={manual.website||''} onChange={e=>set('website',e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* ── STEP 2: COLOURS ── */}
        {step === 2 && (
          <div style={{ display:'grid', gap:22 }}>
            {[
              { label:'Primary Colour *', field:'primary_color' as keyof Manual, desc:'Main brand colour — must appear in every creative' },
              { label:'Secondary Colour', field:'secondary_color' as keyof Manual, desc:'Supporting colour' },
              { label:'Accent Colour', field:'accent_color' as keyof Manual, desc:'Used for CTAs, highlights, dividers' },
            ].map(c => (
              <div key={c.field as string}>
                <Label text={c.label} sub={c.desc} />
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <input type="color" value={(manual[c.field] as string)||'#7C3AED'} onChange={e=>set(c.field,e.target.value)}
                    style={{ width:48, height:48, borderRadius:12, border:'2px solid var(--border-default)', cursor:'pointer', padding:2 }} />
                  <input style={{...inp,width:150}} placeholder="#7C3AED" value={(manual[c.field] as string)||''} onChange={e=>set(c.field,e.target.value)} />
                  {manual[c.field] && <div style={{ width:48, height:48, borderRadius:12, background:manual[c.field] as string, border:'1px solid var(--border-subtle)', flexShrink:0 }} />}
                  {manual[c.field] && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{manual[c.field]}</div>}
                </div>
              </div>
            ))}
            <div><Label text="Forbidden Colours" sub="Colours that must NEVER appear in any creative" /><input style={inp} placeholder="e.g. #FF0000, any bright green, neon colours" value={manual.forbidden_colors||''} onChange={e=>set('forbidden_colors',e.target.value)} /></div>
          </div>
        )}

        {/* ── STEP 3: TYPOGRAPHY ── */}
        {step === 3 && (
          <div style={{ display:'grid', gap:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div><Label text="Primary Font" sub="Main headline font" /><input style={inp} placeholder="e.g. Futura Bold" value={manual.primary_font||''} onChange={e=>set('primary_font',e.target.value)} /></div>
              <div><Label text="Secondary Font" sub="Body / supporting font" /><input style={inp} placeholder="e.g. Nike Clean" value={manual.secondary_font||''} onChange={e=>set('secondary_font',e.target.value)} /></div>
            </div>
            <div>
              <Label text="Font Style Rules" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                {FONT_STYLES.map(f => {
                  const selected = manual.font_notes?.includes(f)
                  return <div key={f} onClick={() => {
                    const current = manual.font_notes || ''
                    set('font_notes', selected ? current.replace(f+'. ','').replace(f,'').trim() : (current ? current+'. '+f : f))
                  }} style={{ padding:'8px 12px', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:500, background:selected?'var(--accent-subtle)':'#F5F5F7', color:selected?'var(--accent)':'var(--text-muted)', border:`1.5px solid ${selected?'var(--accent)':'transparent'}`, transition:'all 0.15s', textAlign:'center' }}>
                    {f}
                  </div>
                })}
              </div>
            </div>
            <div><Label text="Additional Font Notes" /><textarea style={{...inp,resize:'vertical',minHeight:80}} placeholder="e.g. Headlines always uppercase. Body text always Regular weight. Min font size 14px on mobile..." value={manual.font_notes||''} onChange={e=>set('font_notes',e.target.value)} /></div>
          </div>
        )}

        {/* ── STEP 4: VOICE & TONE ── */}
        {step === 4 && (
          <div style={{ display:'grid', gap:24 }}>
            <div>
              <Label text="Brand IS (pick up to 6)" sub="Words that describe your brand's personality" />
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:12 }}>
                {TONE_SUGGESTIONS.map(w => {
                  const sel2 = (manual.tone_words||[]).includes(w)
                  return <div key={w} onClick={() => sel2?removeToneWord(w,'tone_words'):addToneWord(w,'tone_words')}
                    style={{ padding:'6px 14px', borderRadius:100, cursor:'pointer', fontSize:12, fontWeight:600, background:sel2?'var(--accent)':'#F5F5F7', color:sel2?'#fff':'var(--text-muted)', border:`1.5px solid ${sel2?'var(--accent)':'transparent'}`, transition:'all 0.15s' }}>{w}</div>
                })}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input style={{...inp,flex:1}} placeholder="Add custom word…" value={toneInput} onChange={e=>setToneInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addToneWord(toneInput,'tone_words')}} />
                <button onClick={()=>addToneWord(toneInput,'tone_words')} style={{ padding:'9px 16px', borderRadius:10, background:'var(--accent)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}>+ Add</button>
              </div>
              {(manual.tone_words||[]).length>0 && <Tags items={manual.tone_words||[]} color="var(--accent)" onRemove={w=>removeToneWord(w,'tone_words')} />}
            </div>

            <div>
              <Label text="Brand is NEVER (pick up to 4)" sub="What the brand should never feel like" />
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:12 }}>
                {ANTI_TONE_SUGGESTIONS.map(w => {
                  const sel2 = (manual.anti_tone_words||[]).includes(w)
                  return <div key={w} onClick={() => sel2?removeToneWord(w,'anti_tone_words'):addToneWord(w,'anti_tone_words')}
                    style={{ padding:'6px 14px', borderRadius:100, cursor:'pointer', fontSize:12, fontWeight:600, background:sel2?'#EF4444':'#F5F5F7', color:sel2?'#fff':'var(--text-muted)', border:`1.5px solid ${sel2?'#EF4444':'transparent'}`, transition:'all 0.15s' }}>{w}</div>
                })}
              </div>
              {(manual.anti_tone_words||[]).length>0 && <Tags items={manual.anti_tone_words||[]} color="#EF4444" onRemove={w=>removeToneWord(w,'anti_tone_words')} />}
            </div>

            <div><Label text="Brand Voice Notes" sub="How the brand speaks — rules for copy" /><textarea style={{...inp,resize:'vertical',minHeight:80}} placeholder="e.g. Short punchy sentences. Always second-person (You, Your). Never exclamation marks. Speak like a coach not a salesperson." value={manual.brand_voice_notes||''} onChange={e=>set('brand_voice_notes',e.target.value)} /></div>
          </div>
        )}

        {/* ── STEP 5: AUDIENCE ── */}
        {step === 5 && (
          <div style={{ display:'grid', gap:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <Label text="Age Range" />
                <select style={sel} value={manual.target_age||''} onChange={e=>set('target_age',e.target.value)}>
                  <option value="">Select age range…</option>
                  {AGE_RANGES.map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <Label text="Gender" />
                <select style={sel} value={manual.target_gender||''} onChange={e=>set('target_gender',e.target.value)}>
                  <option value="">Select…</option>
                  {GENDERS.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div><Label text="Interests & Psychographics" sub="What does your audience care about?" /><textarea style={{...inp,resize:'vertical',minHeight:90}} placeholder="e.g. Fitness enthusiasts, sports fans, health-conscious millennials who value performance and style over price" value={manual.target_interests||''} onChange={e=>set('target_interests',e.target.value)} /></div>
            <div>
              <Label text="Target Market / Geography" />
              <select style={sel} value={manual.target_market||''} onChange={e=>set('target_market',e.target.value)}>
                <option value="">Select market…</option>
                {MARKETS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── STEP 6: PLATFORMS ── */}
        {step === 6 && (
          <div style={{ display:'grid', gap:20 }}>
            <div>
              <Label text="Active Platforms" sub="Where does this brand publish content?" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {PLATFORMS.map(p => {
                  const active=(manual.active_platforms||[]).includes(p)
                  return <div key={p} onClick={()=>togglePlatform(p)}
                    style={{ padding:'14px 16px', borderRadius:14, cursor:'pointer', border:`2px solid ${active?'var(--accent)':'var(--border-default)'}`, background:active?'var(--accent-subtle)':'#fff', transition:'all 0.2s', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:22 }}>{PLATFORM_EMOJI[p]}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:active?'var(--accent)':'var(--text-primary)', textTransform:'capitalize' }}>{p}</div>
                      {active && <div style={{ fontSize:10, color:'var(--accent)', fontWeight:500 }}>✓ Active</div>}
                    </div>
                  </div>
                })}
              </div>
            </div>
            <div><Label text="Platform-specific notes" /><textarea style={{...inp,resize:'vertical',minHeight:80}} placeholder="e.g. Instagram: always Reels format. LinkedIn: more formal copy, no emojis. Twitter: max 2 hashtags." value={manual.platform_notes||''} onChange={e=>set('platform_notes',e.target.value)} /></div>
          </div>
        )}

        {/* ── STEP 7: DOS & DON'TS ── */}
        {step === 7 && (
          <div style={{ display:'grid', gap:18 }}>
            <div>
              <Label text="✅ Always Do" sub="Rules for what must always appear in creatives" />
              <textarea style={{...inp,resize:'vertical',minHeight:130,borderColor:'#A7F3D0'}}
                placeholder="• Always include the logo in bottom right&#10;• Always use brand primary colour for CTA buttons&#10;• Always show product in real-life context&#10;• Always include a clear call to action&#10;• Always maintain minimum logo clear space" value={manual.dos||''} onChange={e=>set('dos',e.target.value)} />
            </div>
            <div>
              <Label text="❌ Never Do" sub="Rules for what must never appear" />
              <textarea style={{...inp,resize:'vertical',minHeight:130,borderColor:'#FECACA'}}
                placeholder="• Never use gradients on the logo&#10;• Never use serif fonts&#10;• Never show competitors' products&#10;• Never use stock photography&#10;• Never use all-caps for body text" value={manual.donts||''} onChange={e=>set('donts',e.target.value)} />
            </div>
            <div><Label text="Main Competitors" sub="Brands we must never look like" /><input style={inp} placeholder="e.g. Adidas India, Puma India, Reebok" value={manual.competitors||''} onChange={e=>set('competitors',e.target.value)} /></div>
          </div>
        )}

        {/* ── STEP 8: SOCIAL LINKS ── */}
        {step === 8 && (
          <div style={{ display:'grid', gap:14 }}>
            {[
              { platform:'Instagram', field:'instagram_url' as keyof Manual, emoji:'📸', placeholder:'https://instagram.com/brand' },
              { platform:'LinkedIn',  field:'linkedin_url'  as keyof Manual, emoji:'💼', placeholder:'https://linkedin.com/company/brand' },
              { platform:'Twitter/X', field:'twitter_url'   as keyof Manual, emoji:'🐦', placeholder:'https://x.com/brand' },
              { platform:'YouTube',   field:'youtube_url'   as keyof Manual, emoji:'▶️', placeholder:'https://youtube.com/@brand' },
              { platform:'Facebook',  field:'facebook_url'  as keyof Manual, emoji:'👥', placeholder:'https://facebook.com/brand' },
            ].map(s => (
              <div key={s.field as string} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:'#F5F5F7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{s.emoji}</div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>{s.platform}</label>
                  <input style={inp} placeholder={s.placeholder} value={(manual[s.field] as string)||''} onChange={e=>set(s.field,e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 9: LOGO & REFERENCES ── */}
        {step === 9 && (
          <div style={{ display:'grid', gap:24 }}>
            <div>
              <Label text="Brand Logo" sub="AI checks if logo appears in creatives and is correctly placed" />
              {manual.logo_url ? (
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <img src={manual.logo_url} alt="Logo" style={{ height:60, maxWidth:200, objectFit:'contain', background:'#F5F5F7', padding:8, borderRadius:10, border:'1px solid var(--border-subtle)' }} />
                  <button onClick={()=>set('logo_url','')} style={{ padding:'6px 14px', borderRadius:100, background:'#FEE2E2', color:'#EF4444', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)' }}>Remove</button>
                </div>
              ) : (
                <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'22px', border:'2px dashed var(--border-default)', borderRadius:12, cursor:'pointer', background:'#FAFAFA', transition:'all 0.2s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLLabelElement).style.borderColor='var(--accent)';(e.currentTarget as HTMLLabelElement).style.background='var(--accent-subtle)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLLabelElement).style.borderColor='var(--border-default)';(e.currentTarget as HTMLLabelElement).style.background='#FAFAFA'}}
                >
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&uploadAsset(e.target.files[0],'logo')} />
                  <Upload size={18} color="var(--text-muted)" />
                  <span style={{ fontSize:13, fontWeight:500, color:'var(--text-muted)' }}>{uploading?'Uploading…':'Upload logo (PNG with transparency preferred)'}</span>
                </label>
              )}
            </div>
            <div>
              <Label text="Reference Creatives (3-5)" sub="Your best work — AI uses these as the visual benchmark when critiquing new creatives" />
              {(manual.reference_urls||[]).length>0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:10, marginBottom:12 }}>
                  {(manual.reference_urls||[]).map((url,i) => (
                    <div key={url} style={{ position:'relative', borderRadius:10, overflow:'hidden', border:'1px solid var(--border-subtle)', aspectRatio:'1' }}>
                      <img src={url} alt={`Ref ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      <button onClick={()=>set('reference_urls',(manual.reference_urls||[]).filter(u=>u!==url))}
                        style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(manual.reference_urls||[]).length<5 && (
                <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'18px', border:'2px dashed var(--border-default)', borderRadius:12, cursor:'pointer', background:'#FAFAFA', transition:'all 0.2s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLLabelElement).style.borderColor='var(--accent)';(e.currentTarget as HTMLLabelElement).style.background='var(--accent-subtle)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLLabelElement).style.borderColor='var(--border-default)';(e.currentTarget as HTMLLabelElement).style.background='#FAFAFA'}}
                >
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&uploadAsset(e.target.files[0],'reference')} />
                  <Upload size={16} color="var(--text-muted)" />
                  <span style={{ fontSize:13, fontWeight:500, color:'var(--text-muted)' }}>{uploading?'Uploading…':`Add reference creative (${(manual.reference_urls||[]).length}/5)`}</span>
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
        <button onClick={() => { save(); if(step>0) setStep(step-1) }} disabled={step===0}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:100, background:step===0?'#F5F5F7':'#fff', color:step===0?'var(--text-disabled)':'var(--text-secondary)', border:'1px solid var(--border-default)', fontSize:13, fontWeight:500, cursor:step===0?'not-allowed':'pointer', fontFamily:'var(--font-body)' }}>
          <ArrowLeft size={14} /> Previous
        </button>
        {step < STEPS.length-1 ? (
          <button onClick={() => { save(); setStep(step+1) }}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 24px', borderRadius:100, background:'var(--accent)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', boxShadow:'0 4px 12px rgba(124,58,237,0.3)' }}>
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={() => save(manual, true)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 24px', borderRadius:100, background:'#10B981', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-body)', boxShadow:'0 4px 12px rgba(16,185,129,0.3)' }}>
            <Check size={16} /> Complete Brand Manual
          </button>
        )}
      </div>
    </div>
  )
}
