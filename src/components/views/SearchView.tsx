'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, FileText, ListTodo, CheckCircle, ChevronRight } from 'lucide-react'

type Result = { id: string; title: string; type: 'task' | 'brief' | 'approval'; status: string; brand?: string }

export default function SearchView({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true); setSearched(true)
    const term = `%${q}%`
    const [{ data: tasks }, { data: briefs }, { data: approvals }] = await Promise.all([
      supabase.from('tasks').select('id, title, status, brands(name)').ilike('title', term).limit(10),
      supabase.from('briefs').select('id, title, status, brands(name)').ilike('title', term).limit(10),
      supabase.from('approvals').select('id, title, current_stage, brands(name)').ilike('title', term).limit(10),
    ])
    const all: Result[] = [
      ...(tasks || []).map((t: any) => ({ id: t.id, title: t.title, type: 'task' as const, status: t.status, brand: t.brands?.name })),
      ...(briefs || []).map((b: any) => ({ id: b.id, title: b.title, type: 'brief' as const, status: b.status, brand: b.brands?.name })),
      ...(approvals || []).map((a: any) => ({ id: a.id, title: a.title, type: 'approval' as const, status: a.current_stage, brand: a.brands?.name })),
    ]
    setResults(all); setLoading(false)
  }, [])

  const TYPE_ICON = { task: <ListTodo size={14} color="#7C3AED" />, brief: <FileText size={14} color="#3B82F6" />, approval: <CheckCircle size={14} color="#10B981" /> }
  const TYPE_LABEL = { task: 'Task', brief: 'Brief', approval: 'Approval' }
  const TYPE_COLOR = { task: { color: '#7C3AED', bg: '#EDE9FE' }, brief: { color: '#3B82F6', bg: '#EFF6FF' }, approval: { color: '#10B981', bg: '#ECFDF5' } }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Search</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Search across tasks, briefs and approvals</div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={query} autoFocus
          onChange={e => { setQuery(e.target.value); search(e.target.value) }}
          placeholder="Search tasks, briefs, approvals…"
          style={{ width: '100%', padding: '13px 16px 13px 42px', fontSize: 15, fontFamily: 'var(--font-body)', background: '#fff', border: '1.5px solid var(--border-default)', borderRadius: 14, outline: 'none', color: 'var(--text-primary)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'border-color 0.15s' }}
          onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'}
          onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'}
        />
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Searching…</div>}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: 20, border: '1.5px dashed var(--border-default)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No results for "{query}"</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try a different search term.</div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{results.length} result{results.length > 1 ? 's' : ''}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {results.map(r => {
              const tc = TYPE_COLOR[r.type]
              return (
                <div key={r.id} onClick={() => r.type === 'task' ? onOpenTask(r.id) : null}
                  style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: r.type === 'task' ? 'pointer' : 'default', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; el.style.borderColor = 'var(--border-default)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; el.style.borderColor = 'var(--border-subtle)' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {TYPE_ICON[r.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {r.brand && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{r.brand}</div>}
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: tc.bg, color: tc.color }}>{TYPE_LABEL[r.type]}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.status?.replace('_', ' ')}</span>
                    {r.type === 'task' && <ChevronRight size={14} color="var(--text-muted)" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!searched && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 8 }}>
          {[
            { icon: <ListTodo size={20} color="#7C3AED" />, label: 'Tasks', desc: 'Find tasks by title', color: '#7C3AED', bg: '#EDE9FE' },
            { icon: <FileText size={20} color="#3B82F6" />, label: 'Briefs', desc: 'Search all briefs', color: '#3B82F6', bg: '#EFF6FF' },
            { icon: <CheckCircle size={20} color="#10B981" />, label: 'Approvals', desc: 'Find approvals', color: '#10B981', bg: '#ECFDF5' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '18px 16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
