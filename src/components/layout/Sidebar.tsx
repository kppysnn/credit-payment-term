import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Plus } from 'lucide-react'
import { useCurrentUser } from '../../app/UserContext'
import { ROLE_LABELS } from '../../features/credit-payment-term/types/user'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { to: '/requests', icon: <ClipboardList size={16} />, label: 'รายการคำขอ' },
  { to: '/requests/new', icon: <Plus size={16} />, label: 'สร้างคำขอใหม่', roles: ['sales'] },
]

const ROLE_COLORS: Record<string, string> = {
  sales: '#66C5C5',
  approver: '#FFCC00',
  accounting: '#82C566',
}

export function Sidebar() {
  const { currentUser } = useCurrentUser()

  const visibleItems = NAV_ITEMS.filter(
    item => !item.roles || item.roles.includes(currentUser.role),
  )

  return (
    <aside style={{
      width: 260,
      minHeight: '100vh',
      background: '#004081',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Logo area */}
      <div style={{
        height: 72,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid rgba(102,197,197,0.5)',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>CT</span>
          </div>
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, lineHeight: 1.25, fontFamily: 'var(--font-sans)' }}>Credit & Payment</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1, fontFamily: 'var(--font-sans)' }}>Approval System</div>
          </div>
        </div>
      </div>

      {/* Nav section label */}
      <div style={{ padding: '20px 20px 8px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
          เมนู
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ padding: '0 10px', flex: 1 }}>
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 2,
              textDecoration: 'none',
              color: '#FFFFFF',
              background: isActive ? 'rgba(102,197,197,0.15)' : 'transparent',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s, color 0.15s',
              borderLeft: isActive ? '3px solid #66C5C5' : '3px solid transparent',
              boxSizing: 'border-box',
            })}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
            }}
            onMouseLeave={e => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
              e.currentTarget.style.background = isActive ? 'rgba(102,197,197,0.15)' : 'transparent'
            }}
          >
            <span style={{ opacity: 0.9, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{
        padding: '14px 20px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(102,197,197,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#66C5C5',
          }}>
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>
              {currentUser.email}
            </div>
          </div>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 9999,
            background: 'rgba(102,197,197,0.15)',
            color: ROLE_COLORS[currentUser.role] ?? '#66C5C5',
            border: `1px solid ${ROLE_COLORS[currentUser.role] ?? '#66C5C5'}40`,
            flexShrink: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {ROLE_LABELS[currentUser.role]}
          </span>
        </div>
      </div>
    </aside>
  )
}
