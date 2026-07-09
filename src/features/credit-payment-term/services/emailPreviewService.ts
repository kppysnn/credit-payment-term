/**
 * Email Preview Service
 * This app is frontend-only (no backend/mail service) — there is nowhere to
 * actually deliver SMTP mail from here. This simulates "an email was sent" by
 * generating the real HTML template (same markup/tokens as docs/emails/*.html,
 * verified against Card.tsx/Button.tsx/StatusBadge.tsx/StatusTimeline.tsx/
 * Alert.tsx) from the live Request object and opening it in a new tab, the
 * same window.open() pattern exportService.ts already uses for PDF export.
 *
 * Wired into creditTermService.ts's mutation points via the page components
 * (see CreateRequestPage/EditRequestPage/RequestDetailPage) — never inside
 * creditTermService.ts itself, since that file is the swappable mock-data
 * layer (see its own header comment) and opening browser tabs is a UI concern.
 */
import type { Request, PaymentInstallment } from '../types/request'
import { SALE_TYPE_LABELS } from '../types/request'
import { CUSTOMER_TYPE_LABELS } from '../types/customer'
import { APPROVAL_ACTION_LABELS } from '../types/approval'
import { formatCurrency } from '../utils/calculations'
import { formatDateTime, formatCreditTerm } from '../utils/formatters'

// Not a normal `import ... from '.../workx-logo.png'` (that's how AppShell.tsx
// gets it) — a JS-imported asset resolves to a dev-only unbundled path like
// /src/assets/... while running `npm run dev`, which only exists on the
// machine running the dev server. Email HTML is read by a mail client on a
// completely different machine, so it needs a URL that's identical and
// actually reachable in both dev and prod — exactly what public/ gives you
// (served verbatim, same path, in both). See public/workx-logo.png and the
// same reasoning behind public/email-icons/*.png.
const WORKX_LOGO_PATH = '/workx-logo.png'

const FONT = "'Poppins','Noto Sans Thai',Arial,sans-serif"

// Icons are hosted PNGs (public/email-icons/*.png), not inline <svg> — Gmail
// (web + mobile) strips <svg> tags from email HTML entirely, so every icon
// in this file was silently disappearing for exactly the recipients this is
// built for. Rasterized once via ImageMagick from the same paths as
// components/icons/FigmaIcons.tsx / Font Awesome 6 Solid (see the repo's
// scratch generator if these ever need regenerating at a different size).
function iconImg(name: string, width: number, height: number): string {
  return `<img src="${getBaseUrl()}/email-icons/${name}.png" width="${width}" height="${height}" alt="" style="display:block; border:0;">`
}

// Matches SendIcon (components/icons/FigmaIcons.tsx) used for the same
// "submitted"/"resubmitted" steps in StatusTimeline.tsx. paperplane-navy.png
// is rendered from that icon's optically-centered canvas (612.8 x 530.24 —
// padded right/bottom only so the glyph's ink, not just its bounding box,
// sits centered in the circle), so it isn't square like the other icons here.
function submittedIconSvg(height: number): string {
  return iconImg('paperplane-navy', Math.round(height * (612.8 / 530.24)), height)
}

// ---- Shared shell ----
const STYLE_BLOCK = `
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background: #F8F9FA; }
  @media screen and (max-width: 600px) {
    .email-container { width: 100% !important; }
    .stack-col { display: block !important; width: 100% !important; padding-right: 0 !important; padding-left: 0 !important; }
    .stack-col + .stack-col { padding-top: 12px !important; }
    .px-mobile { padding-left: 20px !important; padding-right: 20px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .body-bg { background: #0B1220 !important; }
    .email-container { background: #111A2B !important; border-color: #28344A !important; }
    .card-bg { background: #111A2B !important; border-color: #28344A !important; }
    .card-head-bg { background: #182339 !important; border-color: #28344A !important; }
    .text-ink { color: #F1F5F9 !important; }
    .text-body { color: #CBD5E1 !important; }
    .text-secondary { color: #9AA8C7 !important; }
    .text-muted { color: #7C8AA8 !important; }
    .text-brand { color: #7EB6E8 !important; }
    .footer-bg { background: #0B1220 !important; border-color: #28344A !important; }
    .header-cell { border-color: #28344A !important; }
    .timeline-line-muted { border-color: #3A4661 !important; background: #3A4661 !important; }
    .banner-bg { background: #2A2107 !important; border-color: #92720C !important; }
    .note-bg { background: #0F2A18 !important; border-color: #1D5C33 !important; }
    .alert-bg { background: #2A1113 !important; border-color: #7A2A2A !important; }
    .chip-bg { background: rgba(126,182,232,0.14) !important; }
  }
`

