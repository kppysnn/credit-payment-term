import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { RoleSwitcher } from './RoleSwitcher'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/requests': 'รายการคำขอ',
  '/requests/new': 'สร้างคำขออนุมัติใหม่',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.endsWith('/edit')) return 'แก้ไขคำขอ'
  if (/^\/requests\/[^/]+$/.test(pathname)) return 'รายละเอียดคำขอ'
  return 'Credit & Payment Term'
}

export function AppShell() {
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FA' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header
          className="no-print"
          style={{
            height: 60,
            background: '#FFFFFF',
            borderBottom: '1px solid #D0D6DF',
            boxShadow: '0 1px 2px rgba(0,64,129,0.04)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            gap: 16,
            flexShrink: 0,
            zIndex: 10,
            position: 'sticky',
            top: 0,
          }}
        >
          <h1 style={{
            flex: 1,
            margin: 0,
            fontWeight: 600,
            fontSize: 18,
            color: '#001122',
            letterSpacing: '-0.01em',
          }}>
            {pageTitle}
          </h1>

          <RoleSwitcher />
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
