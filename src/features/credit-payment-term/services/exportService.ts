/**
 * Export Service
 * Handles A4 print and PDF export.
 * PDF uses browser print-to-PDF (window.print) as the primary method.
 * html2pdf.js can be wired in here if added to dependencies.
 */
import type { Request, PaymentInstallment, QuotationItem } from '../types/request'
import { SALE_TYPE_LABELS } from '../types/request'
import { getStatusConfig } from '../utils/status'
import { formatCreditTerm } from '../utils/formatters'

export function printRequest(requestId: string): void {
  window.open(`/print/${requestId}`, '_blank')
}

export function exportPDF(req: Request): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('กรุณาอนุญาตให้เปิด popup ใหม่เพื่อ export PDF')
    return
  }
  printWindow.document.write(buildPrintHTML(req))
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}

// Font/color/weight tokens matched directly against the live components this
// document mirrors (FormField.tsx's FieldDisplay, Section.tsx, StatusBadge.tsx,
// RequestDetailPage.tsx's itemsTable/summary table) as of 2026-06-30 — this had
// drifted back to a stale draft (thin non-uppercase labels instead of
// FieldDisplay's 11px/700/uppercase eyebrow, status text colored directly
// instead of FieldDisplay's "icon carries color, text stays gray" rule,
// items table missing the cost column the live page shows). Re-synced.
//
// Deliberately KEPT different from the live screens, same as before: real
// borders on every table cell, not the live tables' soft #F2F6F8 row tints —
// printed/grayscale output can't lean on subtle background color the way
// screen UI can.
const PRINT_STYLES = `
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  html { display: flex; justify-content: center; background: #F2F6F8; }
  /* Pinned to A4's actual mm width instead of "width:100%" — that stretched
     the whole document to fill whatever screen/window opened the popup, so
     the layout (and, once the browser scaled that down to fit an A4 page on
     print, the effective font size) came out different on every screen. This
     keeps the on-screen preview and the printed page the same fixed size. */
  body { font-family: 'Poppins', 'Noto Sans Thai', system-ui, sans-serif; font-size: 12px; color: #505050; line-height: 1.6; margin: 0; width: 210mm; min-height: 297mm; background: #fff; }
  .container { width: 100%; padding: 16mm 18mm; }
  @media print {
    html { background: #fff; }
    body { width: auto; min-height: 0; padding: 0; }
    .container { padding: 0; }
  }

  /* The single fix that matters most for "เนื้อหาเดียวกันถูกแยกหน้า": wrap any
     block that must never be torn across a page boundary in this. A row
     either fits whole on the current page, or moves whole to the next one —
     it never splits with half its content stranded on each side. */
  .keep { break-inside: avoid; page-break-inside: avoid; }
  .no-orphan-after { break-after: avoid; page-break-after: avoid; }

  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004081; padding-bottom: 14px; margin-bottom: 22px; }
  h1 { font-size: 19px; font-weight: 500; color: #586782; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sub { font-size: 11px; color: #586782; }
  .status { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #505050; flex-shrink: 0; white-space: nowrap; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  .block { margin-bottom: 26px; }
  .section-title { font-size: 15px; font-weight: 500; color: #586782; border-bottom: 1px solid #D0D6DF; padding-bottom: 8px; margin-bottom: 14px; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
  /* Matches FieldDisplay (Card.tsx) exactly: 11px/700/uppercase/0.06em — was
     10px/400/sentence-case, which read as flat body text instead of a label,
     the main reason the request/customer info read as a wall of text. */
  .field-label { font-size: 11px; font-weight: 700; color: #586782; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .field-val { font-size: 13px; color: #586782; line-height: 1.5; }
  .field-val.mono { font-variant-numeric: tabular-nums; }
  .hint { font-size: 11px; color: #586782; margin-top: 10px; }

  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #F2F6F8; font-weight: 400; text-align: left; padding: 8px 10px; border: 1px solid #D0D6DF; color: #004081; font-size: 11px; }
  td { padding: 7px 10px; border: 1px solid #D0D6DF; color: #586782; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; } /* repeats on every page a long table spans */
  .mono { font-variant-numeric: tabular-nums; }

  .quote-group { margin: 14px 0 20px; }
  .quote-core { border-radius: 4px; overflow: hidden; }
  .quote-core table { border-radius: 0; }
  .quote-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 12px; background: linear-gradient(135deg, #66C5C5 0%, #004081 100%); padding: 9px 12px; border-radius: 4px 4px 0 0; }
  .quote-no { font-size: 13px; font-weight: 700; color: #fff; }
  .quote-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 0.06em; }

  .schedule-strip { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 4px 12px; padding: 8px 10px; background: #F2F6F8; border: 1px solid #D0D6DF; border-top: none; }
  .schedule-label { font-size: 11px; font-weight: 600; color: #586782; }
  .credit-term { font-size: 11px; color: #586782; }
  .credit-term .mono { font-size: 12px; font-weight: 700; color: #004081; }

  .comment-box { padding: 10px; border: 1px solid #D0D6DF; border-top: none; }

  .solution-tags { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 0; }
  .solution-tag { display: inline-flex; align-items: center; min-height: 22px; max-width: 100%; padding: 3px 8px; background: #D9F0F0; border-radius: 4px; font-size: 11px; color: #004081; line-height: 1.4; word-break: break-word; }

  /* The one bold top-tier figure on the page, matching the live detail
     page's "สรุปยอดรวม" convention (one grand total, everything else lighter). */
  tfoot td { padding: 12px 10px; font-weight: 600; font-size: 13px; color: #586782; background: #F8F9FA; border-top: 2px solid #D0D6DF; }
  tfoot td.amount { color: #004081; font-size: 15px; font-weight: 700; }

  .doc-footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #D0D6DF; font-size: 10px; color: #586782; text-align: center; }
`

