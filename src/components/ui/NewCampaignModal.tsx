'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, type Brand } from '@/lib/supabase'
import type { ViewName } from '@/app/dashboard/page'

type Props = { open: boolean; onClose: () => void; view: ViewName }

export default function NewCampaignModal({ open, onClose, view }: Props) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [title, setTitle] = useState('')
  const [brandId, setBrandId] = useState('')
  const [team, setTeam] = useState('creative')
  const [dueDate, setDueDate] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('brands').select('*').then(({ data }) => { if (data) setBrands(data) })
  }, [])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const table = view === 'dev' ? 'dev_tasks' : view === 'briefs' ? 'briefs' : view === 'calendar' ? 'social_posts' : 'campaigns'
    await supabase.from(table as any).insert({
      title, brand_id: brandId || null,
      ...(view === 'campaigns' && { team, due_date: dueDate || null, drive_folder_url: driveUrl || null, description: description || null }),
      ...(view === 'briefs' && { team, due_date: dueDate || null, drive_file_url: driveUrl || null, description: description || null }),
      ...(view === 'dev' && { task_type: team, due_date: dueDate || null, sprint_name: description || null }),
    })
    setSaving(false)
    setTitle(''); setBrandId(''); setDriveUrl(''); setDescription(''); setDueDate('')
    onClose()
  }

  if (!open) return null

  const labels: Record<ViewName, string> = {
    campaigns: 'New Campaign', calendar: 'New Social Post',
    briefs: 'New Brief', performance: 'Log Campaign',
    approvals: 'New Approval', dev: 'New Dev Task',
  }

  const i: React.CSSProperties = {
    background:'var(--bg-elevated)', border:'0.5px solid var(--border-default)',
    borderRadius:'var(--radius-sm)', padding:'9px 12px', fontSize:13,
    color:'var(--text-primary)', fontFamily:'var(--font-body)',
    outline:'none', width:'100%',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(6,5,15,0.85)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'var(--bg-surface)', border:'0.5px solid var(--border-default)', borderRadius:'var(--radius-lg)', padding:28, width:480, maxWidth:'90vw', boxShadow:'0 40px 80px rgba(0,0,0,0.6), 0 0 60px var(--accent-glow)', position:'relative' }} onClick={e => e.stopPropagation()}>

        <div style={{ fontFamily:'var(--font-display)', fontSize:22, letterSpacing:'0.05em', marginBottom:20, color:'var(--text-primary)' }}>
          {labels[view].split(' ')[0]} <span style={{color:'var(--accent-bright)'}}>{labels[view].split(' ').slice(1).join(' ')}</span>
        </div>

        <button onClick={onClose} style={{ position:'absolute', top:18, right:18, background:'var(--bg-elevated)', border:'0.5px solid var(--border-subtle)', borderRadius:6, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)' }}>
          <X size={14} />
        </button>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Title *</label>
            <input style={i} placeholder="e.g. Summer Campaign" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Brand</label>
            <select style={i} value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="">All / None</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Team</label>
            <select style={i} value={team} onChange={e => setTeam(e.target.value)}>
              <option value="creative">Creative Team</option>
              <option value="performance">Performance Marketing</option>
              <option value="content">Content Writers</option>
              <option value="social">Social Media</option>
              <option value="account_managers">Account Managers</option>
              <option value="tech">Tech Team</option>
            </select>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Due Date</label>
            <input style={i} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
          <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Description / Notes</label>
          <textarea style={{...i, resize:'vertical', minHeight:72}} placeholder="Objective, deliverables, references..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:20 }}>
          <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Google Drive Folder URL</label>
          <input style={i} placeholder="Paste Drive link — files will auto-link" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} />
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 18px', borderRadius:100, background:'transparent', color:'var(--text-secondary)', border:'0.5px solid var(--border-default)', fontSize:12, fontWeight:600, fontFamily:'var(--font-body)', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ padding:'8px 22px', borderRadius:100, background: saving ? 'var(--accent-dim)' : 'var(--accent)', color:'#fff', border:'none', fontSize:12, fontWeight:600, fontFamily:'var(--font-body)', letterSpacing:'0.06em', textTransform:'uppercase', cursor: saving ? 'not-allowed' : 'pointer', boxShadow:'0 8px 24px var(--accent-glow)' }}>
            {saving ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
