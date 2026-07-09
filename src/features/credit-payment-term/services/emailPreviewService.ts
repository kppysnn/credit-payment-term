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
import workxLogo from '../../../assets/navbar/workx-logo.png'

const FONT = "'Poppins','Noto Sans Thai',Arial,sans-serif"

// ---- Icon paths (exact SVGs — custom ones ported from components/icons/FigmaIcons.tsx, stock ones from Font Awesome 6 Solid) ----
const ICON_FILE_LINES = 'M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM112 256l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z'
const ICON_CHECK = 'M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z'
const ICON_XMARK = 'M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z'
const ICON_TRIANGLE_EXCLAMATION = 'M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480L40 480c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z'
const ICON_CIRCLE_CHECK = 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z'
const ICON_CIRCLE_XMARK = 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z'
// Custom "check-circle-fill" (Figma 909:1364/1029:377) — used in the status
// row to match StatusBadge.tsx's approved icon exactly (18x18 viewBox,
// distinct from Font Awesome's circle-check used in the Alert success box).
const ICON_CHECK_CIRCLE_CUSTOM = 'M18 9C18 13.9706 13.9706 18 9 18C4.02944 18 0 13.9706 0 9C0 4.02944 4.02944 0 9 0C13.9706 0 18 4.02944 18 9ZM13.5341 5.59088C13.2046 5.26137 12.6704 5.26137 12.3409 5.59088C12.3329 5.59884 12.3254 5.60726 12.3185 5.61612L8.41207 10.5938L6.05686 8.23863C5.72736 7.90912 5.19312 7.90912 4.86362 8.23863C4.53411 8.56813 4.53411 9.10236 4.86362 9.43187L7.84087 12.4091C8.17038 12.7386 8.70461 12.7386 9.03411 12.4091C9.04145 12.4018 9.04838 12.394 9.05486 12.3859L13.5461 6.77191C13.8636 6.44154 13.8596 5.91634 13.5341 5.59088Z'
const ICON_HOURGLASS_STATUS ='M0.5 14C0.223858 14 0 13.7762 0 13.5C0 13.2239 0.223858 13 0.5 13H1.5V12C1.5 10.2099 2.54528 8.66493 4.05655 7.9403C4.34645 7.8013 4.5 7.56317 4.5 7.35083V6.64919C4.5 6.43685 4.34645 6.19872 4.05655 6.05972C2.54528 5.33509 1.5 3.7901 1.5 2V1H0.5C0.223858 1 0 0.776142 0 0.5C0 0.223858 0.223858 0 0.5 0L11.5 2.19345e-05C11.7761 2.57492e-05 12 0.223886 12 0.50003C12 0.776172 11.7761 1.00003 11.5 1.00002L10.5 1.00001V2C10.5 3.7901 9.45472 5.33509 7.94345 6.05972C7.65355 6.19872 7.5 6.43685 7.5 6.64919V7.35083C7.5 7.56317 7.65355 7.8013 7.94345 7.9403C9.45472 8.66493 10.5 10.2099 10.5 12V13H11.5C11.7761 13 12 13.2239 12 13.5C12 13.7762 11.7761 14 11.5 14H0.5ZM2.5 1.00002V2.00002C2.5 2.5367 2.62078 3.04531 2.83678 3.50004H9.16322C9.37922 3.04531 9.5 2.5367 9.5 2.00002V1.00002H2.5ZM5.5 7.35085C5.5 8.05108 5.02187 8.58648 4.4889 8.84203C3.31139 9.40663 2.5 10.6091 2.5 12C2.5 12 3.36574 10.7014 5.5 10.5208V7.35085ZM6.5 7.35085V10.5208C8.63426 10.7014 9.5 12 9.5 12C9.5 10.6091 8.68861 9.40663 7.5111 8.84203C6.97813 8.58648 6.5 8.05108 6.5 7.35085Z'

