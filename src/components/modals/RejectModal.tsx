import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormGroup, Textarea } from '../ui/FormField'
import { XCircle } from 'lucide-react'
import type { Request } from '../../features/credit-payment-term/types/request'

interface Props {
  open: boolean
  request: Request | null
  onClose: () => void
  onReject: (reason: string, suggestion: string) => Promise<void>
}

export function RejectModal({ open, request, onClose, onReject }: Props) {
  const [reason, setReason] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!reason.trim()) { setError('กรุณาระบุเหตุผลที่ไม่อนุมัติ'); return }
    if (!confirmed) { setError('กรุณายืนยันการไม่อนุมัติ'); return }
    setLoading(true)
    try {
      await onReject(reason.trim(), suggestion.trim())
      setReason('')
      setSuggestion('')
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
            icon={<XCircle size={15} />}
            onClick={handleSubmit}
            loading={loading}
          >
            ยืนยันไม่อนุมัติ
          </Button>
        </>
      }
    >
      {request && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FCA5A5' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#7F1D1D' }}>{request.requestNo}</div>
          <div style={{ fontSize: 13, color: '#991B1B', marginTop: 3 }}>{request.projectName}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormGroup label="เหตุผลที่ไม่อนุมัติ (Reject Reason)" required error={error && !reason.trim() ? error : undefined}>
          <Textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setError('') }}
            rows={4}
            placeholder="ระบุเหตุผลที่ชัดเจน เพื่อให้ Sales สามารถแก้ไขและส่งใหม่ได้..."
          />
        </FormGroup>

        <FormGroup label="ข้อเสนอแนะสำหรับ Sales (ถ้ามี)">
          <Textarea
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            rows={3}
            placeholder="แนะนำแนวทางที่ Sales ควรปรับปรุง..."
          />
        </FormGroup>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => { setConfirmed(e.target.checked); setError('') }}
            style={{ marginTop: 2, accentColor: '#F3554F' }}
          />
          <span>ข้าพเจ้ายืนยันว่าตัดสินใจไม่อนุมัติคำขอนี้แล้ว</span>
        </label>

        {error && <div style={{ fontSize: 12, color: '#F3554F' }}>{error}</div>}
      </div>
    </Modal>
  )
}
