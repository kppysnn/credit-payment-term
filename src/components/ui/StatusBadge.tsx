import type { RequestStatus } from '../../features/credit-payment-term/types/request'
import { getStatusConfig } from '../../features/credit-payment-term/utils/status'

interface Props {
  status: RequestStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = getStatusConfig(status)
  return (
    <span
      className={`badge ${cfg.badgeClass}`}
      style={size === 'sm' ? { fontSize: 10, padding: '1px 6px' } : undefined}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  )
}
