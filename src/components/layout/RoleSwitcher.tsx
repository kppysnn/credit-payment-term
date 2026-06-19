import { useCurrentUser } from '../../app/UserContext'
import type { UserRole } from '../../features/credit-payment-term/types/user'
import { ROLE_LABELS } from '../../features/credit-payment-term/types/user'

const ROLES: UserRole[] = ['sales', 'approver', 'accounting']

export function RoleSwitcher() {
  const { currentUser, setRole } = useCurrentUser()

  return (
    <div
      className="no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: 700, color: '#929EB4', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        DEV — Role
      </span>
      <div style={{ display: 'flex', gap: 5 }}>
        {ROLES.map(role => (
          <button
            key={role}
            onClick={() => setRole(role)}
            style={{
              padding: '4px 10px',
              borderRadius: 9999,
              border: '1px solid',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              borderColor: currentUser.role === role ? '#66C5C5' : '#D0D6DF',
              background: currentUser.role === role ? 'rgba(102,197,197,0.12)' : '#FFFFFF',
              color: currentUser.role === role ? '#004081' : '#586782',
            }}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>
    </div>
  )
}