// A real send needs the subject as its own field — email clients never read
// the HTML <title> tag as the Subject line, that's only useful for the
// browser-tab-preview case. Every build*Email() below returns both.
export interface EmailContent {
  subject: string
  html: string
}

function shell(title: string, preheader: string, bodyHtml: string): string {
  const headerLogoUrl = `${getBaseUrl()}${WORKX_LOGO_PATH}`
  return `<!doctype html>
<html lang="th" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
<style>${STYLE_BLOCK}</style>
</head>
<body class="body-bg" style="margin:0; padding:0; background:#F8F9FA;">
  <div style="display:none; max-height:0; max-width:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="body-bg" style="background:#F8F9FA;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-container card-bg" style="width:600px; max-width:600px; background:#FFFFFF; border:1px solid #D0D6DF; border-radius:4px;">
          <tr>
            <td class="px-mobile header-cell" style="padding: 26px 32px 16px; border-bottom:1px solid #D0D6DF;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="vertical-align:middle; padding-right:10px;">
                  <img src="${headerLogoUrl}" width="78" height="18" alt="WorkX" style="display:block; border:0;">
                </td>
                <td style="vertical-align:middle;">
                  <span class="text-secondary" style="font-family:${FONT}; font-size:14px; font-weight:600; color:#586782; letter-spacing:0.01em;">Credit &amp; Payment Term</span>
                </td>
              </tr></table>
            </td>
          </tr>
          ${bodyHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Single merged heading: icon + status text as ONE row instead of a title
// line followed by a separate "รออนุมัติ/อนุมัติแล้ว/ไม่อนุมัติ" status row —
// the two used to say the same thing twice (e.g. "...รอการอนุมัติ" title +
// "รออนุมัติ" status underneath).
function headerRow(iconSvg: string, text: string, badgeHtml?: string): string {
  return `<tr><td class="px-mobile" style="padding: 22px 32px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle; padding-right:10px;">${iconSvg}</td>
      <td style="vertical-align:middle;"><h1 class="text-secondary" style="margin:0; font-family:${FONT}; font-size:20px; font-weight:500; color:#586782; line-height:1.3;">${text}</h1></td>
      ${badgeHtml ? `<td style="vertical-align:middle; padding-left:10px;">${badgeHtml}</td>` : ''}
    </tr></table>
  </td></tr>`
}

function bodyCopyRow(text: string): string {
  return `<tr><td class="px-mobile" style="padding: 0 32px 20px;">
    <p class="text-body" style="margin:0; font-family:${FONT}; font-size:14px; font-weight:400; color:#505050; line-height:1.65;">${text}</p>
  </td></tr>`
}

function ctaRow(url: string, label: string, extraPaddingBottom = 32): string {
  return `<tr><td align="center" class="px-mobile" style="padding: 24px 32px ${extraPaddingBottom}px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="#004081" style="border-radius:4px; background:linear-gradient(135deg, #66C5C5 0%, #004081 100%);">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="9%" stroke="f" fillcolor="#004081">
        <w:anchorlock/>
        <center style="color:#F8F9FA;font-family:Arial,sans-serif;font-size:14px;">${label}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${url}" target="_blank" style="display:inline-block; padding:0 28px; height:44px; line-height:44px; font-family:${FONT}; font-size:14px; font-weight:400; color:#F8F9FA; text-decoration:none; letter-spacing:0.01em; border-radius:4px;">${label}</a>
        <!--<![endif]-->
      </td>
    </tr></table>
  </td></tr>`
}

// Centered, logo-led footer — matches how a real transactional footer reads
// (brand mark first, then the automated/no-reply + "trouble with the
// button" notices, copyright last and smallest). The raw URL used to be
// printed out in full as visible text, which read fine as a functional
// fallback but also made every preview visibly show "localhost:5173" — the
// link itself is still there (and still correct: it's `window.location
// .origin`, so it's the real domain once this runs somewhere real), just no
// longer spelled out as literal text.
function footerRow(url: string): string {
  const logoUrl = `${getBaseUrl()}${WORKX_LOGO_PATH}`
  return `<tr><td class="footer-bg px-mobile" align="center" style="background:#F8F9FA; border-top:1px solid #D0D6DF; padding:28px 32px 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
      <tr><td align="center" style="padding-bottom:14px;">
        <img src="${logoUrl}" width="96" height="22" alt="WorkX" style="display:block; opacity:0.5; border:0;">
      </td></tr>
      <tr><td align="center" class="text-muted" style="font-family:${FONT}; font-size:12px; font-weight:600; color:#929EB4; padding-bottom:6px;">
        Credit &amp; Payment Term
      </td></tr>
      <tr><td align="center" class="text-muted" style="font-family:${FONT}; font-size:11px; color:#929EB4; line-height:1.7; padding-bottom:12px;">
        อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลฉบับนี้<br>
        หากปุ่มด้านบนกดไม่ได้ <a href="${url}" style="color:#004081;">เปิดลิงก์นี้แทน</a>
      </td></tr>
      <tr><td align="center" class="text-muted" style="font-family:${FONT}; font-size:10.5px; color:#929EB4;">
        &copy; 2026 WorkX. All rights reserved.
      </td></tr>
    </table>
  </td></tr>`
}

function cardOpen(title: string): string {
  return `<tr><td class="px-mobile" style="padding: 0 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-bg" style="border:1px solid #D0D6DF; border-radius:4px;">
      <tr><td class="card-head-bg" style="background:#F2F6F8; border-bottom:1px solid #D0D6DF; padding:14px 20px; font-family:${FONT}; font-size:14px; font-weight:500; color:#586782; letter-spacing:-0.01em;">${title}</td></tr>
      <tr><td style="padding:20px;">`
}
const CARD_CLOSE = `</td></tr></table></td></tr>`

function fieldRow(label: string, value: string, opts: { brand?: boolean; margin?: boolean } = {}): string {
  const valueClass = opts.brand ? 'text-brand' : 'text-secondary'
  const valueColor = opts.brand ? '#004081' : '#586782'
  const valueWeight = opts.brand ? 600 : 400
  return `<div style="font-family:${FONT}; font-size:14px; line-height:1.9;${opts.margin === false ? '' : ' margin-bottom:12px;'}">
    <span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">${label}</span>
    <span class="${valueClass}" style="font-weight:${valueWeight}; color:${valueColor}; font-variant-numeric:tabular-nums;">${value}</span>
  </div>`
}

function referenceRow(requestNo: string, version: number, proposalNo: string): string {
  const versionChip = version > 1 ? ` <span class="text-muted" style="color:#929EB4; font-weight:400;">(v${version})</span>` : ''
  return `<div style="font-family:${FONT}; font-size:14px; line-height:1.9; margin-bottom:12px;">
    <span style="white-space:nowrap;"><span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">Request No.</span> <span class="text-brand" style="font-weight:600; color:#004081; font-variant-numeric:tabular-nums;">${requestNo}</span>${versionChip}</span>
    <span style="color:#D0D6DF; padding:0 10px;">|</span>
    <span style="white-space:nowrap;"><span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">Proposal No.</span> <span class="text-brand" style="font-weight:600; color:#004081; font-variant-numeric:tabular-nums;">${proposalNo}</span></span>
  </div>`
}

function customerBlock(companyName: string, typeLabel: string, contactPerson: string | undefined, contactPhone: string | undefined): string {
  const contactLine = contactPerson || contactPhone
    ? `<br><span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">ผู้ติดต่อ</span> <span class="text-secondary" style="font-weight:400; color:#586782;">${[contactPerson, contactPhone].filter(Boolean).join(' · ')}</span>`
    : ''
  return `<div style="font-family:${FONT}; font-size:14px; line-height:1.9; margin-bottom:12px;">
    <span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">ลูกค้า</span>
    <span class="text-secondary" style="font-weight:400; color:#586782;">${companyName}</span>
    <span class="text-muted" style="color:#929EB4; font-size:12px;">(${typeLabel})</span>${contactLine}
  </div>`
}

function solutionTagsHtml(req: Request): string {
  const tag = (s: string) => `<span style="display:inline-block; padding:4px 8px; margin:0 6px 6px 0; background:#D9F0F0; border-radius:4px; font-family:${FONT}; font-size:12px; color:#004081; line-height:1.4;">${s}</span>`
  const group = (label: string, tags: string[] | undefined, marginBottom: boolean) =>
    tags && tags.length > 0
      ? `<div${marginBottom ? ' style="margin-bottom:10px;"' : ''}>
          <div class="text-secondary" style="font-family:${FONT}; font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">${label}</div>
          ${tags.map(tag).join('')}
        </div>`
      : ''
  if (req.saleType === 'hardware_software_installation') {
    return group('Hardware', req.solutions, true) + group('Software &amp; Installation', req.swSolutions, false)
  }
  return group('Solution', req.solutions, false)
}

// ---- Timeline ----
// Always real, already-happened history entries only — no synthetic "future"
// step (it read as an unclear dashed placeholder). Capped at 3 steps no
// matter how many reject/resubmit rounds a request has been through:
// created -> most recent submitted/resubmitted (carries a "(v3)" suffix when
// version > 1, instead of adding a dot per round) -> terminal status, if any.
interface TimelineStep {
  label: string
  date: string
  color: string
  iconSvg: string
}

function timelineDotHtml(step: TimelineStep): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
    <td width="28" height="28" align="center" valign="middle" style="width:28px; height:28px; border-radius:50%; background:rgba(${hexToRgb(step.color)},0.09); border:2px solid ${step.color};">${step.iconSvg}</td>
  </tr></table>`
}
function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

function timelineHtml(steps: TimelineStep[]): string {
  const colWidth = steps.length <= 2 ? 120 : 90
  const dots = steps.map((step, i) => {
    const connector = i < steps.length - 1
      ? `<td valign="middle" style="padding:0 2px;"><div class="timeline-line-muted" style="height:2px; background:#D0D6DF; font-size:0; line-height:0;">&nbsp;</div></td>`
      : ''
    return `<td width="${colWidth}" align="center" valign="middle">${timelineDotHtml(step)}</td>${connector}`
  }).join('')
  const labels = steps.map((step, i) => {
    const sep = i < steps.length - 1 ? `<td>&nbsp;</td>` : ''
    const labelColor = step.color === '#66C5C5' ? '#004081' : step.color
    return `<td width="${colWidth}" align="center" valign="top" style="padding-top:8px;">
      <div class="${step.color === '#586782' ? 'text-secondary' : 'text-brand'}" style="font-family:${FONT}; font-size:11.5px; font-weight:600; color:${labelColor};">${step.label}</div>
      <div class="text-muted" style="font-family:${FONT}; font-size:10.5px; color:#929EB4; margin-top:1px;">${step.date}</div>
    </td>${sep}`
  }).join('')
  return `<tr><td class="px-mobile" style="padding: 4px 32px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>${dots}</tr>
      <tr>${labels}</tr>
    </table>
  </td></tr>`
}

function historyStep(req: Request, action: string, iconSvg: string, color: string): TimelineStep | undefined {
  const entry = [...req.history].reverse().find(h => h.action === action)
  if (!entry) return undefined
  return { label: APPROVAL_ACTION_LABELS[entry.action], date: formatDateTime(entry.createdAt), color, iconSvg }
}

// The one step that can repeat across rounds (submitted / resubmitted) —
// always shows only the MOST RECENT occurrence, with a "(v{n})" suffix once
// version > 1, so a request that's been rejected-and-resubmitted several
// times still renders as a single dot, not one per round.
function submittedStep(req: Request, iconSvg: string): TimelineStep | undefined {
  const entry = [...req.history].reverse().find(h => h.action === 'submitted' || h.action === 'resubmitted')
  if (!entry) return undefined
  const label = APPROVAL_ACTION_LABELS[entry.action] + (req.version > 1 ? ` (v${req.version})` : '')
  return { label, date: formatDateTime(entry.createdAt), color: '#004081', iconSvg }
}
function createdStep(req: Request): TimelineStep | undefined {
  const entry = [...req.history].reverse().find(h => h.action === 'created')
  if (!entry) return undefined
  return { label: APPROVAL_ACTION_LABELS.created, date: formatDateTime(entry.createdAt), color: '#586782', iconSvg: iconImg('filelines-gray', 11, 15) }
}

// ---- Shared data extraction ----
function getCustomerName(req: Request): string {
  return req.customerInfo.type === 'reseller' ? req.customerInfo.data.resellerCompanyName : req.customerInfo.data.companyName
}
function getContactPerson(req: Request): string | undefined { return req.customerInfo.data.contactPerson }
function getContactPhone(req: Request): string | undefined { return req.customerInfo.data.contactPhone }
function getMaxCreditTerm(req: Request): number {
  const all: PaymentInstallment[] = [...req.installments, ...(req.swInstallments ?? [])]
  return all.reduce((m, i) => Math.max(m, i.creditTermDays), 0)
}
// window.location.origin is fine for the browser-preview-tab case (same
// machine renders it immediately) but wrong for anything a mail client has
// to fetch on its own — running this via `npm run dev`, every image/link in
// a real-sent email would point at http://localhost:5173, unreachable from
// literally any other device (exactly what made icons/logo vanish in
// received mail). VITE_EMAIL_BASE_URL pins real sends to the deployed site
// instead; unset, behavior is unchanged.
const EMAIL_BASE_URL = import.meta.env.VITE_EMAIL_BASE_URL as string | undefined
function getBaseUrl(): string {
  if (EMAIL_BASE_URL) return EMAIL_BASE_URL
  return typeof window !== 'undefined' ? window.location.origin : ''
}
const SECTION_LABELS = { customerComment: 'ลูกค้า', hardwareComment: 'Hardware', swComment: 'Software &amp; Installation' } as const
function sectionCommentsHtml(req: Request, color: string): string {
  const parts: string[] = []
  if (req.approvalResult?.customerComment) parts.push(`<strong>${SECTION_LABELS.customerComment}:</strong> &ldquo;${req.approvalResult.customerComment}&rdquo;`)
  if (req.approvalResult?.hardwareComment) parts.push(`<strong>${SECTION_LABELS.hardwareComment}:</strong> &ldquo;${req.approvalResult.hardwareComment}&rdquo;`)
  if (req.approvalResult?.swComment) parts.push(`<strong>${SECTION_LABELS.swComment}:</strong> &ldquo;${req.approvalResult.swComment}&rdquo;`)
  return `<div style="font-family:${FONT}; font-size:13px; font-weight:400; color:${color}; line-height:1.65;">${parts.join('<br>')}</div>`
}

// ==================== Template 1: submit confirmation (sales) ====================
export function buildSubmitConfirmationEmail(req: Request): EmailContent {
  const url = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]
  const steps = [
    createdStep(req),
    submittedStep(req, submittedIconSvg(14)),
  ].filter(Boolean) as TimelineStep[]

  const body = [
    headerRow(iconImg('hourglass-yellow', 18, 21), 'ส่งคำขอสำเร็จ รอการอนุมัติ'),
    bodyCopyRow('ส่งคำขออนุมัติ Credit &amp; Payment Term เรียบร้อยแล้ว ระบบได้แจ้งผู้อนุมัติ และจะส่งอีเมลแจ้งผลให้คุณทราบอีกครั้ง'),
    timelineHtml(steps),
    cardOpen('ข้อมูลคำขอของคุณ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      fieldRow('ประเภทการขาย', SALE_TYPE_LABELS[req.saleType], { margin: false }) +
      `<div style="margin:12px 0;">` + fieldRow('วันที่ส่ง', formatDateTime(req.updatedAt), { margin: false }) + `</div>` +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    ctaRow(url, 'ดูรายละเอียดคำขอ'),
    footerRow(url),
  ].join('')

  const subject = `ยืนยันการส่งคำขอ #${req.requestNo}`
  return { subject, html: shell(subject, `${customerName} · Request No. ${req.requestNo} · อยู่ระหว่างรอการอนุมัติ`, body) }
}

