import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequestById, approveRequest, rejectRequest, cancelRequest, submitRequest } from '../services/creditTermService'
import { exportPDF } from '../services/exportService'
import type { Request } from '../types/request'
import { SALE_TYPE_LABELS } from '../types/request'
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
import { ArrowLeft, Edit, RefreshCw, Printer, Send, Ban, CheckCircle, XCircle } from 'lucide-react'

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
  const displayProjectName = req.projectName || req.proposalNo
  const separateQuotation = req.saleType === 'hardware_software_installation'
  const hardwareQuotationNo = `${req.proposalNo}-1`
  const serviceQuotationNo = `${req.proposalNo}-${separateQuotation ? '2' : '1'}`
  const hardwareItems = req.quotationItems.filter(item => item.type === 'hardware')
  const serviceItems = req.quotationItems.filter(item => item.type === 'software' || item.type === 'installation')
  const hardwareSelling = hardwareItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const serviceSelling = serviceItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const creditTermDays = req.installments[0]?.creditTermDays ?? req.financial.maxCreditTerm

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#586782', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: '0 0 8px', fontFamily: 'inherit' }}>
              <ArrowLeft size={14} /> ย้อนกลับ
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#001122' }}>{req.requestNo}</h1>
              <StatusBadge status={req.status} />
              {req.version > 1 && (
                <span style={{ fontSize: 12, padding: '2px 8px', background: 'rgba(0,64,129,0.08)', color: '#004081', borderRadius: 6, fontWeight: 600 }}>v{req.version}</span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', color: '#586782', fontSize: 14 }}>
              {displayProjectName} · {customerName} · {SALE_TYPE_LABELS[req.saleType]}
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
                <FieldDisplay label="ชื่อโปรเจกต์" value={displayProjectName} />
                <FieldDisplay label="ประเภทการขาย" value={SALE_TYPE_LABELS[req.saleType]} />
                <FieldDisplay label="Sales" value={`${req.salesName}`} />
                <FieldDisplay label="วันที่สร้าง" value={formatDateTime(req.createdAt)} />
                <FieldDisplay label="อัปเดตล่าสุด" value={formatDateTime(req.updatedAt)} />
                <FieldDisplay label="เวอร์ชัน" value={`v${req.version}`} />
              </FieldGrid>
              {req.requestPurpose && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: '#586782', fontWeight: 600, marginBottom: 4 }}>วัตถุประสงค์</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#001122', lineHeight: 1.6 }}>{req.requestPurpose}</p>
                </div>
              )}
              {req.remark && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#586782', fontWeight: 600, marginBottom: 4 }}>หมายเหตุ</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#505060' }}>{req.remark}</p>
                </div>
              )}
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

            {/* Quotation Items */}
            <Card title="รายการสินค้า / ใบเสนอราคา">
              {[
                { no: hardwareQuotationNo, title: 'Hardware', items: hardwareItems, total: hardwareSelling, color: '#002B5C' },
                { no: serviceQuotationNo, title: 'Software & Installation', items: serviceItems, total: serviceSelling, color: '#3D5580' },
              ].map(group => (
                <div key={`${group.no}-${group.title}`} style={{ marginBottom: 18, border: '1px solid #D0D6DF', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 14px', background: group.color }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{group.no}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.78)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group.title}</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {group.items.map(item => (
                        <tr key={item.itemId} style={{ borderBottom: '1px solid #F2F6F8' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.name}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{formatCurrency(item.sellingPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#586782' }}>รวม</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#004081' }}>{formatCurrency(group.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid #D0D6DF' }}>
                <span style={{ fontWeight: 700, color: '#001122' }}>สรุปรวม</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: '#004081' }}>{formatCurrency(req.financial.totalSelling)}</span>
              </div>
            </Card>

            {/* Payment Schedule */}
            <Card title="Payment Schedule">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#505060', marginBottom: 4 }}>
                  <strong>Credit Term:</strong> {formatCreditTerm(creditTermDays)}
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
                    {['งวด', '%', 'จำนวนเงิน', 'หมายเหตุ'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {req.installments.map(inst => (
                    <tr key={inst.installmentNo} style={{ borderBottom: '1px solid #D0D6DF' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{inst.installmentNo}</td>
                      <td style={{ padding: '10px 12px' }}>{inst.installmentPercent}%</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{formatCurrency(inst.installmentAmount)}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#929EB4' }}>{inst.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
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
                  <p style={{ margin: 0, fontSize: 14, padding: '10px 12px', background: req.approvalResult.approvedAt ? '#F0FDF4' : '#FEF2F2', borderRadius: 8, border: `1px solid ${req.approvalResult.approvedAt ? '#86EFAC' : '#FCA5A5'}` }}>
                    {req.approvalResult.decisionComment}
                  </p>
                </div>
                {req.approvalResult.suggestion && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#586782', fontWeight: 600, marginBottom: 4 }}>ข้อเสนอแนะสำหรับ Sales</div>
                    <p style={{ margin: 0, fontSize: 14, padding: '10px 12px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FCD34D' }}>
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
