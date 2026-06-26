import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FiXCircle } from 'react-icons/fi'
import type { Request } from '../../features/credit-payment-term/types/request'
import type { SectionComments } from '../../features/credit-payment-term/types/approval'

interface Props {
  open: boolean
  request: Request | null
  customerName?: string
  comments: SectionComments
  onClose: () => void
  onReject: () => Promise<void>
}

export function RejectModal({ open, request, customerName, comments, onClose, onReject }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasComment = Boolean(comments.customerComment?.trim() || comments.hardwareComment?.trim() || comments.swComment?.trim())

  async function handleSubmit() {
    if (!hasComment) { setError('กรุณาระบุหมายเหตุอย่างน้อย 1 หมวด ก่อนปฏิเสธคำขอ'); return }
    if (!confirmed) { setError('กรุณายืนยันการไม่อนุมัติ'); return }
    setLoading(true)
    try {
      await onReject()
      setConfirmed(false)
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
      title="ไม่อนุมัติคำขอ"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>ยกเลิก</Button>
          <Button
            variant="danger"
            icon={<FiXCircle size={15} />}
            onClick={handleSubmit}
            loading={loading}
          >
            ยืนยันไม่อนุมัติ
          </Button>
        </>
      }
    >
      {request && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#FEF2F2', borderRadius: 4, border: '1px solid #FCA5A5' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#7F1D1D' }}>{request.requestNo}</div>
          <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 3 }}>{customerName}</div>
        </div>
      )}

      {!hasComment && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: '#FFFBEB', borderRadius: 4, border: '1px solid #FCD34D', fontSize: 13, color: '#92400E' }}>
          ยังไม่ได้ระบุหมายเหตุ — กรุณากลับไประบุหมายเหตุที่หมวดที่มีปัญหาก่อนกดไม่อนุมัติ
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => { setConfirmed(e.target.checked); setError('') }}
          style={{ marginTop: 2, accentColor: '#F3554F' }}
        />
        <span>ยืนยันไม่อนุมัติคำขอนี้</span>
      </label>

      {error && <div style={{ marginTop: 10, fontSize: 12, color: '#F3554F' }}>{error}</div>}
    </Modal>
  )
}
