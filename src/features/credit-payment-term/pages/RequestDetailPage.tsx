import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequestById, approveRequest, rejectRequest, cancelRequest, submitRequest } from '../services/creditTermService'
import { exportPDF } from '../services/exportService'
import type { Request, PaymentInstallment, QuotationItem } from '../types/request'
import { SALE_TYPE_LABELS, PAYMENT_CONDITION_LABELS } from '../types/request'
import { CUSTOMER_TYPE_LABELS } from '../types/customer'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { StatusTimeline } from '../../../components/ui/StatusTimeline'
import { Card, FieldDisplay, FieldGrid } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Alert } from '../../../components/ui/Alert'
import { ApproveModal } from '../../../components/modals/ApproveModal'
import { RejectModal } from '../../../components/modals/RejectModal'
import { canApproveRequest, canRejectRequest, canEditRequest, canCancelRequest } from '../utils/permissions'
import { formatCurrency } from '../utils/calculations'
import { formatDate, formatDateTime, formatCreditTerm } from '../utils/formatters'
import { BackButton } from '../../../components/ui/BackButton'
import { Edit, RefreshCw, Printer, Send, Ban, CheckCircle, XCircle } from 'lucide-react'

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useCurrentUser()
  const [req, setReq] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  async function loadReq() {
    if (!id) return
    const r = await getRequestById(id)
    setReq(r ?? null)
    setLoading(false)
  }

  useEffect(() => { loadReq() }, [id, currentUser])

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#929EB4' }}>กำลังโหลด...</div>
  if (!req) return <div style={{ textAlign: 'center', padding: 48, color: '#929EB4' }}>ไม่พบคำขอ</div>

  const customerName =
    req.customerInfo.type === 'existing' ? req.customerInfo.data.companyName :
    req.customerInfo.type === 'new'      ? req.customerInfo.data.companyName :
    req.customerInfo.data.resellerCompanyName
  const separateQuotation = req.saleType === 'hardware_software_installation'
  const hardwareQuotationNo = `${req.proposalNo}-1`
  const serviceQuotationNo = `${req.proposalNo}-${separateQuotation ? '2' : '1'}`
  const hardwareItems = req.quotationItems.filter(item => item.type === 'hardware')
  const serviceItems = req.quotationItems.filter(item => item.type === 'software' || item.type === 'installation')
  const hardwareSelling = hardwareItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const serviceSelling = serviceItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const hardwareCost = hardwareItems.reduce((sum, item) => sum + item.cost, 0)
  const serviceCost = serviceItems.reduce((sum, item) => sum + item.cost, 0)
  const summaryAmount = (value: number, color = '#001122') => (
    <span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontWeight: 700, color }}>
      {formatCurrency(value)}
    </span>
  )

  const itemsTable = (items: QuotationItem[]) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {items.map(item => (
          <tr key={item.itemId} style={{ borderBottom: '1px solid #D0D6DF' }}>
            <td style={{ padding: '10px 14px' }}>{item.name}</td>
            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{summaryAmount(item.cost, '#929EB4')}</td>
            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{summaryAmount(item.sellingPrice, '#004081')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const installmentTable = (installments: PaymentInstallment[]) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
          {['งวด', '%', 'Credit Term', 'เงื่อนไขชำระ', 'จำนวนเงิน'].map(h => (
            <th key={h} style={{ padding: '8px 12px', textAlign: h === 'จำนวนเงิน' ? 'right' : 'left', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {installments.map(inst => (
          <tr key={inst.installmentNo} style={{ borderBottom: '1px solid #D0D6DF' }}>
            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{inst.installmentNo}</td>
            <td style={{ padding: '8px 12px' }}>{inst.installmentPercent}%</td>
            <td style={{ padding: '8px 12px', color: '#586782' }}>{formatCreditTerm(inst.creditTermDays)}</td>
            <td style={{ padding: '8px 12px', color: '#586782' }}>{PAYMENT_CONDITION_LABELS[inst.paymentCondition]}</td>
            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace' }}>{formatCurrency(inst.installmentAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const quotationBlock = (quotationNo: string, label: string, items: QuotationItem[], installments: PaymentInstallment[]) => (
    <Card
      title={label}
      actions={<span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontSize: 12, color: '#929EB4', fontWeight: 600 }}>{quotationNo}</span>}
      noPad
    >
      {itemsTable(items)}
      {installments.length > 0 && (
        <div style={{ borderTop: '1px solid #D0D6DF' }}>{installmentTable(installments)}</div>
      )}
    </Card>
  )

  async function handleApprove(comment: string) {
    if (!id) return
    const updated = await approveRequest(id, comment, currentUser)
    setReq(updated)
    setApproveOpen(false)
  }

  async function handleReject(reason: string, suggestion: string) {
    if (!id) return
    const updated = await rejectRequest(id, reason, suggestion, currentUser)
    setReq(updated)
    setRejectOpen(false)
  }

  async function handleCancel() {
    if (!id || !window.confirm('ยืนยันการยกเลิกคำขอนี้?')) return
    setCancelLoading(true)
    await cancelRequest(id, currentUser)
    navigate('/requests')
  }

  async function handleSubmit() {
    if (!id) return
    setSubmitLoading(true)
    const updated = await submitRequest(id, currentUser)
    setReq(updated)
    setSubmitLoading(false)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <BackButton />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', color: '#001122' }}>{req.requestNo}</h1>
              <StatusBadge status={req.status} />
              {req.version > 1 && (
                <span style={{ fontSize: 12, padding: '2px 8px', background: 'rgba(0,64,129,0.08)', color: '#004081', borderRadius: 9999, fontWeight: 600 }}>v{req.version}</span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', color: '#586782', fontSize: 14 }}>
              {req.proposalNo} · {customerName} · {SALE_TYPE_LABELS[req.saleType]}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => exportPDF(req)}>Print / PDF</Button>

            {currentUser.role === 'sales' && req.status === 'draft' && (
              <Button size="sm" icon={<Send size={14} />} loading={submitLoading} onClick={handleSubmit}>ส่งขออนุมัติ</Button>
            )}
            {canEditRequest(currentUser, req) && (
              <Link to={`/requests/${req.id}/edit`}>
                <Button variant="secondary" size="sm" icon={req.status === 'rejected' ? <RefreshCw size={14} /> : <Edit size={14} />}>
                  {req.status === 'rejected' ? 'แก้ไขและส่งใหม่' : 'แก้ไข'}
                </Button>
              </Link>
            )}
            {canCancelRequest(currentUser, req) && (
              <Button variant="danger" size="sm" icon={<Ban size={14} />} loading={cancelLoading} onClick={handleCancel}>ยกเลิก</Button>
            )}
            {canApproveRequest(currentUser, req) && (
              <Button variant="success" size="sm" icon={<CheckCircle size={14} />} onClick={() => setApproveOpen(true)}>อนุมัติ</Button>
            )}
            {canRejectRequest(currentUser, req) && (
              <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={() => setRejectOpen(true)}>ไม่อนุมัติ</Button>
            )}
          </div>
        </div>

        {/* Rejection info for sales */}
        {req.status === 'rejected' && req.approvalResult && currentUser.role === 'sales' && (
          <Alert type="error" title="คำขอถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่">
            <div><strong>เหตุผล:</strong> {req.approvalResult.decisionComment}</div>
            {req.approvalResult.suggestion && <div style={{ marginTop: 4 }}><strong>ข้อเสนอแนะ:</strong> {req.approvalResult.suggestion}</div>}
          </Alert>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Request Info */}
            <Card title="ข้อมูลคำขอ">
              <FieldGrid cols={3}>
                <FieldDisplay label="Request No." value={req.requestNo} mono />
                <FieldDisplay label="Proposal No." value={req.proposalNo} mono />
                <FieldDisplay label="ประเภทการขาย" value={SALE_TYPE_LABELS[req.saleType]} />
                <FieldDisplay label="วันที่สร้าง" value={formatDateTime(req.createdAt)} />
                <FieldDisplay label="อัปเดตล่าสุด" value={formatDateTime(req.updatedAt)} />
                <FieldDisplay label="เวอร์ชัน" value={`v${req.version}`} />
              </FieldGrid>
            </Card>

            {/* Customer Info */}
            <Card title="ข้อมูลลูกค้า">
              <FieldGrid cols={3}>
                <FieldDisplay label="ประเภทลูกค้า" value={CUSTOMER_TYPE_LABELS[req.customerInfo.type]} />
                {req.customerInfo.type === 'existing' && (
                  <>
                    <FieldDisplay label="ชื่อบริษัท" value={req.customerInfo.data.companyName} />
                    <FieldDisplay label="Default Credit Term" value={`Net ${req.customerInfo.data.defaultCreditTerm ?? 0}`} />
                    <FieldDisplay label="ผู้ติดต่อ" value={req.customerInfo.data.contactPerson || '—'} />
                    <FieldDisplay label="โทรศัพท์" value={req.customerInfo.data.contactPhone || '—'} />
                  </>
                )}
                {req.customerInfo.type === 'new' && (
                  <>
                    <FieldDisplay label="ชื่อบริษัท" value={req.customerInfo.data.companyName} />
                    <FieldDisplay label="ผู้ติดต่อ" value={req.customerInfo.data.contactPerson || '—'} />
                    <FieldDisplay label="โทรศัพท์" value={req.customerInfo.data.contactPhone || '—'} />
                  </>
                )}
                {req.customerInfo.type === 'reseller' && (
                  <>
                    <FieldDisplay label="Reseller" value={req.customerInfo.data.resellerCompanyName} />
                    <FieldDisplay label="Default Credit Term" value={`Net ${req.customerInfo.data.defaultCreditTerm ?? 0}`} />
                    <FieldDisplay label="ผู้ติดต่อ" value={req.customerInfo.data.contactPerson || '—'} />
                    <FieldDisplay label="โทรศัพท์" value={req.customerInfo.data.contactPhone || '—'} />
                    <FieldDisplay label="End Customer" value={req.customerInfo.data.endCustomerCompanyName} />
                  </>
                )}
              </FieldGrid>
            </Card>

            {/* Hardware quotation: items + its own payment schedule */}
            {hardwareItems.length > 0 && quotationBlock(hardwareQuotationNo, 'Hardware', hardwareItems, req.installments)}

            {/* Software & Installation quotation: items + its own payment schedule */}
            {serviceItems.length > 0 && quotationBlock(serviceQuotationNo, 'Software & Installation', serviceItems, req.swInstallments ?? [])}

            {/* Overall total */}
            <Card title="สรุปรวมทั้งหมด" noPad>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#929EB4', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>รายการ</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#929EB4', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาทุน</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#929EB4', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาขาย</th>
                  </tr>
                </thead>
                <tbody>
                  {hardwareItems.length > 0 && (
                    <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontWeight: 700, color: '#001122' }}>{hardwareQuotationNo}</span>
                        <span style={{ color: '#929EB4', fontWeight: 500, marginLeft: 8 }}>Hardware</span>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(hardwareCost, '#929EB4')}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(hardwareSelling, '#004081')}</td>
                    </tr>
                  )}
                  {serviceItems.length > 0 && (
                    <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontWeight: 700, color: '#001122' }}>{serviceQuotationNo}</span>
                        <span style={{ color: '#929EB4', fontWeight: 500, marginLeft: 8 }}>Software &amp; Installation</span>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(serviceCost, '#929EB4')}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(serviceSelling, '#004081')}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1.5px solid #D0D6DF', background: '#F2F6F8' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#001122' }}>รวมทั้งหมด</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalCost, '#929EB4')}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalSelling, '#004081')}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>

            {/* Approval result */}
            {req.approvalResult && (
              <Card title={req.status === 'approved' ? 'ผลการอนุมัติ' : 'ผลการปฏิเสธ'}>
                <FieldGrid cols={2}>
                  <FieldDisplay label="ผลการพิจารณา" value={req.approvalResult.approvedAt ? 'อนุมัติ' : 'ไม่อนุมัติ'} />
                  <FieldDisplay label="Approver" value={req.approvalResult.approverName} />
                  <FieldDisplay label="วันที่" value={formatDate(req.approvalResult.approvedAt ?? req.approvalResult.rejectedAt ?? '')} />
                </FieldGrid>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#586782', fontWeight: 600, marginBottom: 4 }}>
                    {req.approvalResult.approvedAt ? 'Approval Comment' : 'Reject Reason'}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, padding: '10px 12px', background: req.approvalResult.approvedAt ? '#F0FDF4' : '#FEF2F2', borderRadius: 4, border: `1px solid ${req.approvalResult.approvedAt ? '#86EFAC' : '#FCA5A5'}` }}>
                    {req.approvalResult.decisionComment}
                  </p>
                </div>
                {req.approvalResult.suggestion && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#586782', fontWeight: 600, marginBottom: 4 }}>ข้อเสนอแนะสำหรับ Sales</div>
                    <p style={{ margin: 0, fontSize: 14, padding: '10px 12px', background: '#FFFBEB', borderRadius: 4, border: '1px solid #FCD34D' }}>
                      {req.approvalResult.suggestion}
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* Status Timeline */}
            <Card title="ประวัติสถานะ">
              <StatusTimeline history={req.history} />
            </Card>

          </div>
      </div>

      <ApproveModal open={approveOpen} request={req} onClose={() => setApproveOpen(false)} onApprove={handleApprove} />
      <RejectModal open={rejectOpen} request={req} onClose={() => setRejectOpen(false)} onReject={handleReject} />
    </>
  )
}
