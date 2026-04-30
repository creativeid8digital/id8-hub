'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, ExternalLink, Folder } from 'lucide-react'

type Brand = {
  id: string; name: string; color: string
  drive_folder_url: string | null; created_at: string
}

const PRESET_COLORS = [
  '#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444',
  '#EC4899','#06B6D4','#8B5CF6','#F97316','#14B8A6',
]

const inputStyle: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
  padding: '10px 14px', fontSize: 13, color: '#1D1D1F',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%', transition: 'all 0.15s',
}

export default function BrandManager() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', color: '#7C3AED', drive_folder_url: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('brands').select('*').order('created_at', { ascending: true })
    if (error) console.error('Load brands error:', error)
    setBrands((data as Brand[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        const { error } = await supabase.from('brands')
          .update({ name: form.name.trim(), color: form.color, drive_folder_url: form.drive_folder_url || null })
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('brands')
          .insert({ name: form.name.trim(), color: form.color, drive_folder_url: form.drive_folder_url || null })
        if (error) throw error
      }
      setForm({ name: '', color: '#7C3AED', drive_folder_url: '' })
      setEditingId(null)
      setShowCreate(false)
      await load()
    } catch (err: any) {
      console.error('Save brand error:', err)
      setError(err?.message || 'Failed to save. Check Supabase RLS policies.')
    }
    setSaving(false)
  }

  const startEdit = (b: Brand) => {
    setForm({ name: b.name, color: b.color, drive_folder_url: b.drive_folder_url || '' })
    setEditingId(b.id)
    setShowCreate(true)
    setError(null)
  }

  const deleteBrand = async (id: string) => {
    if (!confirm('Delete this brand? Tasks and briefs linked to it will be unlinked.')) return
    setDeleting(id)
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) alert('Delete failed: ' + error.message)
    await load()
    setDeleting(null)
  }

  const cancel = () => {
    setShowCreate(false); setEditingId(null)
    setForm({ name: '', color: '#7C3AED', drive_folder_url: '' })
    setError(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Brand Manager</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Add and manage your client brands</div>
        </div>
        {!showCreate && (
          <button onClick={() => { setShowCreate(true); setError(null) }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', fontFamily: 'var(--font-body)' }}>
            <Plus size={15} strokeWidth={2.5} /> Add Brand
          </button>
        )}
      </div>

      {/* Form */}
      {showCreate && (
        <div style={{ background: '#fff', border: '1.5px solid var(--accent)', borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: '0 4px 24px rgba(124,58,237,0.10)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>
            {editingId ? 'Edit Brand' : 'New Brand'}
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#EF4444', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand Name *</label>
              <input style={inputStyle} placeholder="e.g. Nike India" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = '#fff' }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E5EA'; (e.target as HTMLInputElement).style.background = '#F5F5F7' }}
                onKeyDown={e => { if (e.key === 'Enter') save() }}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Google Drive Folder (optional)</label>
              <input style={inputStyle} placeholder="Paste Drive folder URL"
                value={form.drive_folder_url} onChange={e => setForm({ ...form, drive_folder_url: e.target.value })}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = '#fff' }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E5EA'; (e.target as HTMLInputElement).style.background = '#F5F5F7' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Brand Colour</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <div key={c} onClick={() => setForm({ ...form, color: c })}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? `3px solid #1D1D1F` : '3px solid transparent', boxShadow: form.color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none', transition: 'all 0.15s', flexShrink: 0 }} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
              <div style={{ padding: '5px 12px', borderRadius: 100, background: `${form.color}18`, border: `1.5px solid ${form.color}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: form.color }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: form.color }}>Preview</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={cancel}
              style={{ padding: '9px 18px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving || !form.name.trim()}
              style={{ padding: '9px 24px', borderRadius: 100, background: saving ? '#C4B5FD' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
              {saving ? 'Saving…' : editingId ? 'Update Brand' : 'Create Brand'}
            </button>
          </div>
        </div>
      )}

      {/* Brand cards */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading brands…</div>
      ) : brands.length === 0 && !showCreate ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '1.5px dashed var(--border-default)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No brands yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Add your first client brand to get started.</div>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '10px 22px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Add First Brand
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {brands.map(b => (
            <div key={b.id}
              style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; el.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; el.style.transform = 'none' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: b.color, borderRadius: '18px 18px 0 0' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${b.color}18`, border: `2px solid ${b.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: b.color }}>{b.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Added {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startEdit(b)}
                    style={{ width: 30, height: 30, borderRadius: 8, background: '#F5F5F7', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-light)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F7'}
                  >
                    <Edit2 size={13} color="var(--text-muted)" />
                  </button>
                  <button onClick={() => deleteBrand(b.id)} disabled={deleting === b.id}
                    style={{ width: 30, height: 30, borderRadius: 8, background: '#F5F5F7', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F7'}
                  >
                    <Trash2 size={13} color={deleting === b.id ? '#EF4444' : 'var(--text-muted)'} />
                  </button>
                </div>
              </div>

              {b.drive_folder_url && (
                <a href={b.drive_folder_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 14, fontSize: 12, color: '#3B82F6', fontWeight: 500, textDecoration: 'none', padding: '5px 10px', background: '#EFF6FF', borderRadius: 8 }}>
                  <Folder size={12} /> Open Drive Folder
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
