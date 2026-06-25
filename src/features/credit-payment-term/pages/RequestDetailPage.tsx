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
import { canApproveRequest, canRejectRequest, canEditRequest, canCancelRequest, canViewRequest } from '../utils/permissions'
import { formatCurrency } from '../utils/calculations'
import { formatDateTime, formatCreditTerm } from '../utils/formatters'
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
    const found = await getRequestById(id)
    // A draft that isn't this user's own must not be viewable by direct URL —
    // treat it the same as "not found" rather than leaking its contents.
    const r = found && canViewRequest(currentUser, found) ? found : undefined
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
  const summaryAmount = (value: number, color = '#001122', size?: number, weight: number = 700) => (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: weight, color, fontSize: size }}>
      {formatCurrency(value)}
    </span>
  )

  // Whoever currently has decision authority on this request can leave
  // section-level notes; everyone else only sees what's already been written.
  const canComment = canApproveRequest(currentUser, req) || canRejectRequest(currentUser, req)

  // Every named sub-section below (total, payment schedule, note) is a peer:
  // a thin rule above + bold label, document/quotation style. Deliberately one
  // step below Card-header weight (#586782, not #001122/14px) so these read as
  // sub-sections of their parent card, not as competing top-level headings.
  // `tinted` gets a soft background — reserved for summary/payment data, not
  // notes, so a glance tells "this is a rolled-up figure" from "this is text."
  // One horizontal rhythm for everything inside a quotation block: 14px, matching
  // the table cells below, so the header bar, section labels and table columns
  // all share the same left edge instead of drifting onto their own grid.
  // `framed` bands sit inside a bordered quotationBlock, where the top rule marks
  // a real block-level break (#D0D6DF matches the block's own border weight).
  // Non-framed bands sit inside a plain Card body (e.g. the customer note) —
  // there's no outer box to echo, so the rule can be the same soft tone used
  // for ordinary row dividers, not a hard structural edge.
  const labeledBand = (label: string, right?: React.ReactNode, framed = true, tinted = false) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: framed ? '18px 14px 12px' : '18px 0 12px', borderTop: `1px solid ${framed ? '#D0D6DF' : '#F2F6F8'}`, background: tinted ? '#F8F9FA' : undefined }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#586782' }}>{label}</span>
      {right}
    </div>
  )

  // After a resubmit, live comments are cleared for the fresh round but the
  // prior round's rejection note is preserved on req.approvalResult — surface
  // it inline (only while the live field is still empty) so a reviewer doesn't
  // have to hunt through all 3 sections to find which one was flagged last time.
  //
  // Read-only viewers (sales/accounting, or anyone looking at a decided request)
  // never see a textarea — only an Approver/Rejecter actively deciding a pending
  // request gets the editable box. For read-only viewers, this whole block is a
  // record of the approver's response: hide it entirely until there's actually
  // something to show (a saved note or a past rejection), rather than reserving
  // space for "ยังไม่มีหมายเหตุ" before anyone has reviewed the request at all.
  const sectionComment = (label: string, value: string, editable: boolean, onChange?: (v: string) => void, framed = true, priorComment?: string, placeholder = 'ระบุรายละเอียดเพิ่มเติม เช่น เหตุผล เงื่อนไข หรือข้อมูลประกอบการพิจารณา') => {
    if (!editable && !value.trim() && !priorComment) return null
    return (
      <div>
        {labeledBand(label, undefined, framed)}
        <div style={{ padding: framed ? '0 14px 18px' : '0 0 4px' }}>
          {priorComment && !value.trim() && (
            <div style={{ marginBottom: 8, padding: '7px 10px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 4, fontSize: 12, color: '#7F1D1D' }}>
              เคยถูกปฏิเสธไว้ว่า: <span style={{ fontStyle: 'italic' }}>"{priorComment}"</span>
            </div>
          )}
          {/* A reviewer's note reads as a comment, not page data — frame it red
              (editable and saved alike) so it's unmistakable from ordinary fields. */}
          {editable ? (
            <div style={{ padding: 6, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 4 }}>
              <Textarea value={value} onChange={e => onChange?.(e.target.value)} rows={2} placeholder={placeholder} />
            </div>
          ) : value.trim() ? (
            <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 4, fontSize: 13, color: '#7F1D1D', lineHeight: 1.65, whiteSpace: 'pre-wrap' as const }}>{value}</div>
          ) : null}
        </div>
      </div>
    )
  }

  // Column-header style is shared by every table on this page — same size, weight,
  // color and background — matched to the WorkX host table header (gray #F2F2F2
  // bar, bold navy, normal case) so "this is a header row" looks identical
  // app-wide, not just within this page.
  const tableHeaderCell: React.CSSProperties = { padding: '8px 14px', fontWeight: 700, color: '#004081', fontSize: 12.5, background: '#F2F2F2' }

  // Line items stay informative but quiet (navy at normal weight) — bold navy
  // is reserved for the category subtotal and, more emphatically, the grand
  // total, so a reader's eye lands on the number that actually matters most.
  const itemsTable = (items: QuotationItem[]) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
            {['รายการ', 'ราคาทุน', 'ราคาขาย'].map(h => (
              <th key={h} style={{ ...tableHeaderCell, textAlign: h === 'รายการ' ? 'left' : 'right' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.itemId} style={{ borderBottom: idx === items.length - 1 ? 'none' : '1px solid #F2F6F8' }}>
              <td style={{ padding: '12px 14px' }}>{item.name}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(item.cost, '#586782', undefined, 500)}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(item.sellingPrice, '#004081', undefined, 600)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const totalStrip = (label: string, cost: number, selling: number) => labeledBand(`รวม ${label}`, (
    <span style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>
        ราคาทุน <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: '#586782' }}>{formatCurrency(cost)}</span>
      </span>
      <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>
        ราคาขาย <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: '#004081' }}>{formatCurrency(selling)}</span>
      </span>
    </span>
  ), true, true)

  const installmentStrip = (creditTermDays: number) => labeledBand('Payment Schedule', (
    <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>
      Credit Term: <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: '#004081' }}>{formatCreditTerm(creditTermDays)}</span>
    </span>
  ), true, true)

  const installmentTable = (installments: PaymentInstallment[]) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
            {['งวดที่', '%', 'ยอดชำระ'].map(h => (
              <th key={h} style={{ ...tableHeaderCell, textAlign: h === 'ยอดชำระ' ? 'right' : h === '%' ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {installments.map((inst, idx) => (
            <tr key={inst.installmentNo} style={{ borderBottom: idx === installments.length - 1 ? 'none' : '1px solid #F2F6F8' }}>
              <td style={{ padding: '12px 14px' }}>{inst.installmentNo}</td>
              <td style={{ padding: '12px 14px', color: '#505050', textAlign: 'center' }}>{inst.installmentPercent}%</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(inst.installmentAmount, '#004081', undefined, 600)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // The gradient is a thin identity accent, not a hero band — the label below it
  // carries the same weight as any other Card header (#001122/700/14px on
  // #F2F6F8), so this block reads as a peer of "ข้อมูลคำขอ"/"ข้อมูลลูกค้า", not
  // as the loudest thing on the page.
  const quotationBlock = (quotationNo: string, label: string, gradient: string, items: QuotationItem[], cost: number, selling: number, creditTermDays: number, installments: PaymentInstallment[], extra?: React.ReactNode) => (
    <div style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #D0D6DF', background: '#FFFFFF' }}>
      <div style={{ height: 3, background: gradient, opacity: 0.8 }} />
      <div style={{ background: '#F2F6F8', padding: '12px 14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 12px', borderBottom: '1px solid #D0D6DF' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#001122', letterSpacing: '-0.01em' }}>{label}</span>
        <span style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 500, color: '#586782' }}>Quotation No. </span>
          <span style={{ fontWeight: 600, color: '#586782' }}>{quotationNo}</span>
        </span>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#001122' }}>{req.requestNo}</h1>
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
              <Button size="sm" icon={<CheckCircle size={14} />} onClick={() => setApproveOpen(true)}>อนุมัติ</Button>
            )}
            {canRejectRequest(currentUser, req) && (
              <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={() => setRejectOpen(true)}>ไม่อนุมัติ</Button>
            )}
          </div>
        </div>

        {/* Rejection flag — visible to every role, not just sales, so an approver
            re-deciding a resubmitted request knows to check the section comments
            below for why it was rejected last time. Still-rejected is a blocking
            error (red); already-resubmitted is just a historical note (yellow). */}
        {req.approvalResult?.rejectedAt && (
          <Alert
            type={req.status === 'rejected' ? 'error' : 'warning'}
            title={req.status === 'rejected' ? 'คำขอถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่' : 'เคยถูกปฏิเสธมาก่อน — แก้ไขและส่งใหม่แล้ว'}
          >
            ดูหมายเหตุของผู้พิจารณาในแต่ละหมวดด้านล่าง
          </Alert>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Request Info */}
            <Card title="ข้อมูลคำขอ">
              <FieldGrid cols={3}>
                <FieldDisplay label="Request No." value={req.requestNo} mono preserveLabelCase valueWeight={600} />
                <FieldDisplay label="Proposal No." value={req.proposalNo} mono preserveLabelCase valueWeight={600} />
                <FieldDisplay label="ประเภทการขาย" value={SALE_TYPE_LABELS[req.saleType]} />
                <FieldDisplay label="วันที่สร้าง" value={formatDateTime(req.createdAt)} />
                <FieldDisplay label="อัปเดตล่าสุด" value={formatDateTime(req.updatedAt)} />
                <FieldDisplay label="Version" value={`v${req.version}`} preserveLabelCase />
              </FieldGrid>
            </Card>

            {/* Customer Info */}
            <Card title="ข้อมูลลูกค้า">
              <FieldGrid cols={3}>
                <FieldDisplay label="ประเภทลูกค้า" value={CUSTOMER_TYPE_LABELS[req.customerInfo.type]} />
                {req.customerInfo.type === 'existing' && (
                  <>
                    <FieldDisplay label="ชื่อบริษัท" value={req.customerInfo.data.companyName} />
                    <FieldDisplay label="Default Credit Term" preserveLabelCase>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#004081' }}>Net {req.customerInfo.data.defaultCreditTerm ?? 0}</div>
                    </FieldDisplay>
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
                    <FieldDisplay label="Default Credit Term" preserveLabelCase>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#004081' }}>Net {req.customerInfo.data.defaultCreditTerm ?? 0}</div>
                    </FieldDisplay>
                    <FieldDisplay label="ผู้ติดต่อ" value={req.customerInfo.data.contactPerson || '—'} />
                    <FieldDisplay label="โทรศัพท์" value={req.customerInfo.data.contactPhone || '—'} />
                    <FieldDisplay label="End Customer" value={req.customerInfo.data.endCustomerCompanyName} />
                  </>
                )}
              </FieldGrid>
              {sectionComment('หมายเหตุข้อมูลลูกค้า', customerComment, canComment, setCustomerComment, false, req.approvalResult?.customerComment)}
            </Card>

            {/* Hardware quotation: items + its own payment schedule */}
            {hardwareItems.length > 0 && quotationBlock(hardwareQuotationNo, 'Hardware', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', hardwareItems, hardwareCost, hardwareSelling, req.installments[0]?.creditTermDays ?? 0, req.installments,
              sectionComment('หมายเหตุสำหรับ Hardware', hardwareComment, canComment, setHardwareComment, true, req.approvalResult?.hardwareComment, 'ระบุรายละเอียดเพิ่มเติมของหมวดนี้ เช่น เงื่อนไขการขาย เหตุผลด้านราคา หรือข้อควรพิจารณา'))}

            {/* Software & Installation quotation: items + its own payment schedule */}
            {serviceItems.length > 0 && quotationBlock(serviceQuotationNo, 'Software & Installation', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', serviceItems, serviceCost, serviceSelling, req.swInstallments?.[0]?.creditTermDays ?? 0, req.swInstallments ?? [],
              sectionComment('หมายเหตุสำหรับ Software & Installation', swComment, canComment, setSwComment, true, req.approvalResult?.swComment, 'ระบุรายละเอียดเพิ่มเติมของหมวดนี้ เช่น เงื่อนไขการขาย เหตุผลด้านราคา หรือข้อควรพิจารณา'))}

            {/* Overall total */}
            <Card title="สรุปยอดรวม" noPad>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
                      <th style={{ ...tableHeaderCell, textAlign: 'left' }}>รายการ</th>
                      <th style={{ ...tableHeaderCell, textAlign: 'right' }}>ราคาทุน</th>
                      <th style={{ ...tableHeaderCell, textAlign: 'right' }}>ราคาขาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hardwareItems.length > 0 && (
                      <tr style={{ borderBottom: '1px solid #F2F6F8' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#001122' }}>{hardwareQuotationNo}</span>
                          <span style={{ color: '#586782', fontWeight: 500, marginLeft: 8 }}>Hardware</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(hardwareCost, '#586782', undefined, 500)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(hardwareSelling, '#004081', undefined, 600)}</td>
                      </tr>
                    )}
                    {serviceItems.length > 0 && (
                      <tr style={{ borderBottom: '1px solid #F2F6F8' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#001122' }}>{serviceQuotationNo}</span>
                          <span style={{ color: '#586782', fontWeight: 500, marginLeft: 8 }}>Software &amp; Installation</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(serviceCost, '#586782', undefined, 500)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(serviceSelling, '#004081', undefined, 600)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1.5px solid #D0D6DF', background: '#F8F9FA' }}>
                      <td style={{ padding: '14px', fontWeight: 700, fontSize: 14, color: '#001122' }}>รวมทั้งหมด</td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalCost, '#586782')}</td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalSelling, '#004081', 16)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

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
