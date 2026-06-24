import type { RequestStatus } from '../../features/credit-payment-term/types/request'
import { getStatusConfig } from '../../features/credit-payment-term/utils/status'

interface Props {
  status: RequestStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = getStatusConfig(status)
  const Icon = cfg.icon
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: size === 'sm' ? 12 : 13,
        fontWeight: 700,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={size === 'sm' ? 13 : 14} style={{ flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}
