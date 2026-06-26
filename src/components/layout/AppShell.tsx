import { Outlet, Link } from 'react-router-dom'
import { ChevronIcon } from '../icons/FigmaIcons'
import { RoleSwitcher } from './RoleSwitcher'
import { useCurrentUser } from '../../app/UserContext'
import workxLogo from '../../assets/navbar/workx-logo.png'
import avatarPlaceholder from '../../assets/navbar/avatar-placeholder.png'
import tabTravelExpense from '../../assets/navbar/tab-travel-expense.png'
import tabTransportRequest from '../../assets/navbar/tab-transport-request.png'
import tabPurchaseRequest from '../../assets/navbar/tab-purchase-request.png'
import tabBoq from '../../assets/navbar/tab-boq.png'
import tabInternalMemo from '../../assets/navbar/tab-internal-memo.png'
import tabPaymentCreditTerm from '../../assets/navbar/tab-payment-credit-term.png'

// The other WorkX modules as they appear in the host's TopMenuBar (Figma node
// 1317:2565) — shown inert here since this app only owns the Payment & Credit
// Term route, but kept so the module switcher matches the host pixel-for-pixel
// once this module is embedded in the main platform.
const OTHER_MODULES = [
  { icon: tabTravelExpense, label: 'ใบเบิกค่าเดินทาง' },
  { icon: tabTransportRequest, label: 'ขอใช้บริการขนส่ง' },
  { icon: tabPurchaseRequest, label: 'ใบขอซื้อ PR' },
  { icon: tabBoq, label: 'BOQ' },
  { icon: tabInternalMemo, label: 'Internal Memo' },
]

function ModuleTab({ icon, label, active, to }: { icon: string; label: string; active?: boolean; to?: string }) {
  const tab = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 10px',
      borderRadius: 10,
      background: active ? 'rgba(102,197,197,0.1)' : 'transparent',
      border: `1px solid ${active ? '#66C5C5' : 'transparent'}`,
      cursor: to ? 'pointer' : 'default',
      whiteSpace: 'nowrap' as const,
    }}>
      <img src={icon} alt="" width={24} height={24} style={{ flexShrink: 0 }} />
      <span style={{ fontWeight: 500, fontSize: 13, color: active ? '#004081' : '#586782' }}>{label}</span>
    </div>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{tab}</Link> : tab
}

export function AppShell() {
  const { currentUser } = useCurrentUser()

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA' }}>
      {/* Host chrome — same composition as the WorkX TopMenuBar (Figma node
          1371:11120 / 1317:2565: logo+profile row, then a CENTERED module
          switcher row below) but scaled down ~60% from Figma's literal 1920px-
          canvas sizing, which read oversized at normal app viewport widths. */}
      <header className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#FFFFFF' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          boxShadow: '0 4px 15px rgba(0,64,129,0.15)',
          boxSizing: 'border-box',
        }}>
          <img src={workxLogo} alt="WorkX" style={{ height: 32 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RoleSwitcher />
            <span style={{ fontSize: 12, color: '#586782' }}>{currentUser.name}</span>
            <img src={avatarPlaceholder} alt="" width={22} height={22} style={{ borderRadius: '50%' }} />
            <button
              aria-label="เมนูผู้ใช้"
              style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #D0D6DF', borderRadius: 4, background: 'none', cursor: 'pointer', color: '#586782' }}
            >
              <ChevronIcon direction="down" size={10} />
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 24px',
          borderTop: '1px solid #D0D6DF',
          flexWrap: 'wrap',
        }}>
          {OTHER_MODULES.map(m => <ModuleTab key={m.label} icon={m.icon} label={m.label} />)}
          <ModuleTab icon={tabPaymentCreditTerm} label="Payment & Credit Term" active to="/requests" />
        </div>
      </header>

      {/* Page content */}
      <main style={{ padding: '28px 32px' }}>
        <Outlet />
      </main>
    </div>
  )
}
