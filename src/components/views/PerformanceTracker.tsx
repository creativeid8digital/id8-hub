'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'

type PerfCampaign = {
  id: string; name: string; brand_id: string; platform: string
  spend: number; impressions: number; clicks: number
  ctr: number; cpc: number; roas: number; status: string; month_year: string
  brands?: { name: string; color: string }
}
type Brand = { id: string; name: string; color: string }

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  live:   { bg: '#ECFDF5', color: '#10B981' },
  paused: { bg: '#FFFBEB', color: '#F59E0B' },
  ended:  { bg: '#EDE9FE', color: '#7C3AED' },
  review: { bg: '#FEE2E2', color: '#EF4444' },
}
const PLATFORMS = ['meta','google','youtube','linkedin','twitter','tiktok']

const inputStyle: React.CSSProperties = {
  background: '#F5F5F7', border: '1.5px solid #E5E5EA', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#1D1D1F',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
}

export default function PerformanceTracker({ brandId }: { brandId: string }) {
  const [campaigns, setCampaigns] = useState<PerfCampaign[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [form, setForm] = useState({
    name: '', brand_id: brandId || '', platform: 'meta',
    spend: '', impressions: '', clicks: '', ctr: '', cpc: '', roas: '',
    status: 'live', month_year: new Date().toISOString().slice(0, 7),
  })

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ month: selectedMonth })
    if (brandId) params.set('brand_id', brandId)
    const res = await fetch(`/api/performance?${params}`)
    const data = await res.json()
    setCampaigns(Array.isArray(data) ? data as PerfCampaign[] : [])
    setLoading(false)
  }, [brandId, selectedMonth])

  useEffect(() => {
    load()
    fetch('/api/brands').then(r => r.json()).then(d => { if (Array.isArray(d)) setBrands(d) })
  }, [load])

  const createCampaign = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch('/api/performance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, brand_id: form.brand_id || null, platform: form.platform,
        spend: parseFloat(form.spend) || 0, impressions: parseInt(form.impressions) || 0,
        clicks: parseInt(form.clicks) || 0, ctr: parseFloat(form.ctr) || 0,
        cpc: parseFloat(form.cpc) || 0, roas: parseFloat(form.roas) || 0,
        status: form.status, month_year: form.month_year,
      })
    })
    setSaving(false); setShowCreate(false)
    setForm({ name: '', brand_id: brandId || '', platform: 'meta', spend: '', impressions: '', clicks: '', ctr: '', cpc: '', roas: '', status: 'live', month_year: selectedMonth })
    load()
  }

  const colorForRoas = (v: number) => v >= 4 ? '#10B981' : v >= 2.5 ? '#F59E0B' : '#EF4444'
  const colorForCtr  = (v: number) => v >= 2 ? '#10B981' : v >= 1   ? '#F59E0B' : '#EF4444'

  const totalSpend       = campaigns.reduce((a, c) => a + (c.spend || 0), 0)
  const avgRoas          = campaigns.length ? campaigns.reduce((a, c) => a + (c.roas || 0), 0) / campaigns.length : 0
  const totalImpressions = campaigns.reduce((a, c) => a + (c.impressions || 0), 0)
  const totalClicks      = campaigns.reduce((a, c) => a + (c.clicks || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Performance Tracker</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Ad spend, ROAS and metrics across all brands</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ ...inputStyle, width: 'auto', padding: '8px 12px', fontSize: 12 }} />
          <button onClick={() => setShowCreate(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', fontFamily: 'var(--font-body)' }}>
            <Plus size={15} strokeWidth={2.5} /> Log Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Spend',      value: `₹${(totalSpend/100000).toFixed(1)}L`, color: 'var(--accent)'  },
          { label: 'Avg ROAS',         value: `${avgRoas.toFixed(1)}x`,               color: colorForRoas(avgRoas) },
          { label: 'Total Impressions',value: totalImpressions > 1e6 ? `${(totalImpressions/1e6).toFixed(1)}M` : `${(totalImpressions/1000).toFixed(0)}K`, color: '#3B82F6' },
          { label: 'Total Clicks',     value: totalClicks > 1000 ? `${(totalClicks/1000).toFixed(1)}K` : totalClicks, color: '#10B981' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : campaigns.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No campaigns logged for {selectedMonth}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Log your first ad campaign to start tracking performance.</div>
            <button onClick={() => setShowCreate(true)} style={{ padding: '10px 22px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Log Campaign</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F5F5F7' }}>
                {['Campaign','Brand','Platform','Spend','Impressions','CTR','CPC','ROAS','Status'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const st = STATUS_STYLE[c.status] || STATUS_STYLE.live
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFA'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{(c.brands as any)?.name || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{c.platform}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 500, color: 'var(--text-primary)' }}>₹{(c.spend/100000).toFixed(1)}L</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{(c.impressions/1000000).toFixed(1)}M</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: colorForCtr(c.ctr) }}>{c.ctr}%</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>₹{c.cpc}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: colorForRoas(c.roas) }}>{c.roas}x</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: st.bg, color: st.color }}>{c.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: 540, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Log <span style={{ color: 'var(--accent)' }}>Campaign</span></div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Campaign Name *</label>
                <input style={inputStyle} placeholder="e.g. Nike Summer Run — Meta" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Brand</label>
                  <select style={inputStyle} value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">No Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Platform</label>
                  <select style={inputStyle} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Month</label>
                  <input style={inputStyle} type="month" value={form.month_year} onChange={e => setForm({ ...form, month_year: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Spend (₹)</label>
                  <input style={inputStyle} type="number" placeholder="840000" value={form.spend} onChange={e => setForm({ ...form, spend: e.target.value })} />
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Impressions</label>
                  <input style={inputStyle} type="number" placeholder="4200000" value={form.impressions} onChange={e => setForm({ ...form, impressions: e.target.value })} />
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Clicks</label>
                  <input style={inputStyle} type="number" placeholder="12600" value={form.clicks} onChange={e => setForm({ ...form, clicks: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>CTR (%)</label>
                  <input style={inputStyle} type="number" step="0.01" placeholder="3.8" value={form.ctr} onChange={e => setForm({ ...form, ctr: e.target.value })} />
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>CPC (₹)</label>
                  <input style={inputStyle} type="number" placeholder="22" value={form.cpc} onChange={e => setForm({ ...form, cpc: e.target.value })} />
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>ROAS</label>
                  <input style={inputStyle} type="number" step="0.1" placeholder="6.2" value={form.roas} onChange={e => setForm({ ...form, roas: e.target.value })} />
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '9px 18px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
              <button onClick={createCampaign} disabled={saving || !form.name.trim()} style={{ padding: '9px 24px', borderRadius: 100, background: saving ? '#C4B5FD' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                {saving ? 'Saving…' : 'Log Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
