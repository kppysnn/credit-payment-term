import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequestById, approveRequest, rejectRequest, cancelRequest, submitRequest } from '../services/creditTermService'
import { exportPDF } from '../services/exportService'
import type { Request, PaymentInstallment, QuotationItem } from '../types/request'
import { SALE_TYPE_LABELS } from '../types/request'
import { CUSTOMER_TYPE_LABELS } from '../types/customer'
import type { RequestCustomerInfo } from '../types/customer'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { StatusTimeline } from '../../../components/ui/StatusTimeline'
import { FieldDisplay, FieldGrid } from '../../../components/ui/Card'
import { Section } from '../../../components/ui/Section'
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
import { FiSlash, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { EditIcon, RefreshIcon, PrinterIcon } from '../../../components/icons/FigmaIcons'

// Strip fields that change on every resubmit *regardless* of what sales
// actually edited, before comparing against previousSnapshot — otherwise
// every section reads as "changed" on every resubmission, even an
// unedited one. Two known sources of false positives, both from
// EditRequestPage's buildPatch() round-trip (form-flat-fields -> Request):
// itemId is regenerated for every quotation item every time (irrelevant,
// internal), and optional string/number fields round-trip through the
// form's `?? ''` / `?? 0` fallbacks, turning an absent field into an
// explicit empty one. Comparing only the fields a user could have actually
// typed into, with the same fallback applied on both sides, fixes both.
function normalizeItemsForCompare(items: QuotationItem[]) {
  return items.map(i => ({ type: i.type, name: i.name, sellingPrice: i.sellingPrice, cost: i.cost }))
}
// creditTermDays deliberately excluded per-row: the form only exposes ONE
// shared "Credit Term" field per quotation block (RequestFormStepper.tsx),
// so buildPatch (EditRequestPage.tsx) always overwrites every row's
// creditTermDays with that single value on every resubmit -- even an
// unedited one, for data that happened to have per-row variation already
// (e.g. mock req004). Comparing it per-row produced a false "changed" on a
// pure no-op resubmit. The shared value itself is still compared separately
// via sharedCreditTermDays below, since that's the actual editable field.
function normalizeInstallmentsForCompare(installments: PaymentInstallment[]) {
  return installments.map(i => ({ installmentPercent: i.installmentPercent, paymentCondition: i.paymentCondition }))
}
function normalizeCustomerInfoForCompare(ci: RequestCustomerInfo) {
  if (ci.type === 'new') return { type: ci.type, companyName: ci.data.companyName, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  if (ci.type === 'existing') return { type: ci.type, customerId: ci.data.customerId, companyName: ci.data.companyName, defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  return { type: ci.type, resellerId: ci.data.resellerId, resellerCompanyName: ci.data.resellerCompanyName, defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '', endCustomerCompanyName: ci.data.endCustomerCompanyName }
}

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
  const isLumpSum = req.saleType === 'lump_sum'
  const hardwareQuotationNo = `${req.proposalNo}-1`
  const serviceQuotationNo = `${req.proposalNo}-${separateQuotation ? '2' : '1'}`
  const hardwareItems = req.quotationItems.filter(item => item.type === 'hardware')
  const serviceItems = req.quotationItems.filter(item => item.type === 'software' || item.type === 'installation')
  const hardwareSelling = hardwareItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const serviceSelling = serviceItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const hardwareCost = hardwareItems.reduce((sum, item) => sum + item.cost, 0)
  const serviceCost = serviceItems.reduce((sum, item) => sum + item.cost, 0)

  // Per-section "did sales actually change this since the rejection" flags
  // for the approver re-reviewing a resubmission — see Request.previousSnapshot.
  // Only ever true right after a resubmit (snapshot is undefined otherwise,
  // e.g. on a first-time pending request, so every flag is false by default).
  // Deliberately a coarse "any field in this section differs" check, not a
  // field-level diff — cheap, and enough to tell the approver where to look.
  const prev = req.previousSnapshot
  const customerInfoChanged = !!prev &&
    JSON.stringify(normalizeCustomerInfoForCompare(req.customerInfo)) !== JSON.stringify(normalizeCustomerInfoForCompare(prev.customerInfo))
  const hardwareChanged = !!prev && (
    JSON.stringify(normalizeItemsForCompare(hardwareItems)) !== JSON.stringify(normalizeItemsForCompare(prev.quotationItems.filter(i => i.type === 'hardware'))) ||
    req.installmentCount !== prev.installmentCount ||
    (req.installments[0]?.creditTermDays ?? 0) !== (prev.installments[0]?.creditTermDays ?? 0) ||
    JSON.stringify(normalizeInstallmentsForCompare(req.installments)) !== JSON.stringify(normalizeInstallmentsForCompare(prev.installments))
  )
  const swChanged = !!prev && (
    JSON.stringify(normalizeItemsForCompare(serviceItems)) !== JSON.stringify(normalizeItemsForCompare(prev.quotationItems.filter(i => i.type === 'software' || i.type === 'installation'))) ||
    req.swInstallmentCount !== prev.swInstallmentCount ||
    (req.swInstallments?.[0]?.creditTermDays ?? 0) !== (prev.swInstallments?.[0]?.creditTermDays ?? 0) ||
    JSON.stringify(normalizeInstallmentsForCompare(req.swInstallments ?? [])) !== JSON.stringify(normalizeInstallmentsForCompare(prev.swInstallments ?? []))
  )
  // Lump sum renders hardware+software+installation as one merged block, so
  // its "changed since last rejection" flag is just the two section flags
  // ORed together — hardwareChanged already covers the merged installments
  // (they live in req.installments for lump sum) and swChanged's item filter
  // still catches software/installation item edits.
  const lumpSumChanged = hardwareChanged || swChanged
  const changedBadge = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#004081', background: '#D9F0F0', borderRadius: 4, padding: '2px 8px' }}>
      มีการแก้ไขจากครั้งก่อน
    </span>
  )
  const changedBadgeOnGradient = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#FFFFFF', background: 'rgba(255,255,255,0.22)', borderRadius: 4, padding: '2px 8px' }}>
      มีการแก้ไขจากครั้งก่อน
    </span>
  )
  const summaryAmount = (value: number, color = '#586782', size?: number, weight: number = 700) => (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: weight, color, fontSize: size }}>
      {formatCurrency(value)}
    </span>
  )

  // Whoever currently has decision authority on this request can leave
  // section-level notes; everyone else only sees what's already been written.
  const canComment = canApproveRequest(currentUser, req) || canRejectRequest(currentUser, req)

  // Every named sub-section below (total, payment schedule, note) is a peer:
  // a thin rule above + bold label, document/quotation style. Deliberately one
  // step below Card-header weight (#586782, not #586782/14px) so these read as
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
      {/* Plain weight — this is a label ("รวม Hardware", "Payment Schedule"),
          the same category as every other label in the app; the top rule +
          its own padded band already mark it as a sub-section, weight
          doesn't need to add to that. Matches RequestFormStepper's parallel
          "รวม {summaryLabel}" strip (see feedback_form_label_weight_drift
          memory for why these two files have to move together). */}
      <span style={{ fontSize: 13, fontWeight: 400, color: '#586782' }}>{label}</span>
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
  // Red used to mean "this is a comment field" unconditionally — every note
  // box was red-framed even on an approved request with a perfectly
  // positive note, AND the editable Textarea (white, per FormField.tsx's
  // normal styling) sat inside that red frame, reading as a red box wrapped
  // around a white box. Doubled up further whenever a prior-round rejection
  // quote was also showing above it — two reddish boxes stacked.
  // Red now means what it actually says: an active rejection. The editable
  // field is just a normal <Textarea> (the label above it already says
  // "this is a comment field," no extra frame needed). The prior-rejection
  // quote is a left-border accent, not a competing box. A *saved* note only
  // gets the red treatment if the request is currently rejected — an
  // approved request's note reads as a normal saved note, not a warning.
  const sectionComment = (label: string, value: string, editable: boolean, onChange?: (v: string) => void, framed = true, priorComment?: string, placeholder = 'ระบุรายละเอียดเพิ่มเติม เช่น เหตุผล เงื่อนไข หรือข้อมูลประกอบการพิจารณา') => {
    if (!editable && !value.trim() && !priorComment) return null
    const isRejected = req.status === 'rejected'
    return (
      <div>
        {labeledBand(label, undefined, framed)}
        <div style={{ padding: framed ? '0 14px 18px' : '0 0 4px' }}>
          {priorComment && !value.trim() && (
            <div style={{ marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #F3554F', fontSize: 12, color: '#7F1D1D', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 400 }}>ครั้งก่อนถูกปฏิเสธว่า:</span> <span style={{ fontStyle: 'italic' }}>"{priorComment}"</span>
            </div>
          )}
          {editable ? (
            <Textarea value={value} onChange={e => onChange?.(e.target.value)} rows={2} placeholder={placeholder} />
          ) : value.trim() ? (
            <div style={{
              padding: '10px 12px', borderRadius: 4, fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' as const,
              background: isRejected ? '#FEF2F2' : '#F2F6F8',
              border: `1px solid ${isRejected ? '#FCA5A5' : '#D0D6DF'}`,
              color: isRejected ? '#7F1D1D' : '#586782',
            }}>{value}</div>
          ) : null}
        </div>
      </div>
    )
  }

  // Column-header style is shared by every table on this page — matched to the
  // WorkX host table header (white bg, regular-weight navy label) so "this is a
  // header row" looks identical app-wide, not just within this page. Hierarchy
  // comes from color, not boldness — the host's own tables carry no bold text
  // at all, reserving weight for nothing and letting navy/gray do the work.
  // Header padding matches every body row's padding exactly (12px 14px) — the
  // WorkX host's own table cells (Exzy_WorkX 851:2649) share one padding spec
  // between header and body, never a lighter header.
  const tableHeaderCell: React.CSSProperties = { padding: '12px 14px', fontWeight: 400, color: '#004081', fontSize: 12.5 }

  const itemsTable = (items: QuotationItem[]) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['รายการ', 'ราคาทุน', 'ราคาขาย'].map(h => (
              <th key={h} style={{ ...tableHeaderCell, textAlign: h === 'รายการ' ? 'left' : 'right' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.itemId} style={{ borderTop: '1px solid #F2F6F8' }}>
              <td style={{ padding: '12px 14px' }}>{item.name}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(item.cost, '#586782', undefined, 400)}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(item.sellingPrice, '#004081', undefined, 400)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const totalStrip = (label: string, cost: number, selling: number) => labeledBand(label.startsWith('รวม') ? label : `รวม ${label}`, (
    <span style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: '#586782', fontWeight: 400 }}>
        ราคาทุน <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 500, color: '#586782' }}>{formatCurrency(cost)}</span>
      </span>
      <span style={{ fontSize: 12, color: '#586782', fontWeight: 400 }}>
        ราคาขาย <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: '#004081' }}>{formatCurrency(selling)}</span>
      </span>
    </span>
  ), true, true)

  // Per-row credit term only shows as a table column once it actually varies —
  // when every row carries the same value, the single summary line above the
  // table already says it once, more legibly than repeating it on every row.
  const hasPerRowCreditTerm = (installments: PaymentInstallment[]) =>
    installments.length > 1 && new Set(installments.map(i => i.creditTermDays)).size > 1

  const installmentStrip = (creditTermDays: number, installments: PaymentInstallment[]) =>
    hasPerRowCreditTerm(installments) ? labeledBand('Payment Schedule', null, true, true) : labeledBand('Payment Schedule', (
      <span style={{ fontSize: 12, color: '#586782', fontWeight: 400 }}>
        Credit Term: <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: '#004081' }}>{formatCreditTerm(creditTermDays)}</span>
      </span>
    ), true, true)

  // Equal thirds (explicit user call, weighed against content-proportional
  // widths) — matches RequestFormStepper's own many-installment table.
  // Alignment stays semantic regardless of width: ID left, % centered, amount
  // right (universal currency convention). A 4th "เครดิตเทอม" column appears
  // only when the rows actually carry different terms (see hasPerRowCreditTerm).
  const installmentTable = (installments: PaymentInstallment[]) => {
    const perRowCt = hasPerRowCreditTerm(installments)
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...tableHeaderCell, textAlign: 'left', whiteSpace: 'nowrap', width: perRowCt ? '20%' : '33.34%' }}>งวดที่</th>
              <th style={{ ...tableHeaderCell, textAlign: 'center', whiteSpace: 'nowrap', width: perRowCt ? '24%' : '33.33%' }}>%</th>
              {perRowCt && <th style={{ ...tableHeaderCell, textAlign: 'center', whiteSpace: 'nowrap', width: '26%' }}>เครดิตเทอม</th>}
              <th style={{ ...tableHeaderCell, textAlign: 'right', whiteSpace: 'nowrap', width: perRowCt ? '30%' : '33.33%' }}>ยอดชำระ</th>
            </tr>
          </thead>
          <tbody>
            {installments.map(inst => (
              <tr key={inst.installmentNo} style={{ borderTop: '1px solid #F2F6F8' }}>
                <td style={{ padding: '12px 14px' }}>{inst.installmentNo}</td>
                <td style={{ padding: '12px 14px', color: '#505050', textAlign: 'center' }}>{inst.installmentPercent.toFixed(2)}%</td>
                {perRowCt && <td style={{ padding: '12px 14px', color: '#505050', textAlign: 'center' }}>{formatCreditTerm(inst.creditTermDays)}</td>}
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(inst.installmentAmount, '#004081', undefined, 400)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // No stroked border — but the gradient header still needs to read as
  // *attached* to its own content, not a rounded chip floating on the white
  // panel above it. Solved with fill instead of stroke: the header is
  // top-rounded only (it caps the block from above) and the body gets a
  // soft tint (#F8F9FA) with bottom rounding, so header+body together form
  // one visually contiguous unit purely through color, no line needed.
  const quotationBlock = (quotationNo: string, label: string, gradient: string, items: QuotationItem[], cost: number, selling: number, creditTermDays: number, installments: PaymentInstallment[], extra?: React.ReactNode, changed?: boolean) => (
    <div>
      <div style={{ background: gradient, borderRadius: '4px 4px 0 0', padding: '12px 14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 12px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>{label}</span>
          {changed && changedBadgeOnGradient}
        </span>
        <span style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.78)' }}>Quotation No. </span>
          <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{quotationNo}</span>
        </span>
      </div>
      <div style={{ background: '#F8F9FA', borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
        {itemsTable(items)}
        {totalStrip(label, cost, selling)}
        {installments.length > 0 && (
          <div style={{ paddingBottom: 16 }}>
            {installmentStrip(creditTermDays, installments)}
            {installmentTable(installments)}
          </div>
        )}
        {extra}
      </div>
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
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: '#586782' }}>{req.requestNo}</h1>
              <StatusBadge status={req.status} />
              {req.version > 1 && (
                <span style={{ fontSize: 12, padding: '2px 8px', background: 'rgba(0,64,129,0.08)', color: '#004081', borderRadius: 4, fontWeight: 600 }}>v{req.version}</span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', color: '#586782', fontSize: 14 }}>
              {req.proposalNo} · {customerName} · {SALE_TYPE_LABELS[req.saleType]}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" icon={<PrinterIcon size={15} />} onClick={() => exportPDF(req)}>Print / PDF</Button>

            {currentUser.role === 'sales' && req.status === 'draft' && (
              <Button size="sm" loading={submitLoading} onClick={handleSubmit}>ส่งคำขออนุมัติ</Button>
            )}
            {canEditRequest(currentUser, req) && (
              <Link to={`/requests/${req.id}/edit`}>
                <Button variant="secondary" size="sm" icon={req.status === 'rejected' ? <RefreshIcon size={15} /> : <EditIcon size={15} />}>
                  {req.status === 'rejected' ? 'แก้ไขและส่งใหม่' : 'แก้ไข'}
                </Button>
              </Link>
            )}
            {canCancelRequest(currentUser, req) && (
              <Button variant="danger" size="sm" icon={<FiSlash size={15} />} onClick={() => setCancelOpen(true)}>ยกเลิก</Button>
            )}
            {canApproveRequest(currentUser, req) && (
              <Button size="sm" icon={<FiCheckCircle size={15} />} onClick={() => setApproveOpen(true)}>อนุมัติ</Button>
            )}
            {canRejectRequest(currentUser, req) && (
              <Button variant="danger" size="sm" icon={<FiXCircle size={15} />} onClick={() => setRejectOpen(true)}>ไม่อนุมัติ</Button>
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

        {/* One white panel for the whole content area, matching WorkX's own
            assembled form (Exzy_WorkX "Edit My work", 1190:5406) — it's a
            single continuous white surface, not a borderless page bg with
            each field floating loose on it. <Section> divides *inside* this
            one surface (title + thin rule); the surface itself is what was
            missing when the per-section <Card> boxes were first removed. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, background: '#fff', border: '1px solid #D0D6DF', borderRadius: 4, padding: 32 }}>
            {/* Request Info */}
            <Section title="ข้อมูลคำขอ">
              <FieldGrid cols={3}>
                <FieldDisplay label="Request No." value={req.requestNo} mono preserveLabelCase valueWeight={600} />
                <FieldDisplay label="Proposal No." value={req.proposalNo} mono preserveLabelCase valueWeight={600} />
                <FieldDisplay label="ประเภทการขาย" value={SALE_TYPE_LABELS[req.saleType]} />
                <FieldDisplay label="วันที่สร้าง" value={formatDateTime(req.createdAt)} />
                <FieldDisplay label="อัปเดตล่าสุด" value={formatDateTime(req.updatedAt)} />
                <FieldDisplay label="Version" value={`v${req.version}`} preserveLabelCase />
              </FieldGrid>
            </Section>

            {/* Customer Info */}
            <Section title="ข้อมูลลูกค้า" actions={customerInfoChanged ? changedBadge : undefined}>
              <FieldGrid cols={3}>
                <FieldDisplay label="ประเภทลูกค้า" value={CUSTOMER_TYPE_LABELS[req.customerInfo.type]} />
                {req.customerInfo.type === 'existing' && (
                  <>
                    <FieldDisplay label="ชื่อบริษัท" value={req.customerInfo.data.companyName} />
                    <FieldDisplay label="Default Credit Term" preserveLabelCase>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#004081' }}>Net {req.customerInfo.data.defaultCreditTerm ?? 0}</div>
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
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#004081' }}>Net {req.customerInfo.data.defaultCreditTerm ?? 0}</div>
                    </FieldDisplay>
                    <FieldDisplay label="ผู้ติดต่อ" value={req.customerInfo.data.contactPerson || '—'} />
                    <FieldDisplay label="โทรศัพท์" value={req.customerInfo.data.contactPhone || '—'} />
                    <FieldDisplay label="End Customer" value={req.customerInfo.data.endCustomerCompanyName} />
                  </>
                )}
              </FieldGrid>
              {sectionComment('หมายเหตุข้อมูลลูกค้า', customerComment, canComment, setCustomerComment, false, req.approvalResult?.customerComment)}
            </Section>

            {/* Lump sum: one merged quotation block covering every item + the single payment schedule */}
            {isLumpSum && req.quotationItems.length > 0 && quotationBlock(hardwareQuotationNo, 'รวมทุกรายการ', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', req.quotationItems, req.financial.totalCost, req.financial.totalSelling, req.installments[0]?.creditTermDays ?? 0, req.installments,
              sectionComment('หมายเหตุ', hardwareComment, canComment, setHardwareComment, true, req.approvalResult?.hardwareComment, 'ระบุรายละเอียดเพิ่มเติมของคำขอนี้ เช่น เงื่อนไขการขาย เหตุผลด้านราคา หรือข้อควรพิจารณา'), lumpSumChanged)}

            {/* Hardware quotation: items + its own payment schedule */}
            {!isLumpSum && hardwareItems.length > 0 && quotationBlock(hardwareQuotationNo, 'Hardware', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', hardwareItems, hardwareCost, hardwareSelling, req.installments[0]?.creditTermDays ?? 0, req.installments,
              sectionComment('หมายเหตุสำหรับ Hardware', hardwareComment, canComment, setHardwareComment, true, req.approvalResult?.hardwareComment, 'ระบุรายละเอียดเพิ่มเติมของหมวดนี้ เช่น เงื่อนไขการขาย เหตุผลด้านราคา หรือข้อควรพิจารณา'), hardwareChanged)}

            {/* Software & Installation quotation: items + its own payment schedule */}
            {!isLumpSum && serviceItems.length > 0 && quotationBlock(serviceQuotationNo, 'Software & Installation', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', serviceItems, serviceCost, serviceSelling, req.swInstallments?.[0]?.creditTermDays ?? 0, req.swInstallments ?? [],
              sectionComment('หมายเหตุสำหรับ Software & Installation', swComment, canComment, setSwComment, true, req.approvalResult?.swComment, 'ระบุรายละเอียดเพิ่มเติมของหมวดนี้ เช่น เงื่อนไขการขาย เหตุผลด้านราคา หรือข้อควรพิจารณา'), swChanged)}

            {/* Overall total */}
            <Section title="สรุปยอดรวม">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ ...tableHeaderCell, textAlign: 'left' }}>รายการ</th>
                      <th style={{ ...tableHeaderCell, textAlign: 'right' }}>ราคาทุน</th>
                      <th style={{ ...tableHeaderCell, textAlign: 'right' }}>ราคาขาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLumpSum ? (
                      req.quotationItems.length > 0 && (
                        <tr style={{ borderTop: '1px solid #F2F6F8' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#586782' }}>{hardwareQuotationNo}</span>
                            <span style={{ color: '#586782', marginLeft: 8 }}>รวมทุกรายการ</span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalCost, '#586782', undefined, 400)}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalSelling, '#004081', undefined, 500)}</td>
                        </tr>
                      )
                    ) : (
                      <>
                        {hardwareItems.length > 0 && (
                          <tr style={{ borderTop: '1px solid #F2F6F8' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontVariantNumeric: 'tabular-nums', color: '#586782' }}>{hardwareQuotationNo}</span>
                              <span style={{ color: '#586782', marginLeft: 8 }}>Hardware</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(hardwareCost, '#586782', undefined, 400)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(hardwareSelling, '#004081', undefined, 500)}</td>
                          </tr>
                        )}
                        {serviceItems.length > 0 && (
                          <tr style={{ borderTop: '1px solid #F2F6F8' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontVariantNumeric: 'tabular-nums', color: '#586782' }}>{serviceQuotationNo}</span>
                              <span style={{ color: '#586782', marginLeft: 8 }}>Software &amp; Installation</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(serviceCost, '#586782', undefined, 400)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(serviceSelling, '#004081', undefined, 500)}</td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid #D0D6DF', background: '#F8F9FA' }}>
                      <td style={{ padding: '14px', fontWeight: 600, fontSize: 14, color: '#586782' }}>รวมทั้งหมด</td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalCost, '#586782', undefined, 500)}</td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>{summaryAmount(req.financial.totalSelling, '#004081', 16, 700)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>

            {/* Status Timeline */}
            <Section title="ประวัติสถานะ">
              <StatusTimeline history={req.history} />
            </Section>

          </div>
      </div>

      <ApproveModal open={approveOpen} request={req} customerName={customerName} onClose={() => setApproveOpen(false)} onApprove={handleApprove} />
      <RejectModal open={rejectOpen} request={req} customerName={customerName} comments={{ customerComment, hardwareComment, swComment }} onClose={() => setRejectOpen(false)} onReject={handleReject} />
      <CancelModal open={cancelOpen} request={req} customerName={customerName} onClose={() => setCancelOpen(false)} onCancel={handleCancel} />
    </>
  )
}
