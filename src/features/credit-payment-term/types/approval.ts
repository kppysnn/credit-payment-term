export type ApprovalAction =
  | 'created'
  | 'draft_saved'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'edited'
  | 'resubmitted'
  | 'cancelled'

export const APPROVAL_ACTION_LABELS: Record<ApprovalAction, string> = {
  created: 'สร้างคำขอ',
  draft_saved: 'บันทึกแบบร่าง',
  submitted: 'ส่งขออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  edited: 'แก้ไขคำขอ',
  resubmitted: 'ส่งขออนุมัติอีกครั้ง',
  cancelled: 'ยกเลิกคำขอ',
}

export interface ApprovalHistoryEntry {
  historyId: string
  requestId: string
  version: number
  action: ApprovalAction
  actorEmail: string
  actorName: string
  fromStatus: string
  toStatus: string
  comment?: string
  createdAt: string
}

export interface ApprovalResult {
  approverEmail: string
  approverName: string
  approvedAt?: string
  rejectedAt?: string
  decisionComment: string
  suggestion?: string
}
