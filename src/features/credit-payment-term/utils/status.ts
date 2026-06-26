import type { IconType } from 'react-icons'
import { FiFileText, FiSlash } from 'react-icons/fi'
import { XMarkIcon, HourglassIcon, CheckCircleIcon, RefreshIcon } from '../../../components/icons/FigmaIcons'
import type { RequestStatus } from '../types/request'
import { STATUS_LABELS } from '../types/request'

export interface StatusConfig {
  label: string
  /** Icon color — the brand's exact semantic token. Text is always plain gray
   * (see Exzy_WorkX node 1765:5235, the actual draft of this module's status
   * column) — only the icon carries the status color, never the label text. */
  iconColor: string
  icon: IconType
}

export const STATUS_CONFIG: Record<RequestStatus, StatusConfig> = {
  draft: {
    label: STATUS_LABELS.draft,
    iconColor: '#929EB4',
    icon: FiFileText,
  },
  pending: {
    label: STATUS_LABELS.pending,
    iconColor: '#FFCC00',
    icon: HourglassIcon,
  },
  approved: {
    label: STATUS_LABELS.approved,
    iconColor: '#66C5C5',
    icon: CheckCircleIcon,
  },
  rejected: {
    label: STATUS_LABELS.rejected,
    iconColor: '#F3554F',
    icon: XMarkIcon,
  },
  revised: {
    label: STATUS_LABELS.revised,
    iconColor: '#1E40AF',
    icon: RefreshIcon,
  },
  cancelled: {
    label: STATUS_LABELS.cancelled,
    iconColor: '#6B7280',
    icon: FiSlash,
  },
}

export function getStatusConfig(status: RequestStatus): StatusConfig {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
}