// ==================== Template 2: new request notify (approver) ====================
export function buildNewRequestApproverEmail(req: Request): EmailContent {
  const url = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]
  const isResubmit = req.version > 1
  const rejectedEntry = isResubmit ? [...req.history].reverse().find(h => h.action === 'rejected') : undefined

  const resubmitBanner = isResubmit && rejectedEntry ? `<tr><td class="px-mobile" style="padding: 0 32px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="banner-bg" style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:4px;"><tr>
      <td width="16" valign="top" style="padding:13px 0 12px 14px;">${iconImg('triangle-exclamation-amber', 16, 16)}</td>
      <td valign="top" style="padding:12px 14px 12px 10px;">
        <div style="font-family:${FONT}; font-size:13px; font-weight:600; color:#92400E; margin-bottom:2px;">มีการส่งคำขออนุมัติใหม่ (v${req.version}) หลังจากคำขอเดิมถูกปฏิเสธเมื่อวันที่ ${formatDateTime(rejectedEntry.createdAt)}</div>
        <div style="font-family:${FONT}; font-size:13px; font-weight:400; color:#92400E; line-height:1.65;"><strong>เหตุผลที่ถูกปฏิเสธครั้งก่อน:</strong> &ldquo;${rejectedEntry.comment ?? '—'}&rdquo;</div>
      </td>
    </tr></table>
  </td></tr>` : ''

  const swPart = req.swInstallmentCount ? ` · SW&amp;Install ${req.swInstallmentCount}` : ''
  const financialCard = cardOpen('สรุปรายละเอียดคำขอ') + `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-head-bg" style="background:#F2F6F8; border-radius:4px;"><tr><td style="padding:12px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="text-secondary" style="font-family:${FONT}; font-size:13px; font-weight:400; color:#586782;">รวมทั้งหมด</td>
        <td align="right">
          <span class="text-secondary" style="font-family:${FONT}; font-size:12px; color:#586782;">ราคาทุน <span style="font-size:14px; font-weight:500; color:#586782; font-variant-numeric:tabular-nums;">${formatCurrency(req.financial.totalCost)}</span></span>
          <span style="display:inline-block; width:20px;">&nbsp;</span>
          <span class="text-secondary" style="font-family:${FONT}; font-size:12px; color:#586782;">ราคาขาย <span class="text-brand" style="font-size:14px; font-weight:600; color:#004081; font-variant-numeric:tabular-nums;">${formatCurrency(req.financial.totalSelling)}</span></span>
        </td>
      </tr></table>
    </td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr>
      <td style="font-family:${FONT}; font-size:14px;"><span class="text-secondary" style="font-weight:600; color:#586782;">Credit Term: </span><span class="text-brand" style="font-weight:600; color:#004081; font-variant-numeric:tabular-nums;">${formatCreditTerm(getMaxCreditTerm(req))}</span></td>
      <td align="right" class="text-secondary" style="font-family:${FONT}; font-size:13px; font-weight:400; color:#586782;">งวดผ่อนชำระ: HW ${req.installmentCount}${swPart}</td>
    </tr></table>
  ` + CARD_CLOSE

  const versionBadge = req.version > 1 ? `<span class="text-brand chip-bg" style="display:inline-block; font-family:${FONT}; font-size:12px; font-weight:600; color:#004081; background:rgba(0,64,129,0.08); border-radius:4px; padding:2px 8px;">v${req.version}</span>` : undefined

  const body = [
    headerRow(iconImg('hourglass-yellow', 18, 21), 'มีคำขออนุมัติ Credit Term รอดำเนินการ', versionBadge),
    resubmitBanner,
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      fieldRow('ประเภทการขาย', SALE_TYPE_LABELS[req.saleType], { margin: false }) +
      `<div style="margin:12px 0;">` + fieldRow('ผู้ส่ง', `${req.salesName} (${req.salesEmail})`, { margin: false }) + fieldRow('วันที่ส่งล่าสุด', formatDateTime(req.updatedAt), { margin: false }) + `</div>` +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    financialCard,
    ctaRow(url, 'ดูรายละเอียดคำขอ'),
    footerRow(url),
  ].join('')

  const subject = `มีคำขออนุมัติ Credit Term ใหม่ #${req.requestNo}`
  return { subject, html: shell(subject, `${customerName} · Credit Term ${formatCreditTerm(getMaxCreditTerm(req))}${isResubmit ? ` · ส่งซ้ำครั้งที่ ${req.version}` : ''}`, body) }
}

