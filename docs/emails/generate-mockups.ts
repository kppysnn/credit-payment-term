// Regenerates the *.html files in this directory directly from the real,
// tested build*Html() functions in emailPreviewService.ts, so these static
// reference mockups never drift out of sync with the live-wired version
// again (an earlier hand-edited draft did — stale header/timeline markup,
// and a placeholder domain in the CTA links that didn't resolve to anything).
//
// Run with: npx vite-node docs/emails/generate-mockups.ts
// (needs vite-node, not plain tsx/node — emailPreviewService.ts imports the
// WorkX logo PNG the same way the app does, and only Vite's own asset-import
// handling (which vite-node shares) knows how to resolve that to a URL string)
;(globalThis as any).window = { location: { origin: 'http://localhost:5173' } }

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  buildSubmitConfirmationEmail,
  buildNewRequestApproverEmail,
  buildApprovedEmail,
  buildRejectedEmail,
  buildCancelledEmail,
} from '../../src/features/credit-payment-term/services/emailPreviewService'
import type { Request } from '../../src/features/credit-payment-term/types/request'

const DOCS = dirname(fileURLToPath(import.meta.url))

// req007 — first-time submission, pending, hardware only
const req007: Request = {
  id: 'req007', requestNo: 'CPT-2026-0007', version: 1,
  createdAt: '2026-06-25T09:00:00.000Z', updatedAt: '2026-06-25T14:00:00.000Z',
  salesEmail: 'sales@company.com', salesName: 'สมหญิง รักงาน', salesId: 'u001',
  proposalNo: 'PRO-2026-007', saleType: 'hardware',
  customerInfo: { type: 'new', data: { companyName: 'บริษัท กรีนพาวเวอร์ จำกัด', contactPerson: 'คุณสุนทร พลังงาน', contactPhone: '02-567-8901' } },
  quotationItems: [{ itemId: 'item015', type: 'hardware', name: 'Hardware', sellingPrice: 320000, cost: 250000, grossProfit: 70000, marginPercent: 21.88 }],
  solutions: ['Solar Monitoring'],
  installmentCount: 2,
  installments: [
    { installmentNo: 1, installmentPercent: 50, installmentAmount: 160000, creditTermDays: 15, paymentCondition: 'on_po' },
    { installmentNo: 2, installmentPercent: 50, installmentAmount: 160000, creditTermDays: 15, paymentCondition: 'on_delivery' },
  ],
  financial: { totalSelling: 320000, totalCost: 250000, grossProfit: 70000, marginPercent: 21.88, maxCreditTerm: 15 },
  status: 'pending',
  history: [
    { historyId: 'h020', requestId: 'req007', version: 1, action: 'created', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: '', toStatus: 'draft', createdAt: '2026-06-25T09:00:00.000Z' },
    { historyId: 'h021', requestId: 'req007', version: 1, action: 'submitted', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: 'draft', toStatus: 'pending', createdAt: '2026-06-25T14:00:00.000Z' },
  ],
}

