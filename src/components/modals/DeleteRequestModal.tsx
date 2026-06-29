import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TrashIcon } from '../icons/FigmaIcons'
import type { Request } from '../../features/credit-payment-term/types/request'

interface Props {
  open: boolean
  request: Request | null
  onClose: () => void
  onDelete: () => Promise<void>
}

// No confirmation checkbox, unlike Approve/Reject/Cancel — those act on a
// real submitted request with history worth pausing over; this only ever
// targets a draft (see canDeleteRequest), which has never been submitted
// and has nothing to lose beyond the draft itself.
export function DeleteRequestModal({ open, request, onClose, onDelete }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    try {
      await onDelete()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ลบคำขอ"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>ยกเลิก</Button>
          <Button variant="danger" icon={<TrashIcon size={15} />} onClick={handleSubmit} loading={loading}>
            ลบคำขอนี้
          </Button>
        </>
      }
    >
      {request && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#FEF2F2', borderRadius: 4, border: '1px solid #FCA5A5' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#7F1D1D' }}>{request.requestNo}</div>
          <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 3 }}>{request.proposalNo}</div>
        </div>
      )}
      <p style={{ margin: 0, fontSize: 13, color: '#586782', lineHeight: 1.65 }}>
        คำขอนี้ยังเป็นแบบร่าง ยังไม่ได้ส่งขออนุมัติ การลบจะไม่สามารถย้อนกลับได้
      </p>
      {error && <div style={{ marginTop: 10, fontSize: 12, color: '#F3554F' }}>{error}</div>}
    </Modal>
  )
}
