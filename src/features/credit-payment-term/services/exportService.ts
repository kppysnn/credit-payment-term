/**
 * Export Service
 * Handles A4 print and PDF export.
 * PDF uses browser print-to-PDF (window.print) as the primary method.
 * html2pdf.js can be wired in here if added to dependencies.
 */
import type { Request, PaymentInstallment } from '../types/request'
import { SALE_TYPE_LABELS } from '../types/request'
import { getStatusConfig } from '../utils/status'

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

function buildPrintHTML(req: Request): string {
  const statusCfg = getStatusConfig(req.status)
  const separateQuotation = req.saleType === 'hardware_software_installation'
  const hardwareQuotationNo = `${req.proposalNo}-1`
  const serviceQuotationNo = `${req.proposalNo}-${separateQuotation ? '2' : '1'}`
  const hardwareItems = req.quotationItems.filter(item => item.type === 'hardware')
  const serviceItems = req.quotationItems.filter(item => item.type === 'software' || item.type === 'installation')
  const hardwareSelling = hardwareItems.reduce((sum, item) => sum + item.sellingPrice, 0)
  const serviceSelling = serviceItems.reduce((sum, item) => sum + item.sellingPrice, 0)

  return `<!DOCTYPE html><html><head><title>${req.requestNo}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #001122; margin: 0; padding: 0; }
  .container { max-width: 210mm; margin: 0 auto; padding: 16mm; }
  h1 { font-size: 18px; color: #004081; margin: 0 0 4px; }
  .sub { font-size: 11px; color: #586782; margin-bottom: 16px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 13px; font-weight: 700; color: #004081; border-bottom: 1.5px solid #004081; padding-bottom: 3px; margin-bottom: 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .field-label { font-size: 10px; color: #586782; font-weight: 600; }
  .field-val { font-size: 12px; color: #001122; margin-bottom: 6px; }
  .quote-group { border:1px solid #D0D6DF; border-radius:4px; overflow:hidden; margin:12px 0; }
  .quote-head { display:flex; justify-content:space-between; align-items:baseline; background:#004081; padding:7px 10px; font-weight:700; color:#fff; }
  .quote-no { font-size:13px; }
  .quote-label { font-size:10px; color:rgba(255,255,255,0.78); text-transform:uppercase; letter-spacing:.06em; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #F2F6F8; font-weight: 600; text-align: left; padding: 5px 8px; border: 1px solid #D0D6DF; }
  td { padding: 5px 8px; border: 1px solid #D0D6DF; }
  .mono { font-family: 'Courier New', monospace; }
  .status { display: inline-block; font-size: 11px; font-weight: 500; }
  @media print { @page { size: A4; margin: 0; } }
</style></head><body>
<div class="container">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #004081;padding-bottom:12px;margin-bottom:16px">
    <div>
      <h1>Credit &amp; Payment Term Approval Request</h1>
      <div class="sub">${req.requestNo} · Version ${req.version} · Created ${new Date(req.createdAt).toLocaleDateString('th-TH')}</div>
    </div>
    <div class="status" style="color:${statusCfg.iconColor}">${statusCfg.label}</div>
  </div>

  <div class="section">
    <div class="section-title">1. ข้อมูลคำขอ</div>
    <div class="grid2">
      <div><div class="field-label">Proposal No.</div><div class="field-val mono">${req.proposalNo}</div></div>
      <div><div class="field-label">ประเภทการขาย</div><div class="field-val">${SALE_TYPE_LABELS[req.saleType]}</div></div>
      <div style="grid-column:span 2"><div class="field-label">Sales</div><div class="field-val">${req.salesName} (${req.salesEmail})</div></div>
      ${req.requestPurpose ? `<div style="grid-column:span 2"><div class="field-label">วัตถุประสงค์</div><div class="field-val">${req.requestPurpose}</div></div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. ข้อมูลลูกค้า</div>
    ${buildCustomerSection(req)}
    ${req.customerComment ? `<div class="field-label" style="margin-top:8px">หมายเหตุข้อมูลลูกค้า</div><div class="field-val">${req.customerComment}</div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">3. ใบเสนอราคาและ Payment Schedule</div>
    ${hardwareItems.length > 0 ? buildQuotationGroup(hardwareQuotationNo, 'Hardware', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', hardwareItems, hardwareSelling, req.installments, req.hardwareComment) : ''}
    ${serviceItems.length > 0 ? buildQuotationGroup(serviceQuotationNo, 'Software & Installation', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', serviceItems, serviceSelling, req.swInstallments ?? [], req.swComment) : ''}
    <table>
      <tr style="font-weight:700;background:#F2F6F8">
        <td>รวมทั้งหมด</td>
        <td class="mono">${req.financial.totalSelling.toLocaleString()}</td>
      </tr>
    </table>
  </div>

  ${req.approvalResult ? `<div class="section">
    <div class="section-title">4. ผลการพิจารณา</div>
    <div class="grid2">
      <div><div class="field-label">ผลการพิจารณา</div><div class="field-val">${req.approvalResult.approvedAt ? 'อนุมัติ' : 'ไม่อนุมัติ'}</div></div>
      <div><div class="field-label">ผู้อนุมัติ</div><div class="field-val">${req.approvalResult.approverName}</div></div>
    </div>
    <div class="sub">ดูหมายเหตุของผู้พิจารณาแยกตามหมวดด้านบน</div>
  </div>` : ''}
</div></body></html>`
}

function buildQuotationGroup(no: string, title: string, gradient: string, items: Request['quotationItems'], total: number, installments: PaymentInstallment[], comment?: string): string {
  return `<div class="quote-group">
    <div class="quote-head" style="background:${gradient}"><span class="quote-no">${no}</span><span class="quote-label">${title}</span></div>
    <table>
      ${items.map(i => `<tr>
        <td>${i.name}</td>
        <td class="mono" style="text-align:right">${i.sellingPrice.toLocaleString()}</td>
      </tr>`).join('')}
      <tr style="font-weight:700;background:#F2F6F8">
        <td>รวม ${title}</td>
        <td class="mono" style="text-align:right">${total.toLocaleString()}</td>
      </tr>
    </table>
    ${installments.length > 0 ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#F2F6F8;border:1px solid #D0D6DF;border-top:none">
      <span style="font-size:12px;font-weight:700;color:#001122">Payment Schedule</span>
      <span style="font-size:11px;font-weight:600;color:#586782">Credit Term: <span class="mono" style="font-size:12px;font-weight:700;color:#004081">Net ${installments[0].creditTermDays}</span></span>
    </div>
    <table>
      <tr><th>งวดที่</th><th>%</th><th style="text-align:right">ยอดชำระ</th></tr>
      ${installments.map(i => `<tr>
        <td>${i.installmentNo}</td>
        <td>${i.installmentPercent}%</td>
        <td class="mono" style="text-align:right">${i.installmentAmount.toLocaleString()}</td>
      </tr>`).join('')}
    </table>` : ''}
    ${comment ? `<div style="padding:8px;border:1px solid #D0D6DF;border-top:none"><div class="field-label">หมายเหตุสำหรับ ${title}</div><div class="field-val" style="margin-bottom:0">${comment}</div></div>` : ''}
  </div>`
}

function buildCustomerSection(req: Request): string {
  const { customerInfo } = req
  if (customerInfo.type === 'new') {
    const d = customerInfo.data
    return `<div class="grid2">
      <div><div class="field-label">ประเภทลูกค้า</div><div class="field-val">ลูกค้าใหม่</div></div>
      <div><div class="field-label">ชื่อบริษัท</div><div class="field-val">${d.companyName}</div></div>
      ${d.contactPerson ? `<div><div class="field-label">ผู้ติดต่อ</div><div class="field-val">${d.contactPerson}</div></div>` : ''}
      ${d.contactPhone ? `<div><div class="field-label">โทรศัพท์</div><div class="field-val">${d.contactPhone}</div></div>` : ''}
    </div>`
  }
  if (customerInfo.type === 'existing') {
    const d = customerInfo.data
    return `<div class="grid2">
      <div><div class="field-label">ประเภทลูกค้า</div><div class="field-val">ลูกค้าเก่า</div></div>
      <div><div class="field-label">ชื่อบริษัท</div><div class="field-val">${d.companyName}</div></div>
      <div><div class="field-label">Default Credit Term</div><div class="field-val">${d.defaultCreditTerm ?? '—'} วัน</div></div>
      ${d.contactPerson ? `<div><div class="field-label">ผู้ติดต่อ</div><div class="field-val">${d.contactPerson}</div></div>` : ''}
      ${d.contactPhone ? `<div><div class="field-label">โทรศัพท์</div><div class="field-val">${d.contactPhone}</div></div>` : ''}
    </div>`
  }
  const d = customerInfo.data
  return `<div class="grid2">
    <div><div class="field-label">ประเภทลูกค้า</div><div class="field-val">Reseller</div></div>
    <div><div class="field-label">Reseller</div><div class="field-val">${d.resellerCompanyName}</div></div>
    <div><div class="field-label">Default Credit Term</div><div class="field-val">${d.defaultCreditTerm ?? '—'} วัน</div></div>
    ${d.contactPerson ? `<div><div class="field-label">ผู้ติดต่อ</div><div class="field-val">${d.contactPerson}</div></div>` : ''}
    ${d.contactPhone ? `<div><div class="field-label">โทรศัพท์</div><div class="field-val">${d.contactPhone}</div></div>` : ''}
    <div><div class="field-label">End Customer</div><div class="field-val">${d.endCustomerCompanyName}</div></div>
  </div>`
}
