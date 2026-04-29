'use client'
import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import type { ViewName } from '@/app/dashboard/page'
import NewCampaignModal from '@/components/ui/NewCampaignModal'

type Props = {
  title: string
  accentWord: string
  sub: string
  activeBrand: { id: string; name: string; color: string }
  activeView: ViewName
  user: any
}

export default function Topbar({ title, accentWord, sub, activeBrand, activeView, user }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const btnLabel: Record<ViewName, string> = {
    campaigns: 'New Campaign', calendar: 'Add Post',
    briefs: 'New Brief', performance: 'Log Campaign',
    approvals: 'New Approval', dev: 'New Task',
  }

  return (
    <>
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '0.5px solid var(--border-subtle)',
        padding: '0 28px', height: 58,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
        position: 'relative',
      }}>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity:0.3 }} />

        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, letterSpacing:'0.06em', color:'var(--text-primary)', lineHeight:1 }}>
            {title} <span style={{ color:'var(--accent-bright)' }}>{accentWord}</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, letterSpacing:'0.04em' }}>
            {activeBrand.name !== 'All Brands' ? `${activeBrand.name} · ` : ''}{sub}
          </div>
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 16px', borderRadius:100,
              background:'transparent', color:'var(--text-secondary)',
              border:'0.5px solid var(--border-default)',
              fontSize:12, fontWeight:600, fontFamily:'var(--font-body)',
              letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer',
            }}
          >
            <Plus size={13} />
            {btnLabel[activeView]}
          </button>
          <button style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'8px 18px', borderRadius:100,
            background:'var(--accent)', color:'#fff', border:'none',
            fontSize:12, fontWeight:600, fontFamily:'var(--font-body)',
            letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer',
            boxShadow:'0 0 0 0 var(--accent-glow)',
          }}>
            <RefreshCw size={12} />
            Sync Drive
          </button>
        </div>
      </header>

      <NewCampaignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        view={activeView}
      />
    </>
  )
}