// req002 — resubmitted (v2), split sale type
const req002: Request = {
  id: 'req002', requestNo: 'CPT-2026-0002', version: 2,
  createdAt: '2026-06-05T10:00:00.000Z', updatedAt: '2026-06-10T09:00:00.000Z',
  salesEmail: 'sales@company.com', salesName: 'สมหญิง รักงาน', salesId: 'u001',
  proposalNo: 'PRO-2026-002', saleType: 'hardware_software_installation',
  customerInfo: { type: 'new', data: { companyName: 'บริษัท สตาร์ทอัพ เทคโนโลยี จำกัด', contactPerson: 'คุณปัญญา รุ่งเรือง', contactPhone: '081-234-5678' } },
  quotationItems: [],
  solutions: ['CCTV'],
  swSolutions: ['W+ Meet in Touch', 'W+ Co Desk'],
  installmentCount: 1,
  installments: [{ installmentNo: 1, installmentPercent: 100, installmentAmount: 300000, creditTermDays: 15, paymentCondition: 'on_delivery' }],
  swInstallmentCount: 2,
  swInstallments: [
    { installmentNo: 1, installmentPercent: 60, installmentAmount: 420000, creditTermDays: 30, paymentCondition: 'on_installation' },
    { installmentNo: 2, installmentPercent: 40, installmentAmount: 280000, creditTermDays: 30, paymentCondition: 'on_acceptance' },
  ],
  financial: { totalSelling: 1000000, totalCost: 730000, grossProfit: 270000, marginPercent: 27, maxCreditTerm: 30 },
  status: 'pending',
  history: [
    { historyId: 'h004', requestId: 'req002', version: 1, action: 'created', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: '', toStatus: 'draft', createdAt: '2026-06-05T10:00:00.000Z' },
    { historyId: 'h005', requestId: 'req002', version: 1, action: 'submitted', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: 'draft', toStatus: 'pending', createdAt: '2026-06-06T08:00:00.000Z' },
    { historyId: 'h006', requestId: 'req002', version: 1, action: 'rejected', actorEmail: 'approver@company.com', actorName: 'นายประยุทธ์ มั่นคง', fromStatus: 'pending', toStatus: 'rejected', comment: 'Software & Installation: ลูกค้าใหม่ credit term 60 วันสูงเกินไป ขอ max 30 วัน', createdAt: '2026-06-07T11:00:00.000Z' },
    { historyId: 'h007', requestId: 'req002', version: 2, action: 'resubmitted', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: 'rejected', toStatus: 'pending', createdAt: '2026-06-10T09:00:00.000Z' },
  ],
}

// req001 — approved
const req001: Request = {
  id: 'req001', requestNo: 'CPT-2026-0001', version: 1,
  createdAt: '2026-06-01T09:00:00.000Z', updatedAt: '2026-06-02T14:30:00.000Z',
  salesEmail: 'sales@company.com', salesName: 'สมหญิง รักงาน', salesId: 'u001',
  proposalNo: 'PRO-2026-001', saleType: 'hardware',
  customerInfo: { type: 'existing', data: { customerId: 'c001', companyName: 'บริษัท ทีคิวเอ็ม จำกัด', defaultCreditTerm: 30, contactPerson: 'คุณมาลี จันทร์เพ็ญ', contactPhone: '02-123-4567' } },
  quotationItems: [],
  solutions: ['CCTV', 'Access Control'],
  installmentCount: 2,
  installments: [
    { installmentNo: 1, installmentPercent: 50, installmentAmount: 200000, creditTermDays: 30, paymentCondition: 'on_po' },
    { installmentNo: 2, installmentPercent: 50, installmentAmount: 200000, creditTermDays: 30, paymentCondition: 'on_delivery' },
  ],
  financial: { totalSelling: 600000, totalCost: 440000, grossProfit: 160000, marginPercent: 26.67, maxCreditTerm: 30 },
  status: 'approved',
  approvalResult: { approverEmail: 'approver@company.com', approverName: 'นายประยุทธ์ มั่นคง', approvedAt: '2026-06-03T10:00:00.000Z', customerComment: 'ลูกค้าเก่าที่มีประวัติการชำระเงินดี', hardwareComment: 'Margin เพียงพอต่อการอนุมัติ' },
  history: [
    { historyId: 'h001', requestId: 'req001', version: 1, action: 'created', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: '', toStatus: 'draft', createdAt: '2026-06-01T09:00:00.000Z' },
    { historyId: 'h002', requestId: 'req001', version: 1, action: 'submitted', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: 'draft', toStatus: 'pending', createdAt: '2026-06-02T14:30:00.000Z' },
    { historyId: 'h003', requestId: 'req001', version: 1, action: 'approved', actorEmail: 'approver@company.com', actorName: 'นายประยุทธ์ มั่นคง', fromStatus: 'pending', toStatus: 'approved', comment: 'อนุมัติ', createdAt: '2026-06-03T10:00:00.000Z' },
  ],
}

