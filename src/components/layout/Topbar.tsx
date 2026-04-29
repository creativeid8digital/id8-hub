'use client'
import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import type { ViewName } from '@/app/dashboard/page'
import NewCampaignModal from '@/components/ui/NewCampaignModal'

type Props = {
  title: string; accentWord: string; sub: string
  activeBrand: { id: string; name: string; color: string }
  activeView: ViewName; user: any
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
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {title} <span style={{ color: 'var(--accent)' }}>{accentWord}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {activeBrand.name !== 'All Brands' ? `${activeBrand.name} · ` : ''}{sub}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setModalOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 'var(--radius-pill)',
            background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--bg-base)'; el.style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.borderColor = 'var(--border-default)' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            {btnLabel[activeView]}
          </button>

          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 'var(--radius-pill)',
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 6px 18px rgba(124,58,237,0.4)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'none'; el.style.boxShadow = '0 4px 12px rgba(124,58,237,0.3)' }}
          >
            <RefreshCw size={13} />
            Sync Drive
          </button>
        </div>
      </header>

      <NewCampaignModal open={modalOpen} onClose={() => setModalOpen(false)} view={activeView} />
    </>
  )
}
