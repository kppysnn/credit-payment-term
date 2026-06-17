import type { RequestStatus } from '../types/request'
import { STATUS_LABELS } from '../types/request'

export interface StatusConfig {
  label: string
  badgeClass: string
  dotColor: string
}

export const STATUS_CONFIG: Record<RequestStatus, StatusConfig> = {
  draft: {
    label: STATUS_LABELS.draft,
    badgeClass: 'badge-draft',
    dotColor: '#CBD5E0',
  },
  pending: {
    label: STATUS_LABELS.pending,
    badgeClass: 'badge-pending',
    dotColor: '#FBBF24',
  },
  approved: {
    label: STATUS_LABELS.approved,
    badgeClass: 'badge-approved',
    dotColor: '#16A34A',
  },
  rejected: {
    label: STATUS_LABELS.rejected,
    badgeClass: 'badge-rejected',
    dotColor: '#DC2626',
  },
  revised: {
    label: STATUS_LABELS.revised,
    badgeClass: 'badge-revised',
    dotColor: '#2563EB',
  },
  cancelled: {
    label: STATUS_LABELS.cancelled,
    badgeClass: 'badge-cancelled',
    dotColor: '#9CA3AF',
  },
}

export function getStatusConfig(status: RequestStatus): StatusConfig {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
}
