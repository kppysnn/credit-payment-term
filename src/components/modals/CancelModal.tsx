import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormGroup, Textarea } from '../ui/FormField'
import { FiSlash } from 'react-icons/fi'
import type { Request } from '../../features/credit-payment-term/types/request'

interface Props {
  open: boolean
  request: Request | null
  customerName?: string
  onClose: () => void
  onCancel: (reason: string) => Promise<void>
}

export function CancelModal({ open, request, customerName, onClose, onCancel }: Props) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!reason.trim()) { setError('กรุณาระบุเหตุผลที่ยกเลิก'); return }
    if (!confirmed) { setError('กรุณายืนยันการยกเลิก'); return }
    setLoading(true)
    try {
      await onCancel(reason.trim())
      setReason('')
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
      title="ยกเลิกคำขอ"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>ปิด</Button>
          <Button
            variant="danger"
            icon={<FiSlash size={15} />}
            onClick={handleSubmit}
            loading={loading}
          >
            ยืนยันยกเลิก
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormGroup label="เหตุผลที่ยกเลิก (Cancel Reason)" required error={error && !reason.trim() ? error : undefined}>
          <Textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setError('') }}
            rows={4}
            placeholder="ระบุเหตุผลที่ยกเลิกคำขอนี้..."
          />
        </FormGroup>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => { setConfirmed(e.target.checked); setError('') }}
            style={{ marginTop: 2, accentColor: '#F3554F' }}
          />
          <span>ยืนยันการยกเลิกคำขอนี้ (ไม่สามารถย้อนกลับได้)</span>
        </label>

        {error && <div style={{ fontSize: 12, color: '#F3554F' }}>{error}</div>}
      </div>
    </Modal>
  )
}