function field(label: string, value: string, mono = false, span2 = false): string {
  return `<div class="field keep"${span2 ? ' style="grid-column:span 2"' : ''}><div class="field-label">${label}</div><div class="field-val${mono ? ' mono' : ''}">${value}</div></div>`
}

function buildPrintHTML(req: Request): string {
  const statusCfg = getStatusConfig(req.status)
  const isLumpSum = req.saleType === 'lump_sum'
  const separateQuotation = req.saleType === 'hardware_software_installation'
  const hardwareQuotationNo = `${req.proposalNo}-1`
  const serviceQuotationNo = `${req.proposalNo}-${separateQuotation ? '2' : '1'}`
  const hardwareItems = req.quotationItems.filter(item => item.type === 'hardware')
  const serviceItems = req.quotationItems.filter(item => item.type === 'software' || item.type === 'installation')
  const hardwareSelling = hardwareItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const serviceSelling = serviceItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const hardwareCost = hardwareItems.reduce((sum, item) => sum + item.cost, 0)
  const serviceCost = serviceItems.reduce((sum, item) => sum + item.cost, 0)

  return `<!DOCTYPE html><html><head><title>${req.requestNo}</title>
<style>${PRINT_STYLES}</style></head><body>
<div class="container">
  <div class="doc-header keep">
    <div>
      <h1>Credit &amp; Payment Term Approval Request</h1>
      <div class="sub">${req.requestNo} · Version ${req.version} · สร้างเมื่อ ${new Date(req.createdAt).toLocaleDateString('th-TH')}</div>
    </div>
    <div class="status"><span class="status-dot" style="background:${statusCfg.iconColor}"></span>${statusCfg.label}</div>
  </div>

  <div class="block keep">
    <div class="section-title">1. ข้อมูลคำขอ</div>
    <div class="grid2">
      ${field('Proposal No.', req.proposalNo, true)}
      ${field('ประเภทการขาย', SALE_TYPE_LABELS[req.saleType])}
      ${field('Sales', `${req.salesName} (${req.salesEmail})`, false, true)}
      ${req.requestPurpose ? field('วัตถุประสงค์', req.requestPurpose, false, true) : ''}
    </div>
  </div>

  <div class="block keep">
    <div class="section-title">2. ข้อมูลลูกค้า</div>
    ${buildCustomerSection(req)}
    ${req.customerComment ? field('หมายเหตุข้อมูลลูกค้า', req.customerComment, false, true) : ''}
  </div>

  <div class="block">
    <div class="section-title">3. ใบเสนอราคาและ Payment Schedule</div>
    ${isLumpSum
      ? (req.quotationItems.length > 0 ? buildQuotationGroup(hardwareQuotationNo, 'รวมทุกรายการ', req.quotationItems, req.financial.totalCost, req.financial.totalSelling, req.installments, req.hardwareComment, req.solutions) : '')
      : `${hardwareItems.length > 0 ? buildQuotationGroup(hardwareQuotationNo, 'Hardware', hardwareItems, hardwareCost, hardwareSelling, req.installments, req.hardwareComment, req.solutions) : ''}
         ${serviceItems.length > 0 ? buildQuotationGroup(serviceQuotationNo, 'Software & Installation', serviceItems, serviceCost, serviceSelling, req.swInstallments ?? [], req.swComment, req.swSolutions) : ''}`}
    ${isLumpSum
      ? buildGrandTotal(req, req.quotationItems.length > 0 ? [{ label: `${hardwareQuotationNo}  รวมทุกรายการ`, cost: req.financial.totalCost, selling: req.financial.totalSelling }] : [])
      : buildGrandTotal(req, [
          ...(hardwareItems.length > 0 ? [{ label: `${hardwareQuotationNo}  Hardware`, cost: hardwareCost, selling: hardwareSelling }] : []),
          ...(serviceItems.length > 0 ? [{ label: `${serviceQuotationNo}  Software &amp; Installation`, cost: serviceCost, selling: serviceSelling }] : []),
        ])}
  </div>

  ${req.approvalResult ? `<div class="block keep">
    <div class="section-title">4. ผลการพิจารณา</div>
    <div class="grid2">
      ${field('ผลการพิจารณา', req.approvalResult.approvedAt ? 'อนุมัติ' : 'ไม่อนุมัติ')}
      ${field('ผู้อนุมัติ', req.approvalResult.approverName)}
    </div>
    <div class="hint">ดูหมายเหตุของผู้พิจารณาแยกตามหมวดด้านบน</div>
  </div>` : ''}

  <div class="doc-footer">${req.requestNo} · พิมพ์เมื่อ ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div></body></html>`
}