// ==================== Template 3: approved (sales) ====================
export function buildApprovedEmail(req: Request): EmailContent {
  const url = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]
  const steps = [
    createdStep(req),
    submittedStep(req, submittedIconSvg(14)),
    historyStep(req, 'approved', iconImg('check-teal', 13, 13), '#66C5C5'),
  ].filter(Boolean) as TimelineStep[]

  const hasNotes = req.approvalResult?.customerComment || req.approvalResult?.hardwareComment || req.approvalResult?.swComment
  const noteBox = hasNotes ? `<tr><td class="px-mobile" style="padding: 0 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="note-bg" style="background:#F0FDF4; border:1px solid #86EFAC; border-radius:4px;"><tr>
      <td width="16" valign="top" style="padding:13px 0 12px 14px;">${iconImg('circlecheck-green', 16, 16)}</td>
      <td valign="top" style="padding:12px 14px 12px 10px;">
        <div style="font-family:${FONT}; font-size:13px; font-weight:600; color:#14532D; margin-bottom:2px;">หมายเหตุจากผู้อนุมัติ</div>
        ${sectionCommentsHtml(req, '#14532D')}
      </td>
    </tr></table>
  </td></tr>` : ''

  const body = [
    headerRow(iconImg('checkcircle-teal', 22, 22), 'คำขอของคุณได้รับการอนุมัติแล้ว'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ของคุณได้รับการอนุมัติเรียบร้อยแล้ว'),
    timelineHtml(steps),
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      fieldRow('อนุมัติโดย', req.approvalResult?.approverName ?? '—', { margin: false }) +
      `<div style="margin:12px 0;">` + fieldRow('วันที่อนุมัติ', req.approvalResult?.approvedAt ? formatDateTime(req.approvalResult.approvedAt) : '—', { margin: false }) + `</div>` +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    noteBox,
    ctaRow(url, 'ดูรายละเอียดคำขอ'),
    footerRow(url),
  ].join('')

  const subject = `คำขอ #${req.requestNo} ได้รับการอนุมัติแล้ว`
  return { subject, html: shell(subject, `${customerName} · อนุมัติโดย ${req.approvalResult?.approverName ?? '—'} · Credit Term ${formatCreditTerm(getMaxCreditTerm(req))}`, body) }
}

