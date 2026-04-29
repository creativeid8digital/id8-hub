'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import CampaignBoard from '@/components/views/CampaignBoard'
import SocialCalendar from '@/components/views/SocialCalendar'
import BriefHub from '@/components/views/BriefHub'
import PerformanceTracker from '@/components/views/PerformanceTracker'
import ApprovalsView from '@/components/views/ApprovalsView'
import DevBoard from '@/components/views/DevBoard'

export type ViewName = 'campaigns' | 'calendar' | 'briefs' | 'performance' | 'approvals' | 'dev'
export type Brand = { id: string; name: string; color: string; drive_folder_url: string | null; created_at: string }

const VIEWS: Record<ViewName, { title: string; accentWord: string; sub: string }> = {
  campaigns:   { title: 'Campaign',      accentWord: 'Board',    sub: 'All active campaigns across brands' },
  calendar:    { title: 'Social',        accentWord: 'Calendar', sub: 'Monthly content deliverables' },
  briefs:      { title: 'Brief & Asset', accentWord: 'Hub',      sub: 'Files auto-sync to Google Drive' },
  performance: { title: 'Performance',   accentWord: 'Tracker',  sub: 'Live ad metrics across all brands' },
  approvals:   { title: 'Approvals &',   accentWord: 'Handoff',  sub: 'Creative → AM → Client pipeline' },
  dev:         { title: 'Dev',           accentWord: 'Projects', sub: 'Tech team sprint board' },
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeView, setActiveView] = useState<ViewName>('campaigns')
  const [activeBrand, setActiveBrand] = useState<Brand>({ id: '', name: 'All Brands', color: '#7c3aed', drive_folder_url: null, created_at: '' })
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated') {
      // Check onboarding status directly from DB
      fetch('/api/user/onboarding')
        .then(r => r.json())
        .then(data => {
          if (!data.onboarding_complete) {
            router.push('/onboarding')
          } else {
            setChecking(false)
          }
        })
        .catch(() => setChecking(false))
    }
  }, [status, router])

  if (status === 'loading' || checking) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:28, color:'var(--text-muted)', letterSpacing:'0.1em' }}>
          ID<span style={{color:'var(--accent-bright)'}}>8</span> HUB
        </div>
      </div>
    )
  }

  const view = VIEWS[activeView]

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        activeBrand={activeBrand}
        onBrandChange={setActiveBrand}
        user={session!.user}
      />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar
          title={view.title}
          accentWord={view.accentWord}
          sub={view.sub}
          activeBrand={activeBrand}
          activeView={activeView}
          user={session!.user}
        />
        <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
          {activeView === 'campaigns'   && <CampaignBoard    brandId={activeBrand.id} />}
          {activeView === 'calendar'    && <SocialCalendar   brandId={activeBrand.id} />}
          {activeView === 'briefs'      && <BriefHub         brandId={activeBrand.id} />}
          {activeView === 'performance' && <PerformanceTracker brandId={activeBrand.id} />}
          {activeView === 'approvals'   && <ApprovalsView    brandId={activeBrand.id} />}
          {activeView === 'dev'         && <DevBoard         brandId={activeBrand.id} />}
        </main>
      </div>
    </div>
  )
}