function buildQuotationGroup(no: string, title: string, items: QuotationItem[], cost: number, selling: number, installments: PaymentInstallment[], comment?: string, solutions?: string[]): string {
  return `<div class="quote-group">
    <div class="quote-core keep">
      <div class="quote-head no-orphan-after"><span class="quote-no">${no}</span><span class="quote-label">${title}</span></div>
      <table>
        <thead><tr><th>รายการ</th><th style="text-align:right">ราคาทุน</th><th style="text-align:right">ราคาขาย</th></tr></thead>
        <tbody>
          ${items.map(i => `<tr>
            <td>${i.name}</td>
            <td class="mono" style="text-align:right">${i.cost.toLocaleString()}</td>
            <td class="mono" style="text-align:right">${i.sellingPrice.toLocaleString()}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>${title.startsWith('รวม') ? title : `รวม ${title}`}</td>
            <td class="mono" style="text-align:right">${cost.toLocaleString()}</td>
            <td class="mono amount" style="text-align:right">${selling.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ${solutions && solutions.length > 0 ? `<div class="solution-tags keep">${solutions.map(s => `<span class="solution-tag">${s}</span>`).join('')}</div>` : ''}
    ${installments.length > 0 ? (() => {
      // Per-row credit term column only when rows actually differ — mirrors
      // RequestDetailPage's installmentTable/hasPerRowCreditTerm convention.
      const perRowCt = installments.length > 1 && new Set(installments.map(i => i.creditTermDays)).size > 1
      return `<div class="schedule-strip no-orphan-after">
      <span class="schedule-label">Payment Schedule</span>
      ${perRowCt ? '' : `<span class="credit-term">Credit Term: <span class="mono">${formatCreditTerm(installments[0].creditTermDays)}</span></span>`}
    </div>
    <table style="table-layout:fixed">
      <thead><tr><th style="width:${perRowCt ? '20%' : '33.34%'}">งวดที่</th><th style="width:${perRowCt ? '24%' : '33.33%'};text-align:center">%</th>${perRowCt ? '<th style="width:26%;text-align:center">เครดิตเทอม</th>' : ''}<th style="width:${perRowCt ? '30%' : '33.33%'};text-align:right">ยอดชำระ</th></tr></thead>
      <tbody>
        ${installments.map(i => `<tr>
          <td>${i.installmentNo}</td>
          <td style="text-align:center">${i.installmentPercent.toFixed(2)}%</td>
          ${perRowCt ? `<td style="text-align:center">${formatCreditTerm(i.creditTermDays)}</td>` : ''}
          <td class="mono" style="text-align:right">${i.installmentAmount.toLocaleString()}</td>
        </tr>`).join('')}
      </tbody>
    </table>`
    })() : ''}
    ${comment ? `<div class="comment-box keep">${field(`หมายเหตุสำหรับ ${title}`, comment, false, true)}</div>` : ''}
  </div>`
}

function buildGrandTotal(req: Request, rows: Array<{ label: string; cost: number; selling: number }>): string {
  return `<table class="keep">
    <thead><tr><th>รายการ</th><th style="text-align:right">ราคาทุน</th><th style="text-align:right">ราคาขาย</th></tr></thead>
    <tbody>
      ${rows.map(r => `<tr><td>${r.label}</td><td class="mono" style="text-align:right">${r.cost.toLocaleString()}</td><td class="mono" style="text-align:right">${r.selling.toLocaleString()}</td></tr>`).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td>รวมทั้งหมด</td>
        <td class="mono" style="text-align:right">${req.financial.totalCost.toLocaleString()}</td>
        <td class="mono amount" style="text-align:right">${req.financial.totalSelling.toLocaleString()}</td>
      </tr>
    </tfoot>
  </table>`
}

function buildCustomerSection(req: Request): string {
  const { customerInfo } = req
  if (customerInfo.type === 'new') {
    const d = customerInfo.data
    return `<div class="grid2">
      ${field('ประเภทลูกค้า', 'ลูกค้าใหม่')}
      ${field('ชื่อบริษัท', d.companyName)}
      ${d.contactPerson ? field('ผู้ติดต่อ', d.contactPerson) : ''}
      ${d.contactPhone ? field('โทรศัพท์', d.contactPhone) : ''}
    </div>`
  }
  if (customerInfo.type === 'existing') {
    const d = customerInfo.data
    return `<div class="grid2">
      ${field('ประเภทลูกค้า', 'ลูกค้าเก่า')}
      ${field('ชื่อบริษัท', d.companyName)}
      ${field('Default Credit Term', d.defaultCreditTerm != null ? `${d.defaultCreditTerm} วัน` : 'ไม่ระบุ')}
      ${d.contactPerson ? field('ผู้ติดต่อ', d.contactPerson) : ''}
      ${d.contactPhone ? field('โทรศัพท์', d.contactPhone) : ''}
    </div>`
  }
  const d = customerInfo.data
  return `<div class="grid2">
    ${field('ประเภทลูกค้า', 'Reseller')}
    ${field('Reseller', d.resellerCompanyName)}
    ${field('Default Credit Term', d.defaultCreditTerm != null ? `${d.defaultCreditTerm} วัน` : 'ไม่ระบุ')}
    ${d.contactPerson ? field('ผู้ติดต่อ', d.contactPerson) : ''}
    ${d.contactPhone ? field('โทรศัพท์', d.contactPhone) : ''}
    ${field('End Customer', d.endCustomerCompanyName)}
  </div>`
}