// ==================== Template 4: rejected (sales) ====================
export function buildRejectedEmail(req: Request): EmailContent {
  const editUrl = `${getBaseUrl()}/requests/${req.id}/edit`
  const detailUrl = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]
  const steps = [
    createdStep(req),
    submittedStep(req, submittedIconSvg(13)),
    historyStep(req, 'rejected', iconImg('xmark-red-solid', 12, 16), '#F3554F'),
  ].filter(Boolean) as TimelineStep[]

  const body = [
    headerRow(iconImg('xmark-red-bare', 20, 20), 'คำขอของคุณไม่ได้รับการอนุมัติ'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ของคุณไม่ได้รับการอนุมัติ กรุณาแก้ไขคำขอตามคำแนะนำด้านล่าง แล้วส่งขออนุมัติอีกครั้ง'),
    `<tr><td class="px-mobile" style="padding: 0 32px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="alert-bg" style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:4px;"><tr>
        <td width="16" valign="top" style="padding:13px 0 12px 14px;">${iconImg('circlexmark-red', 16, 16)}</td>
        <td valign="top" style="padding:12px 14px 12px 10px;">
          <div style="font-family:${FONT}; font-size:13px; font-weight:600; color:#7F1D1D; margin-bottom:2px;">เหตุผลที่ไม่อนุมัติ</div>
          ${sectionCommentsHtml(req, '#7F1D1D')}
        </td>
      </tr></table>
    </td></tr>`,
    timelineHtml(steps),
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      fieldRow('ไม่อนุมัติโดย', req.approvalResult?.approverName ?? '—', { margin: false }) +
      `<div style="margin:12px 0;">` + fieldRow('วันที่ไม่อนุมัติ', req.approvalResult?.rejectedAt ? formatDateTime(req.approvalResult.rejectedAt) : '—', { margin: false }) + `</div>` +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    ctaRow(editUrl, 'แก้ไขคำขอ', 8),
    `<tr><td align="center" class="px-mobile" style="padding: 0 32px 32px;"><a href="${detailUrl}" style="font-family:${FONT}; font-size:13px; font-weight:400; color:#004081; text-decoration:underline;">ดูรายละเอียดคำขอเต็มก่อนแก้ไข</a></td></tr>`,
    footerRow(editUrl),
  ].join('')

  const subject = `คำขอ #${req.requestNo} ไม่ได้รับการอนุมัติ`
  return { subject, html: shell(subject, `${customerName} · ไม่อนุมัติโดย ${req.approvalResult?.approverName ?? '—'}`, body) }
}

