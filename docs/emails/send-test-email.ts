// One-off script to send a REAL test email via the Resend API — not part of
// the app itself (this project has no backend/mail service, see
// emailPreviewService.ts's header comment). Sends whichever template you
// pick, built from the exact same, tested build*Email() functions the live
// app uses on submit/approve/reject/cancel, to a recipient you choose.
//
// Usage (run this yourself — the API key should never be pasted into a chat
// or committed anywhere):
//   RESEND_API_KEY=re_your_key_here npx vite-node docs/emails/send-test-email.ts <template> <to-email>
//
// <template> is one of: submit | approver | approved | rejected | cancelled
// Example:
//   RESEND_API_KEY=re_xxx npx vite-node docs/emails/send-test-email.ts approved kppysn@gmail.com
;(globalThis as any).window = { location: { origin: 'https://example.com' } }

import {
  buildSubmitConfirmationEmail,
  buildNewRequestApproverEmail,
  buildApprovedEmail,
  buildRejectedEmail,
  buildCancelledEmail,
} from '../../src/features/credit-payment-term/services/emailPreviewService'
import type { Request } from '../../src/features/credit-payment-term/types/request'

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

const TEMPLATES: Record<string, () => { subject: string; html: string }> = {
  submit: () => buildSubmitConfirmationEmail(req001),
  approver: () => buildNewRequestApproverEmail(req001),
  approved: () => buildApprovedEmail(req001),
  rejected: () => buildRejectedEmail({ ...req001, status: 'rejected', approvalResult: { approverEmail: 'approver@company.com', approverName: 'นายประยุทธ์ มั่นคง', rejectedAt: '2026-06-03T10:00:00.000Z', hardwareComment: 'Margin ต่ำเกินไป ขอปรับราคาใหม่' }, history: [...req001.history, { historyId: 'h099', requestId: 'req001', version: 1, action: 'rejected', actorEmail: 'approver@company.com', actorName: 'นายประยุทธ์ มั่นคง', fromStatus: 'pending', toStatus: 'rejected', comment: 'Hardware: Margin ต่ำเกินไป ขอปรับราคาใหม่', createdAt: '2026-06-03T10:00:00.000Z' }] }),
  cancelled: () => buildCancelledEmail({ ...req001, status: 'cancelled', history: [...req001.history, { historyId: 'h098', requestId: 'req001', version: 1, action: 'cancelled', actorEmail: 'sales@company.com', actorName: 'สมหญิง รักงาน', fromStatus: 'pending', toStatus: 'cancelled', comment: 'ลูกค้ายกเลิกโครงการ', createdAt: '2026-06-03T10:00:00.000Z' }] }),
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  const [templateName, toEmail] = process.argv.slice(2)

  if (!apiKey) {
    console.error('Missing RESEND_API_KEY. Run as:\n  RESEND_API_KEY=re_xxx npx vite-node docs/emails/send-test-email.ts <template> <to-email>')
    process.exit(1)
  }
  if (!templateName || !TEMPLATES[templateName]) {
    console.error(`Unknown or missing template "${templateName}". Choose one of: ${Object.keys(TEMPLATES).join(', ')}`)
    process.exit(1)
  }
  if (!toEmail) {
    console.error('Missing recipient email. Usage: ... <template> <to-email>')
    process.exit(1)
  }

  const { subject, html } = TEMPLATES[templateName]()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Credit & Payment Term <onboarding@resend.dev>',
      to: [toEmail],
      subject,
      html,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Resend API error:', res.status, data)
    process.exit(1)
  }
  console.log('Sent! Resend id:', data.id)
}

main()
