import type { ApprovalHistoryEntry } from '../../features/credit-payment-term/types/approval'
import { APPROVAL_ACTION_LABELS } from '../../features/credit-payment-term/types/approval'
import { formatDateTime } from '../../features/credit-payment-term/utils/formatters'
import { FaCheck, FaXmark, FaHourglass, FaFileLines, FaBan } from 'react-icons/fa6'
import { RefreshIcon, SendIcon } from '../icons/FigmaIcons'

// Function instead of a static JSX map so the current/last dot (bigger,
// 36px vs 28px — see below) can request a proportionally bigger icon
// instead of the same fixed size floating in more empty space.
const ACTION_ICON_BASE_SIZE: Record<string, number> = {
  created: 14, draft_saved: 14, submitted: 13, approved: 13,
  rejected: 14, edited: 15, resubmitted: 13, cancelled: 13,
}
function actionIcon(action: string, size: number): React.ReactNode {
  switch (action) {
    case 'created': case 'draft_saved': return <FaFileLines size={size} aria-hidden="true" />
    case 'submitted': case 'resubmitted': return <SendIcon size={size} />
    case 'approved': return <FaCheck size={size} aria-hidden="true" />
    case 'rejected': return <FaXmark size={size} aria-hidden="true" />
    case 'edited': return <RefreshIcon size={size} />
    case 'cancelled': return <FaBan size={size} aria-hidden="true" />
    default: return <FaHourglass size={size} aria-hidden="true" />
  }
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
            {/* Dot + line — the last entry (the current/final status, "now")
               renders larger and solid-filled instead of the same small
               tinted-ring treatment as every step before it. Previously
               every dot got identical weight regardless of position, so
               "what status is this actually at" only came from reading the
               label text, not from the shape itself — the one thing a
               status timeline should communicate before any text is read. */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
              <div
                style={{
                  width: isLast ? 36 : 28,
                  height: isLast ? 36 : 28,
                  borderRadius: '50%',
                  background: color,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  flexShrink: 0,
                }}
              >
                {actionIcon(entry.action, isLast ? Math.round((ACTION_ICON_BASE_SIZE[entry.action] ?? 13) * 1.3) : (ACTION_ICON_BASE_SIZE[entry.action] ?? 13))}
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