// ==================== Template 5: cancelled while pending (approver) ====================
// Only fired when a request gets cancelled WHILE it was 'pending' — the
// approver was expecting to review it, so they need to know it's off the
// table. Cancelling a draft or an already-approved request has no one
// waiting on a decision, so those don't get an email (see caller).
export function buildCancelledEmail(req: Request): EmailContent {
  const url = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]
  const cancelledEntry = [...req.history].reverse().find(h => h.action === 'cancelled')

  const body = [
    headerRow(iconImg('ban-gray', 20, 20), 'คำขอนี้ถูกยกเลิกแล้ว'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ที่รอคุณพิจารณา ได้ถูกยกเลิกโดยผู้ส่งคำขอแล้ว คุณจึงไม่ต้องดำเนินการพิจารณารายการนี้'),
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      fieldRow('ยกเลิกโดย', cancelledEntry?.actorName ?? req.salesName, { margin: false }) +
      `<div style="margin:12px 0;">` + fieldRow('วันที่ยกเลิก', cancelledEntry ? formatDateTime(cancelledEntry.createdAt) : formatDateTime(req.updatedAt), { margin: false }) + `</div>` +
      (cancelledEntry?.comment ? `<div style="font-family:${FONT}; font-size:14px; line-height:1.9;"><span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">เหตุผลที่ยกเลิก</span> <span class="text-secondary" style="font-weight:400; color:#586782;">${cancelledEntry.comment}</span></div>` : '') +
    CARD_CLOSE,
    ctaRow(url, 'ดูรายละเอียดคำขอ'),
    footerRow(url),
  ].join('')

  const subject = `คำขอ #${req.requestNo} ถูกยกเลิกแล้ว`
  return { subject, html: shell(subject, `${customerName} · ยกเลิกโดย ${cancelledEntry?.actorName ?? req.salesName}`, body) }
}

