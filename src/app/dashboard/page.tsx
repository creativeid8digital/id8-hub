'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TaskPipeline from '@/components/views/TaskPipeline'
import SocialCalendar from '@/components/views/SocialCalendar'
import BriefHub from '@/components/views/BriefHub'
import PerformanceTracker from '@/components/views/PerformanceTracker'
import ApprovalsView from '@/components/views/ApprovalsView'
import DevBoard from '@/components/views/DevBoard'
import AdminPanel from '@/components/views/AdminPanel'
import BrandManager from '@/components/views/BrandManager'
import MyTasks from '@/components/views/MyTasks'
import SearchView from '@/components/views/SearchView'
import NewJobModal from '@/components/ui/NewJobModal'
import NotificationBell from '@/components/ui/NotificationBell'
import { Plus, RefreshCw, Search } from 'lucide-react'

export type ViewName = 'tasks' | 'myjobs' | 'calendar' | 'briefs' | 'performance' | 'approvals' | 'dev' | 'admin' | 'brands' | 'search'
export type Brand = { id: string; name: string; color: string; drive_folder_url: string | null; created_at: string }

// Role-based default home screen
const ROLE_HOME: Record<string, ViewName> = {
  am:              'tasks',
  creative_head:   'approvals',
  creative_team:   'myjobs',
  content_writer:  'myjobs',
  publishing_team: 'calendar',
  performance:     'performance',
  tech:            'dev',
}

const VIEW_META: Record<ViewName, { title: string; accent: string; sub: string }> = {
  tasks:       { title: 'Task',          accent: 'Pipeline',  sub: 'All jobs across brands — click any card to open' },
  myjobs:      { title: 'My',            accent: 'Tasks',     sub: 'Tasks assigned to you'                           },
  calendar:    { title: 'Social',        accent: 'Calendar',  sub: 'Plan and publish monthly content'                },
  briefs:      { title: 'Brief',         accent: 'Hub',       sub: 'All job briefs — read and reference'             },
  performance: { title: 'Performance',   accent: 'Tracker',   sub: 'Ad spend, ROAS and campaign metrics'            },
  approvals:   { title: 'Approvals &',   accent: 'Handoff',   sub: 'Creative Head → AM → Client'                    },
  dev:         { title: 'Dev',           accent: 'Board',     sub: 'Sprint board for the tech team'                  },
  admin:       { title: 'Admin',         accent: 'Panel',     sub: 'Team management, roles and time reports'         },
  brands:      { title: 'Brand',         accent: 'Manager',   sub: 'Client brands and documents'                     },
  search:      { title: 'Search',        accent: '',          sub: 'Find tasks, briefs and approvals'                },
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeView, setActiveView] = useState<ViewName>('tasks')
  const [activeBrand, setActiveBrand] = useState<Brand>({ id: '', name: 'All Brands', color: '#7c3aed', drive_folder_url: null, created_at: '' })
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [agencyRole, setAgencyRole] = useState<string | null>(null)
  const [showNewJob, setShowNewJob] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated') {
      fetch('/api/user/onboarding').then(r => r.json()).then(data => {
        if (!data.onboarding_complete) { router.push('/onboarding'); return }
        setIsAdmin(data.is_admin || false)
        setAgencyRole(data.agency_role || null)
        // Set role-based home screen
        const home = ROLE_HOME[data.agency_role] || 'tasks'
        setActiveView(home)
        setChecking(false)
      }).catch(() => setChecking(false))
    }
  }, [status, router])

  const onJobCreated = useCallback(() => {
    setRefreshKey(k => k + 1)
    setActiveView('tasks')
  }, [])

  if (status === 'loading' || checking) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #7C3AED, #9F67F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>ID8</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading your workspace…</div>
      </div>
    </div>
  )

  const view = VIEW_META[activeView]
  const userEmail = session!.user?.email || ''
  const userId    = (session!.user as any)?.id || ''
  const isAM      = agencyRole === 'am'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        activeBrand={activeBrand}
        onBrandChange={setActiveBrand}
        user={session!.user}
        isAdmin={isAdmin}
        agencyRole={agencyRole}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid var(--border-subtle)', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {view.title} {view.accent && <span style={{ color: 'var(--accent)' }}>{view.accent}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {activeBrand.name !== 'All Brands' ? `${activeBrand.name} · ` : ''}{view.sub}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Search button */}
            <button onClick={() => setActiveView('search')}
              style={{ width: 36, height: 36, borderRadius: 10, background: activeView === 'search' ? 'var(--accent-subtle)' : '#F5F5F7', border: `1px solid ${activeView === 'search' ? 'var(--accent)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
              <Search size={15} color={activeView === 'search' ? 'var(--accent)' : 'var(--text-muted)'} />
            </button>

            {/* Notification bell */}
            {userId && <NotificationBell userId={userId} />}

            {/* New Job button — AMs only */}
            {(isAM || isAdmin) && (
              <button onClick={() => setShowNewJob(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 100, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.35)', fontFamily: 'var(--font-body)', transition: 'all 0.2s', letterSpacing: '0.02em' }}>
                <Plus size={15} strokeWidth={2.5} /> New Job
              </button>
            )}
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: 'var(--bg-base)' }}>
          {activeView === 'tasks'       && <TaskPipeline      key={refreshKey} brandId={activeBrand.id} userEmail={userEmail} />}
          {activeView === 'myjobs'      && <MyTasks           userEmail={userEmail} onOpenTask={(id) => { setActiveView('tasks') }} />}
          {activeView === 'calendar'    && <SocialCalendar    brandId={activeBrand.id} />}
          {activeView === 'briefs'      && <BriefHub          brandId={activeBrand.id} />}
          {activeView === 'performance' && <PerformanceTracker brandId={activeBrand.id} />}
          {activeView === 'approvals'   && <ApprovalsView     brandId={activeBrand.id} />}
          {activeView === 'dev'         && <DevBoard          brandId={activeBrand.id} />}
          {activeView === 'admin'       && isAdmin && <AdminPanel />}
          {activeView === 'brands'      && <BrandManager />}
          {activeView === 'search'      && <SearchView        onOpenTask={(id) => setActiveView('tasks')} />}
        </main>
      </div>

      {/* New Job Modal */}
      <NewJobModal
        open={showNewJob}
        onClose={() => setShowNewJob(false)}
        onCreated={onJobCreated}
      />
    </div>
  )
}
