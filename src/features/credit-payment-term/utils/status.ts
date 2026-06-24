import type { LucideIcon } from 'lucide-react'
import { FileText, Hourglass, CheckCircle, XCircle, RefreshCw, Ban } from 'lucide-react'
import type { RequestStatus } from '../types/request'
import { STATUS_LABELS } from '../types/request'

export interface StatusConfig {
  label: string
  color: string
  icon: LucideIcon
}

export const STATUS_CONFIG: Record<RequestStatus, StatusConfig> = {
  draft: {
    label: STATUS_LABELS.draft,
    color: '#4A5568',
    icon: FileText,
  },
  pending: {
    label: STATUS_LABELS.pending,
    color: '#92400E',
    icon: Hourglass,
  },
  approved: {
    label: STATUS_LABELS.approved,
    color: '#14532D',
    icon: CheckCircle,
  },
  rejected: {
    label: STATUS_LABELS.rejected,
    color: '#7F1D1D',
    icon: XCircle,
  },
  revised: {
    label: STATUS_LABELS.revised,
    color: '#1E40AF',
    icon: RefreshCw,
  },
  cancelled: {
    label: STATUS_LABELS.cancelled,
    color: '#6B7280',
    icon: Ban,
  },
}

export function getStatusConfig(status: RequestStatus): StatusConfig {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
}
