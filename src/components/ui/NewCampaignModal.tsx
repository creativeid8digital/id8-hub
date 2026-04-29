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
    tasks: 'New Task', calendar: 'New Social Post',
    briefs: 'New Brief', performance: 'Log Campaign',
    approvals: 'New Approval', dev: 'New Dev Task',
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    borderRadius: 10, padding: '9px 12px', fontSize: 13,
    color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%', transition: 'border-color 0.15s',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:24, padding:28, width:480, maxWidth:'90vw', boxShadow:'var(--shadow-xl)', position:'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:20, color:'var(--text-primary)' }}>
          {labels[view].split(' ')[0]} <span style={{color:'var(--accent)'}}>{labels[view].split(' ').slice(1).join(' ')}</span>
        </div>
        <button onClick={onClose} style={{ position:'absolute', top:18, right:18, background:'var(--bg-base)', border:'1px solid var(--border-subtle)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)' }}>
          <X size={14} />
        </button>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Title *</label>
            <input style={inputStyle} placeholder="e.g. Summer Campaign" value={title} onChange={e => setTitle(e.target.value)} onFocus={e => (e.target as HTMLInputElement).style.borderColor='var(--accent)'} onBlur={e => (e.target as HTMLInputElement).style.borderColor='var(--border-default)'} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Brand</label>
            <select style={inputStyle} value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="">All / None</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Team</label>
            <select style={inputStyle} value={team} onChange={e => setTeam(e.target.value)}>
              <option value="creative">Creative Team</option>
              <option value="performance">Performance Marketing</option>
              <option value="content">Content Writers</option>
              <option value="social">Social Media</option>
              <option value="account_managers">Account Managers</option>
              <option value="tech">Tech Team</option>
            </select>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Due Date</label>
            <input style={inputStyle} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Description</label>
          <textarea style={{...inputStyle, resize:'vertical', minHeight:72}} placeholder="Objective, deliverables, references..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:22 }}>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Google Drive URL</label>
          <input style={inputStyle} placeholder="Paste Drive folder link" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} />
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:100, background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border-default)', fontSize:13, fontWeight:500, fontFamily:'var(--font-body)', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ padding:'9px 22px', borderRadius:100, background: saving ? '#C4B5FD' : 'var(--accent)', color:'#fff', border:'none', fontSize:13, fontWeight:600, fontFamily:'var(--font-body)', cursor: saving ? 'not-allowed' : 'pointer', boxShadow:'0 4px 12px rgba(124,58,237,0.3)' }}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
