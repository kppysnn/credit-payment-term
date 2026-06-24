import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequestById, approveRequest, rejectRequest, cancelRequest, submitRequest } from '../services/creditTermService'
import { exportPDF } from '../services/exportService'
import type { Request, PaymentInstallment, QuotationItem } from '../types/request'
import { SALE_TYPE_LABELS } from '../types/request'
import { CUSTOMER_TYPE_LABELS } from '../types/customer'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { StatusTimeline } from '../../../components/ui/StatusTimeline'
import { Card, FieldDisplay, FieldGrid } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Alert } from '../../../components/ui/Alert'
import { Textarea } from '../../../components/ui/FormField'
import { ApproveModal } from '../../../components/modals/ApproveModal'
import { RejectModal } from '../../../components/modals/RejectModal'
import { CancelModal } from '../../../components/modals/CancelModal'
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
  const [cancelOpen, setCancelOpen] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [customerComment, setCustomerComment] = useState('')
  const [hardwareComment, setHardwareComment] = useState('')
  const [swComment, setSwComment] = useState('')

  async function loadReq() {
    if (!id) return
    const r = await getRequestById(id)
    setReq(r ?? null)
    setCustomerComment(r?.customerComment ?? '')
    setHardwareComment(r?.hardwareComment ?? '')
    setSwComment(r?.swComment ?? '')
    setLoading(false)
  }

  useEffect(() => { loadReq() }, [id, currentUser])

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#586782' }}>กำลังโหลด...</div>
  if (!req) return <div style={{ textAlign: 'center', padding: 48, color: '#586782' }}>ไม่พบคำขอ</div>

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

  // Whoever currently has decision authority on this request can leave
  // section-level notes; everyone else only sees what's already been written.
  const canComment = canApproveRequest(currentUser, req) || canRejectRequest(currentUser, req)

  // Every named sub-section below (total, payment schedule, comment) is a peer:
  // a thin rule above + bold Card-title-weight label, document/quotation style.
  // `framed` zones sit directly inside a borderless wrapper (quotationBlock) and need
  // their own 18px horizontal padding; non-framed zones already sit inside a Card
  // body that provides that padding, so they only need the top divider + vertical rhythm.
  const labeledBand = (label: string, right?: React.ReactNode, framed = true) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: framed ? '16px 18px 10px' : '16px 0 10px', borderTop: '1px solid #D0D6DF' }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#001122', letterSpacing: '-0.01em' }}>{label}</span>
      {right}
    </div>
  )

  const sectionComment = (label: string, value: string, editable: boolean, onChange?: (v: string) => void, framed = true) => {
    if (!editable && !value.trim()) return null
    return (
      <div>
        {labeledBand(label, undefined, framed)}
        <div style={{ padding: framed ? '0 18px 16px' : '0 0 4px' }}>
          {editable ? (
            <Textarea value={value} onChange={e => onChange?.(e.target.value)} rows={2} placeholder="เพิ่มรายละเอียดเพิ่มเติม (ถ้ามี)..." />
          ) : (
            <div style={{ fontSize: 13, color: '#505050', lineHeight: 1.65, whiteSpace: 'pre-wrap' as const }}>{value}</div>
          )}
        </div>
      </div>
    )
  }

  const itemsTable = (items: QuotationItem[]) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
          {['รายการ', 'ราคาทุน', 'ราคาขาย'].map(h => (
            <th key={h} style={{ padding: '8px 14px', textAlign: h === 'รายการ' ? 'left' : 'right', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.itemId} style={{ borderBottom: '1px solid #F2F6F8' }}>
            <td style={{ padding: '10px 14px' }}>{item.name}</td>
            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{summaryAmount(item.cost, '#586782')}</td>
            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{summaryAmount(item.sellingPrice, '#004081')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const totalStrip = (label: string, cost: number, selling: number) => labeledBand(`รวม ${label}`, (
    <span style={{ display: 'flex', gap: 24 }}>
      <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>
        ราคาทุน <span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontSize: 14, fontWeight: 700, color: '#586782' }}>{formatCurrency(cost)}</span>
      </span>
      <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>
        ราคาขาย <span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontSize: 14, fontWeight: 700, color: '#004081' }}>{formatCurrency(selling)}</span>
      </span>
    </span>
  ))

  const installmentStrip = (creditTermDays: number) => labeledBand('งวดการชำระเงิน', (
    <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>
      Credit Term <span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontSize: 14, fontWeight: 700, color: '#004081' }}>{formatCreditTerm(creditTermDays)}</span>
    </span>
  ))

  const installmentTable = (installments: PaymentInstallment[]) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, margin: '6px 0 6px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #F2F6F8' }}>
          {['งวด', '%', 'จำนวนเงิน'].map(h => (
            <th key={h} style={{ padding: '0 14px 6px', textAlign: h === 'จำนวนเงิน' ? 'right' : 'left', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {installments.map(inst => (
          <tr key={inst.installmentNo} style={{ borderBottom: '1px solid #F2F6F8' }}>
            <td style={{ padding: '7px 14px', fontWeight: 700 }}>{inst.installmentNo}</td>
            <td style={{ padding: '7px 14px' }}>{inst.installmentPercent}%</td>
            <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace' }}>{formatCurrency(inst.installmentAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const quotationBlock = (quotationNo: string, label: string, gradient: string, items: QuotationItem[], cost: number, selling: number, creditTermDays: number, installments: PaymentInstallment[], extra?: React.ReactNode) => (
    <div style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #D0D6DF', background: '#FFFFFF' }}>
      <div style={{ background: gradient, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{quotationNo}</span>
      </div>
      {itemsTable(items)}
      {totalStrip(label, cost, selling)}
      {installments.length > 0 && (
        <div style={{ paddingBottom: 16 }}>
          {installmentStrip(creditTermDays)}
          {installmentTable(installments)}
        </div>
      )}
      {extra}
    </div>
  )

  async function handleApprove() {
    if (!id) return
    const updated = await approveRequest(id, { customerComment, hardwareComment, swComment }, currentUser)
    setReq(updated)
    setApproveOpen(false)
  }

  async function handleReject() {
    if (!id) return
    const updated = await rejectRequest(id, { customerComment, hardwareComment, swComment }, currentUser)
    setReq(updated)
    setRejectOpen(false)
  }

  async function handleCancel(reason: string) {
    if (!id) return
    await cancelRequest(id, reason, currentUser)
    setCancelOpen(false)
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
      <div style={{ marginBottom: 20 }}>
        <BackButton to="/requests" label="กลับไปหน้ารายการคำขอ" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
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
              <Button variant="danger" size="sm" icon={<Ban size={14} />} onClick={() => setCancelOpen(true)}>ยกเลิก</Button>
            )}
            {canApproveRequest(currentUser, req) && (
              <Button variant="success" size="sm" icon={<CheckCircle size={14} />} onClick={() => setApproveOpen(true)}>อนุมัติ</Button>
            )}
            {canRejectRequest(currentUser, req) && (
              <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={() => setRejectOpen(true)}>ไม่อนุมัติ</Button>
            )}
          </div>
        </div>

        {/* Rejection flag — visible to every role, not just sales, so an approver
            re-deciding a resubmitted request knows to check the section comments
            below for why it was rejected last time */}
        {req.approvalResult?.rejectedAt && (
          <Alert
            type="error"
            title={req.status === 'rejected' ? 'คำขอถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่' : 'เคยถูกปฏิเสธมาก่อน — แก้ไขและส่งใหม่แล้ว'}
          >
            ดูคอมเม้นของผู้พิจารณาในแต่ละ section ด้านล่าง
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
              {sectionComment('เพิ่มคอมเม้นข้อมูลลูกค้า', customerComment, canComment, setCustomerComment, false)}
            </Card>

            {/* Hardware quotation: items + its own payment schedule */}
            {hardwareItems.length > 0 && quotationBlock(hardwareQuotationNo, 'Hardware', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', hardwareItems, hardwareCost, hardwareSelling, req.installments[0]?.creditTermDays ?? 0, req.installments,
              (canComment || hardwareComment.trim()) ? sectionComment('เพิ่มคอมเม้น Hardware', hardwareComment, canComment, setHardwareComment) : null)}

            {/* Software & Installation quotation: items + its own payment schedule */}
            {serviceItems.length > 0 && quotationBlock(serviceQuotationNo, 'Software & Installation', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', serviceItems, serviceCost, serviceSelling, req.swInstallments?.[0]?.creditTermDays ?? 0, req.swInstallments ?? [],
              (canComment || swComment.trim()) ? sectionComment('เพิ่มคอมเม้น Software & Installation', swComment, canComment, setSwComment) : null)}

            {/* Overall total */}
            <Card title="สรุปรวมทั้งหมด" noPad>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>รายการ</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาทุน</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาขาย</th>
                  </tr>
                </thead>
                <tbody>
                  {hardwareItems.length > 0 && (
                    <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontWeight: 700, color: '#001122' }}>{hardwareQuotationNo}</span>
                        <span style={{ color: '#586782', fontWeight: 500, marginLeft: 8 }}>Hardware</span>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(hardwareCost, '#586782')}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(hardwareSelling, '#004081')}</td>
                    </tr>
                  )}
                  {serviceItems.length > 0 && (
                    <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontWeight: 700, color: '#001122' }}>{serviceQuotationNo}</span>
                        <span style={{ color: '#586782', fontWeight: 500, marginLeft: 8 }}>Software &amp; Installation</span>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(serviceCost, '#586782')}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(serviceSelling, '#004081')}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1.5px solid #D0D6DF', background: '#F2F6F8' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#001122' }}>รวมทั้งหมด</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalCost, '#586782')}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalSelling, '#004081')}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>

            {/* Approval result — section-by-section comments live with their
                respective data above; this just records who decided and when */}
            {req.approvalResult && (
              <Card title={req.status === 'approved' ? 'ผลการอนุมัติ' : 'ผลการปฏิเสธ'}>
                <FieldGrid cols={3}>
                  <FieldDisplay label="ผลการพิจารณา" value={req.approvalResult.approvedAt ? 'อนุมัติ' : 'ไม่อนุมัติ'} />
                  <FieldDisplay label="Approver" value={req.approvalResult.approverName} />
                  <FieldDisplay label="วันที่" value={formatDate(req.approvalResult.approvedAt ?? req.approvalResult.rejectedAt ?? '')} />
                </FieldGrid>
                <p style={{ margin: '12px 0 0', fontSize: 12, color: '#586782' }}>
                  ดูคอมเม้นของผู้พิจารณาแยกตาม section ด้านบน
                </p>
              </Card>
            )}

            {/* Status Timeline */}
            <Card title="ประวัติสถานะ">
              <StatusTimeline history={req.history} />
            </Card>

          </div>
      </div>

      <ApproveModal open={approveOpen} request={req} onClose={() => setApproveOpen(false)} onApprove={handleApprove} />
      <RejectModal open={rejectOpen} request={req} comments={{ customerComment, hardwareComment, swComment }} onClose={() => setRejectOpen(false)} onReject={handleReject} />
      <CancelModal open={cancelOpen} request={req} onClose={() => setCancelOpen(false)} onCancel={handleCancel} />
    </>
  )
}
