import type { ApprovalHistoryEntry } from '../../features/credit-payment-term/types/approval'
import { APPROVAL_ACTION_LABELS } from '../../features/credit-payment-term/types/approval'
import { formatDateTime } from '../../features/credit-payment-term/utils/formatters'
import { FaCheck, FaXmark, FaHourglass, FaFileLines, FaBan } from 'react-icons/fa6'
import { RefreshIcon, SendIcon } from '../icons/FigmaIcons'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <FaFileLines size={14} aria-hidden="true" />,
  draft_saved: <FaFileLines size={14} aria-hidden="true" />,
  submitted: <SendIcon size={13} />,
  approved: <FaCheck size={13} aria-hidden="true" />,
  rejected: <FaXmark size={14} aria-hidden="true" />,
  edited: <RefreshIcon size={15} />,
  resubmitted: <SendIcon size={13} />,
  cancelled: <FaBan size={13} aria-hidden="true" />,
}

// "approved" matches StatusBadge's teal exactly (#66C5C5, not green) — the
// real draft (Exzy_WorkX 1765:5235) confirmed approved uses teal app-wide.
const ACTION_COLOR: Record<string, string> = {
  approved: '#66C5C5',
  rejected: '#F3554F',
  cancelled: '#929EB4',
  submitted: '#004081',
  resubmitted: '#004081',
  created: '#586782',
  draft_saved: '#586782',
  edited: '#92400E',
}

interface Props {
  history: ApprovalHistoryEntry[]
}

export function StatusTimeline({ history }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {history.map((entry, idx) => {
        const color = ACTION_COLOR[entry.action] ?? '#586782'
        const isLast = idx === history.length - 1
        return (
          <div key={entry.historyId} style={{ display: 'flex', gap: 12 }}>
            {/* Dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: color + '18',
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                  flexShrink: 0,
                }}
              >
                {ACTION_ICONS[entry.action] ?? <FaHourglass size={13} aria-hidden="true" />}
              </div>
              {!isLast && (
                <div style={{ width: 2, flex: 1, background: '#D0D6DF', minHeight: 20, margin: '3px 0' }} />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: isLast ? 0 : 20, paddingTop: 4, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#586782' }}>
                  {APPROVAL_ACTION_LABELS[entry.action]}
                </span>
                <span style={{ fontSize: 11, color: '#586782', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#586782', marginTop: 2 }}>
                {entry.actorName}
                {entry.version > 1 && (
                  <span style={{ marginLeft: 6, padding: '1px 5px', background: 'rgba(0,64,129,0.08)', color: '#004081', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                    v{entry.version}
                  </span>
                )}
              </div>
              {entry.comment && (
                <div style={{
                  marginTop: 6,
                  padding: '7px 10px',
                  background: '#F2F6F8',
                  border: '1px solid #D0D6DF',
                  borderRadius: 4,
                  fontSize: 12,
                  color: '#586782',
                  fontStyle: 'italic',
                }}>
                  "{entry.comment}"
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
