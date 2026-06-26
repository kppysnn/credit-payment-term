import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FiCheckCircle } from 'react-icons/fi'
import type { Request } from '../../features/credit-payment-term/types/request'

interface Props {
  open: boolean
  request: Request | null
  customerName?: string
  onClose: () => void
  onApprove: () => Promise<void>
}

export function ApproveModal({ open, request, customerName, onClose, onApprove }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!confirmed) { setError('กรุณายืนยันการอนุมัติ'); return }
    setLoading(true)
    try {
      await onApprove()
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
          <Button icon={<FiCheckCircle size={15} />} onClick={handleSubmit} loading={loading}>
            ยืนยันอนุมัติ
          </Button>
        </>
      }
    >
      {request && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#F2F6F8', borderRadius: 4, border: '1px solid #D0D6DF' }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums', color: '#004081' }}>{request.requestNo}</div>
          <div style={{ fontSize: 13, color: '#586782', marginTop: 3 }}>{customerName}</div>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => { setConfirmed(e.target.checked); setError('') }}
          style={{ marginTop: 2, accentColor: '#66C5C5' }}
        />
        <span>ยืนยันอนุมัติคำขอนี้</span>
      </label>

      {error && <div style={{ marginTop: 10, fontSize: 12, color: '#F3554F' }}>{error}</div>}
    </Modal>
  )
}