function mailSendIconSvg(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="display:block; margin:0 auto;">
    <g transform="translate(8,10)"><path fill="${color}" d="M15.8076 10.8564C15.6455 11.1985 15.3901 11.488 15.0703 11.6904C14.7502 11.893 14.3788 12.0001 14 12H2C1.62117 12.0004 1.24994 11.8928 0.929688 11.6904C0.609694 11.4882 0.353707 11.1994 0.191406 10.8574L6.76074 6.83008L8 7.58594L9.23828 6.8291L15.8076 10.8564ZM5.80273 6.24316L0 9.80078V2.69727L5.80273 6.24316ZM12.2891 4.96387C13.1927 5.61504 14.3011 6 15.5 6C15.6686 6 15.8353 5.99044 16 5.97559V9.80078L10.1973 6.24414V6.24316L12.2891 4.96387ZM10.0234 9.05562e-09C10.0086 0.164711 10 0.331424 10 0.5C10 1.96139 10.5712 3.28846 11.501 4.27344L8 6.41406L0.0498047 1.55469C0.15065 1.11308 0.398785 0.718968 0.75293 0.436523C1.1072 0.154019 1.54688 -3.04899e-05 2 9.05562e-09H10.0234Z"/></g>
    <g transform="translate(19,6)"><circle cx="4.5" cy="4.5" r="4.5" fill="${color}"/><g transform="translate(8,2) scale(-1,1)"><path fill="#fff" d="M0.471758 2.63102C0.528183 2.67938 0.603792 2.70645 0.682506 2.70645C0.76122 2.70645 0.83683 2.67938 0.893255 2.63102L1.94675 1.70256V4.73705C1.94623 4.77171 1.95358 4.80611 1.96839 4.83822C1.98319 4.87033 2.00515 4.8995 2.03296 4.924C2.06077 4.94851 2.09386 4.96786 2.1303 4.98091C2.16673 4.99396 2.20576 5.00044 2.24509 4.99998H2.77208C2.81141 5.00044 2.85044 4.99396 2.88687 4.98091C2.92331 4.96786 2.95641 4.94851 2.98422 4.924C3.01202 4.8995 3.03398 4.87033 3.04879 4.83822C3.06359 4.80611 3.07095 4.77171 3.07042 4.73705V1.69477L4.12392 2.62323C4.18034 2.6716 4.25595 2.69866 4.33467 2.69866C4.41338 2.69866 4.48899 2.6716 4.54542 2.62323L4.91441 2.29803C4.96929 2.2483 5 2.18167 5 2.1123C5 2.04293 4.96929 1.97629 4.91441 1.92656L2.89525 0.14705C2.84384 0.100581 2.78242 0.0636363 2.71459 0.0383867C2.64676 0.0131371 2.57388 9.21314e-05 2.50024 1.85852e-05C2.4265 -0.000555916 2.3534 0.0121944 2.28547 0.0374825C2.21753 0.0627707 2.15619 0.10006 2.10524 0.14705L0.0855895 1.92699C0.0307068 1.97672 0 2.04336 0 2.11273C0 2.1821 0.0307068 2.24874 0.0855895 2.29847L0.471758 2.63102Z"/></g></g>
  </svg>`
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
              <span class="text-secondary" style="font-family:${FONT}; font-size:14px; font-weight:600; color:#586782; letter-spacing:0.01em;">Credit &amp; Payment Term</span>
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
  const logoUrl = `${getBaseUrl()}${workxLogo}`
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
  return { label: APPROVAL_ACTION_LABELS.created, date: formatDateTime(entry.createdAt), color: '#586782', iconSvg: `<svg width="11" height="15" viewBox="0 0 384 512" style="display:block; margin:0 auto;"><path fill="#586782" d="${ICON_FILE_LINES}"/></svg>` }
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
function getBaseUrl(): string {
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
    submittedStep(req, mailSendIconSvg(14, '#004081')),
  ].filter(Boolean) as TimelineStep[]

  const body = [
    headerRow(`<svg width="18" height="21" viewBox="0 0 12 14"><path fill="#FFCC00" d="${ICON_HOURGLASS_STATUS}"/></svg>`, 'ส่งคำขอสำเร็จ รอการอนุมัติ'),
    bodyCopyRow('ระบบได้รับคำขออนุมัติ Credit &amp; Payment Term ของคุณเรียบร้อยแล้ว และได้แจ้งเตือนไปยังผู้อนุมัติให้ดำเนินการแล้ว คุณจะได้รับอีเมลอีกฉบับทันทีที่มีผลการพิจารณา'),
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
      <td width="16" valign="top" style="padding:13px 0 12px 14px;"><svg width="16" height="16" viewBox="0 0 512 512" style="display:block;"><path fill="#92400E" d="${ICON_TRIANGLE_EXCLAMATION}"/></svg></td>
      <td valign="top" style="padding:12px 14px 12px 10px;">
        <div style="font-family:${FONT}; font-size:13px; font-weight:600; color:#92400E; margin-bottom:2px;">ส่งคำขออนุมัติอีกครั้ง (v${req.version}) หลังถูกไม่อนุมัติ</div>
        <div style="font-family:${FONT}; font-size:13px; font-weight:400; color:#92400E; line-height:1.65;"><strong>เหตุผลที่ถูกไม่อนุมัติ (${formatDateTime(rejectedEntry.createdAt)}):</strong> &ldquo;${rejectedEntry.comment ?? '—'}&rdquo;</div>
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
    headerRow(`<svg width="18" height="21" viewBox="0 0 12 14"><path fill="#FFCC00" d="${ICON_HOURGLASS_STATUS}"/></svg>`, 'มีคำขออนุมัติ Credit Term รอดำเนินการ', versionBadge),
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
    submittedStep(req, mailSendIconSvg(14, '#004081')),
    historyStep(req, 'approved', `<svg width="13" height="13" viewBox="0 0 448 512" style="display:block; margin:0 auto;"><path fill="#66C5C5" d="${ICON_CHECK}"/></svg>`, '#66C5C5'),
  ].filter(Boolean) as TimelineStep[]

  const hasNotes = req.approvalResult?.customerComment || req.approvalResult?.hardwareComment || req.approvalResult?.swComment
  const noteBox = hasNotes ? `<tr><td class="px-mobile" style="padding: 0 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="note-bg" style="background:#F0FDF4; border:1px solid #86EFAC; border-radius:4px;"><tr>
      <td width="16" valign="top" style="padding:13px 0 12px 14px;"><svg width="16" height="16" viewBox="0 0 512 512" style="display:block;"><path fill="#14532D" d="${ICON_CIRCLE_CHECK}"/></svg></td>
      <td valign="top" style="padding:12px 14px 12px 10px;">
        <div style="font-family:${FONT}; font-size:13px; font-weight:600; color:#14532D; margin-bottom:2px;">หมายเหตุจากผู้อนุมัติ</div>
        ${sectionCommentsHtml(req, '#14532D')}
      </td>
    </tr></table>
  </td></tr>` : ''

  const body = [
    headerRow(`<svg width="22" height="22" viewBox="0 0 18 18"><path fill="#66C5C5" d="${ICON_CHECK_CIRCLE_CUSTOM}"/></svg>`, 'คำขอของคุณได้รับการอนุมัติแล้ว'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ของคุณได้รับการอนุมัติเรียบร้อยแล้ว คุณสามารถแจ้งลูกค้าหรือดำเนินการเปิดออเดอร์ต่อได้ทันที'),
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
    submittedStep(req, mailSendIconSvg(13, '#004081')),
    historyStep(req, 'rejected', `<svg width="12" height="16" viewBox="0 0 384 512" style="display:block; margin:0 auto;"><path fill="#F3554F" d="${ICON_XMARK}"/></svg>`, '#F3554F'),
  ].filter(Boolean) as TimelineStep[]

  const body = [
    headerRow(`<svg width="20" height="20" viewBox="0 0 14 14"><g stroke="#F3554F" stroke-width="1.8" stroke-linecap="round"><line x1="1.5" y1="1.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="1.5" x2="1.5" y2="12.5"/></g></svg>`, 'คำขอของคุณไม่ได้รับการอนุมัติ'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ของคุณไม่ได้รับการอนุมัติ กรุณาแก้ไขคำขอตามคำแนะนำด้านล่าง แล้วส่งขออนุมัติอีกครั้ง'),
    `<tr><td class="px-mobile" style="padding: 0 32px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="alert-bg" style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:4px;"><tr>
        <td width="16" valign="top" style="padding:13px 0 12px 14px;"><svg width="16" height="16" viewBox="0 0 512 512" style="display:block;"><path fill="#7F1D1D" d="${ICON_CIRCLE_XMARK}"/></svg></td>
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
    headerRow(`<svg width="20" height="20" viewBox="0 0 18 18"><path fill="#6B7280" fill-rule="evenodd" clip-rule="evenodd" d="M9 0C4.02944 0 0 4.02944 0 9C0 13.9706 4.02944 18 9 18C13.9706 18 18 13.9706 18 9C18 4.02944 13.9706 0 9 0ZM2 9C2 5.13401 5.13401 2 9 2C10.6584 2 12.1924 2.57001 13.3995 3.51472L3.51472 13.3995C2.57001 12.1924 2 10.6584 2 9ZM4.6005 14.4853C5.80761 15.43 7.34164 16 9 16C12.866 16 16 12.866 16 9C16 7.34164 15.43 5.80761 14.4853 4.6005L4.6005 14.4853Z"/></svg>`, 'คำขอนี้ถูกยกเลิกแล้ว'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ที่คุณกำลังรอพิจารณาอยู่ถูกยกเลิกโดยผู้ส่งคำขอแล้ว ไม่จำเป็นต้องดำเนินการอนุมัติ/ไม่อนุมัติคำขอนี้อีกต่อไป'),
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
