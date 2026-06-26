import type { RequestStatus } from '../../features/credit-payment-term/types/request'
import { getStatusConfig } from '../../features/credit-payment-term/utils/status'

interface Props {
  status: RequestStatus
  size?: 'sm' | 'md'
  /** Second line under the label, e.g. "By Lalin A." — matches the approved-
   * status example in the actual draft of this module (Exzy_WorkX 1765:5235). */
  subtitle?: string
}

// Bare icon + plain gray text, no background — matches the real draft of this
// module's status column exactly (Exzy_WorkX node 1765:5235): only the icon
// carries the status color, the label is always #505050.
export function StatusBadge({ status, size = 'md', subtitle }: Props) {
  const cfg = getStatusConfig(status)
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <Icon size={size === 'sm' ? 13 : 14} color={cfg.iconColor} style={{ flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: size === 'sm' ? 12 : 13, fontWeight: 400, color: '#505050' }}>{cfg.label}</span>
        {subtitle && <span style={{ fontSize: 11, color: '#929EB4' }}>{subtitle}</span>}
      </span>
    </span>
  )
}
