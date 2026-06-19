import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormGroup, Textarea } from '../ui/FormField'
import { CheckCircle } from 'lucide-react'
import type { Request } from '../../features/credit-payment-term/types/request'

interface Props {
  open: boolean
  request: Request | null
  onClose: () => void
  onApprove: (comment: string) => Promise<void>
}

export function ApproveModal({ open, request, onClose, onApprove }: Props) {
  const [comment, setComment] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!comment.trim()) { setError('กรุณาระบุเหตุผลการอนุมัติ'); return }
    if (!confirmed) { setError('กรุณายืนยันการอนุมัติ'); return }
    setLoading(true)
    try {
      await onApprove(comment.trim())
      setComment('')
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
      title="อนุมัติคำขอ"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>ยกเลิก</Button>
          <Button variant="success" icon={<CheckCircle size={15} />} onClick={handleSubmit} loading={loading}>
            ยืนยันอนุมัติ
          </Button>
        </>
      }
    >
      {request && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#FAFBFC', borderRadius: 10, border: '1px solid #D0D6DF' }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', color: '#004081' }}>{request.requestNo}</div>
          <div style={{ fontSize: 13, color: '#586782', marginTop: 3 }}>{request.projectName}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormGroup label="เหตุผลการอนุมัติ (Approval Comment)" required error={!comment.trim() && error ? error : undefined}>
          <Textarea
            value={comment}
            onChange={e => { setComment(e.target.value); setError('') }}
            rows={4}
            placeholder="ระบุเหตุผลหรือข้อสังเกตสำหรับการอนุมัติ..."
          />
        </FormGroup>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => { setConfirmed(e.target.checked); setError('') }}
            style={{ marginTop: 2, accentColor: '#66C5C5' }}
          />
          <span>ยืนยันอนุมัติคำขอนี้</span>
        </label>

        {error && !comment.trim() === false && (
          <div style={{ fontSize: 12, color: '#F3554F' }}>{error}</div>
        )}
        {error && <div style={{ fontSize: 12, color: '#F3554F' }}>{error}</div>}
      </div>
    </Modal>
  )
}