// ---- Open in new tab (mirrors exportService.ts's exportPDF window.open pattern) ----
function openHtmlInNewTab(html: string): void {
  const win = window.open('', '_blank')
  if (!win) {
    alert('กรุณาอนุญาตให้เปิด popup ใหม่เพื่อดูตัวอย่างอีเมล')
    return
  }
  win.document.write(html)
  win.document.close()
}

// ---- Real send, via api/send-email.ts, opt-in only ----
// No RESEND_API_KEY anywhere near this file — that lives server-side (see
// api/send-email.ts). This just calls the endpoint. Recipients in the mock
// data (sales@company.com, approver@company.com) aren't real inboxes, so
// this only fires when VITE_TEST_EMAIL_RECIPIENT is explicitly set (.env.local
// for `npm run dev`, Vercel project env vars for the deployed app) — with it
// unset, behavior is unchanged: preview-tab only, nothing sent anywhere.
const TEST_EMAIL_RECIPIENT = import.meta.env.VITE_TEST_EMAIL_RECIPIENT as string | undefined

async function sendReal(subject: string, html: string): Promise<void> {
  if (!TEST_EMAIL_RECIPIENT) return
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: TEST_EMAIL_RECIPIENT, subject, html }),
    })
    if (!res.ok) console.warn('[emailPreviewService] real send failed:', await res.json().catch(() => res.statusText))
  } catch (e) {
    console.warn('[emailPreviewService] real send skipped (no /api available):', e)
  }
}

export function previewSubmitConfirmationEmail(req: Request): void {
  const { subject, html } = buildSubmitConfirmationEmail(req)
  openHtmlInNewTab(html)
  sendReal(subject, html)
}
export function previewNewRequestApproverEmail(req: Request): void {
  const { subject, html } = buildNewRequestApproverEmail(req)
  openHtmlInNewTab(html)
  sendReal(subject, html)
}
export function previewApprovedEmail(req: Request): void {
  const { subject, html } = buildApprovedEmail(req)
  openHtmlInNewTab(html)
  sendReal(subject, html)
}
export function previewRejectedEmail(req: Request): void {
  const { subject, html } = buildRejectedEmail(req)
  openHtmlInNewTab(html)
  sendReal(subject, html)
}
export function previewCancelledEmail(req: Request): void {
  const { subject, html } = buildCancelledEmail(req)
  openHtmlInNewTab(html)
  sendReal(subject, html)
}