// req004 — rejected, split sale type
const req004: Request = {
  id: 'req004', requestNo: 'CPT-2026-0004', version: 1,
  createdAt: '2026-06-14T13:00:00.000Z', updatedAt: '2026-06-15T09:00:00.000Z',
  salesEmail: 'sales@company.com', salesName: 'สมหญิง รักงาน', salesId: 'u001',
  proposalNo: 'PRO-2026-004', saleType: 'hardware_software_installation',
  customerInfo: { type: 'existing', data: { customerId: 'c002', companyName: 'บริษัท สยามเทคโนโลยี จำกัด', defaultCreditTerm: 45, contactPerson: 'คุณสมชาย วิทยาการ', contactPhone: '02-234-5678' } },
  quotationItems: [],
  solutions: ['LED Display', 'Digital Signage'],
  swSolutions: ['Interactive Whiteboard', 'Video Conference'],
  installmentCount: 1,
  installments: [{ installmentNo: 1, installmentPercent: 100, installmentAmount: 300000, creditTermDays: 45, paymentCondition: 'on_po' }],
  swInstallmentCount: 2,
  swInstallments: [
    { installmentNo: 1, installmentPercent: 60, installmentAmount: 450000, creditTermDays: 30, paymentCondition: 'on_po' },
    { installmentNo: 2, installmentPercent: 40, installmentAmount: 300000, creditTermDays: 45, paymentCondition: 'on_acceptance' },
  ],
  financial: { totalSelling: 1050000, totalCost: 810000, grossProfit: 240000, marginPercent: 22.86, maxCreditTerm: 45 },
  status: 'rejected',
  approvalResult: { approverEmail: 'approver@company.com', approverName: 'นายประยุทธ์ มั่นคง', rejectedAt: '2026-06-15T09:00:00.000Z', swComment: 'Margin ต่ำเกินไปสำหรับ Azure subscription ขอให้ review ราคาใหม่ ควร negotiate ราคา Azure กับ Microsoft อีกครั้ง หรือปรับ margin ให้ได้อย่างน้อย 20%' },
  history: [
    { historyId: 'h009', requestId: 'req004', version: 1, action: 'created', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: '', toStatus: 'draft', createdAt: '2026-06-14T13:00:00.000Z' },
    { historyId: 'h010', requestId: 'req004', version: 1, action: 'submitted', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: 'draft', toStatus: 'pending', createdAt: '2026-06-14T15:00:00.000Z' },
    { historyId: 'h011', requestId: 'req004', version: 1, action: 'rejected', actorEmail: 'approver@company.com', actorName: 'นายประยุทธ์ มั่นคง', fromStatus: 'pending', toStatus: 'rejected', comment: 'Software & Installation: Margin ต่ำเกินไปสำหรับ Azure subscription ขอให้ review ราคาใหม่', createdAt: '2026-06-15T09:00:00.000Z' },
  ],
}

// req007-cancelled — same as req007 but cancelled while pending
const req007Cancelled: Request = {
  ...req007,
  status: 'cancelled',
  updatedAt: '2026-06-26T10:00:00.000Z',
  history: [
    ...req007.history,
    { historyId: 'h022', requestId: 'req007', version: 1, action: 'cancelled', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: 'pending', toStatus: 'cancelled', comment: 'ลูกค้ายกเลิกโครงการ', createdAt: '2026-06-26T10:00:00.000Z' },
  ],
}

writeFileSync(join(DOCS, '01-submit-confirmation-sale.html'), buildSubmitConfirmationEmail(req007).html)
writeFileSync(join(DOCS, '02-new-request-approver.html'), buildNewRequestApproverEmail(req002).html)
writeFileSync(join(DOCS, '03-approved-sale.html'), buildApprovedEmail(req001).html)
writeFileSync(join(DOCS, '04-rejected-sale.html'), buildRejectedEmail(req004).html)
writeFileSync(join(DOCS, '05-cancelled-approver.html'), buildCancelledEmail(req007Cancelled).html)

console.log('Wrote 5 files to', DOCS)
