'use client'
import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import type { ViewName } from '@/app/dashboard/page'
import NewCampaignModal from '@/components/ui/NewCampaignModal'
import NotificationBell from '@/components/ui/NotificationBell'

type Props = {
  title: string; accentWord: string; sub: string
  activeBrand: { id: string; name: string; color: string }
  activeView: ViewName; user: any; userId: string
}

export default function Topbar({ title, accentWord, sub, activeBrand, activeView, user, userId }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const btnLabel: Record<ViewName, string> = {
    tasks: 'New Task', calendar: 'Add Post', briefs: 'New Brief',
    performance: 'Log Campaign', approvals: 'New Approval',
    dev: 'New Task', time: 'Start Timer', admin: '', brands: 'Add Brand',
  }

  return (
    <>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--border-subtle)', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {title} <span style={{ color: 'var(--accent)' }}>{accentWord}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {activeBrand.name !== 'All Brands' ? `${activeBrand.name} · ` : ''}{sub}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {btnLabel[activeView] && (
            <button onClick={() => setModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)' }}>
              <Plus size={14} strokeWidth={2.5} />{btnLabel[activeView]}
            </button>
          )}
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', fontFamily: 'var(--font-body)' }}>
            <RefreshCw size={13} />Sync Drive
          </button>
          {userId && <NotificationBell userId={userId} />}
        </div>
      </header>
      <NewCampaignModal open={modalOpen} onClose={() => setModalOpen(false)} view={activeView} />
    </>
  )
}
