import type { RequestStatus } from '../../features/credit-payment-term/types/request'
import { getStatusConfig } from '../../features/credit-payment-term/utils/status'

interface Props {
  status: RequestStatus
  size?: 'sm' | 'md'
  /** Second line under the label, e.g. "By Lalin A." — matches the approved-
   * status example in the actual draft of this module (Exzy_WorkX 1765:5235). */
  subtitle?: string
  /** Shows a "v2"/"v3" chip after the label when > 1. There's no separate
   * "revised" status — a resubmitted-after-rejection request is just
   * 'pending' again (see RequestStatus, types/request.ts) — so this chip is
   * what actually tells the reader "this went through a rejection and got
   * fixed", instead of a status value that never got wired up anywhere. */
  version?: number
}

// Bare icon + plain gray text, no background — matches the real draft of this
// module's status column exactly (Exzy_WorkX node 1765:5235): only the icon
// carries the status color, the label is always #505050.
export function StatusBadge({ status, size = 'md', subtitle, version }: Props) {
  const cfg = getStatusConfig(status)
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <Icon size={size === 'sm' ? 13 : 14} color={cfg.iconColor} style={{ flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: size === 'sm' ? 12 : 13, fontWeight: 400, color: '#505050' }}>{cfg.label}</span>
        {/* #586782 (token), not #929EB4 — real text (approver name), needs
            the 4.5:1 body-text minimum, not the decorative/non-text shade. */}
        {subtitle && <span style={{ fontSize: 11, color: '#586782' }}>{subtitle}</span>}
      </span>
      {version !== undefined && version > 1 && (
        <span style={{ fontSize: size === 'sm' ? 11 : 12, padding: size === 'sm' ? '1px 6px' : '2px 8px', background: 'rgba(0,64,129,0.08)', color: '#004081', borderRadius: 4, fontWeight: 600, flexShrink: 0 }}>
          v{version}
        </span>
      )}
    </span>
  )
}
