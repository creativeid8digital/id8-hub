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
  const [team, setTeam] = useState('creative_team')
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
    const table = view === 'dev' ? 'dev_tasks' : view === 'briefs' ? 'briefs' : view === 'approvals' ? 'approvals' : 'tasks'
    await supabase.from(table as any).insert({
      title, brand_id: brandId || null,
      ...(view === 'tasks'     && { assigned_team: team, due_date: dueDate || null, drive_file_url: driveUrl || null, description: description || null, status: 'brief', priority: 'medium' }),
      ...(view === 'briefs'    && { team, due_date: dueDate || null, drive_file_url: driveUrl || null, description: description || null, status: 'not_started' }),
      ...(view === 'approvals' && { notes: description || null, drive_file_url: driveUrl || null, current_stage: 'creative', creative_approved: false, am_approved: false, client_approved: false }),
      ...(view === 'dev'       && { task_type: team, due_date: dueDate || null, sprint_name: description || null }),
    })
    setSaving(false)
    setTitle(''); setBrandId(''); setDriveUrl(''); setDescription(''); setDueDate('')
    onClose()
  }

  if (!open) return null

  const labels: Record<ViewName, string> = {
    tasks: 'New Task', calendar: 'New Social Post', briefs: 'New Brief',
    performance: 'Log Campaign', approvals: 'New Approval', dev: 'New Dev Task',
    time: 'Log Time', admin: '', brands: 'Add Brand',
  }

  const i: React.CSSProperties = {
    background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#1D1D1F',
    fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:24, padding:28, width:480, maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.15)', position:'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:20, color:'var(--text-primary)' }}>
          {(labels[view] || '').split(' ')[0]} <span style={{color:'var(--accent)'}}>{(labels[view] || '').split(' ').slice(1).join(' ')}</span>
        </div>
        <button onClick={onClose} style={{ position:'absolute', top:18, right:18, background:'#F5F5F7', border:'1px solid var(--border-subtle)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)' }}>
          <X size={14} />
        </button>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Title *</label>
            <input style={i} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Brand</label>
            <select style={i} value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="">No Brand</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Description</label>
          <textarea style={{...i, resize:'vertical', minHeight:72}} placeholder="Details..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:20 }}>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Google Drive URL</label>
          <input style={i} placeholder="Paste Drive link" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:100, background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border-default)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'var(--font-body)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ padding:'9px 22px', borderRadius:100, background: saving ? '#C4B5FD' : 'var(--accent)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'var(--font-body)', boxShadow:'0 4px 12px rgba(124,58,237,0.3)' }}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
