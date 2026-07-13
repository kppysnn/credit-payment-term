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

// Gmail (web + app) strips every `@import`/`@font-face`/`<link>` to an
// external stylesheet regardless of who's hosting the font or what OS/browser
// opens it — confirmed by the same fallback rendering in both Chrome and
// Safari against Gmail's web client, which rules out a browser-side font
// quirk and points at Gmail's own HTML sanitizer instead. There is no way for
// a sender to force a real custom font through that filter (industry-wide
// email-client limitation, not something fixable from this codebase — same
// reason every ESP's docs tell you to design for this fallback, not around
// it). So the fallback stack is tuned to look deliberate rather than
// defaulting straight to Arial: `-apple-system`/`BlinkMacSystemFont` render
// San Francisco on Apple Mail/Gmail-on-macOS, `Segoe UI` covers Outlook/
// Windows Mail, and Arial is the last-resort floor for anything else.
const FONT = "'Poppins','Noto Sans Thai',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"

// Icons are hosted PNGs (public/email-icons/*.png), not inline <svg> — Gmail
// (web + mobile) strips <svg> tags from email HTML entirely, so every icon
// in this file was silently disappearing for exactly the recipients this is
// built for. Rasterized once via a real Chromium tab (Playwright) + ImageMagick
// from the exact same source path data the live app renders for each of these
// same semantic icons — StatusBadge.tsx's per-status icon (components/icons/
// FigmaIcons.tsx: HourglassIcon/CheckCircleIcon/XMarkIcon, for pending/approved/
// rejected) for header hero icons, and StatusTimeline.tsx's per-action icon
// (react-icons/fa6: FaCheck/FaXmark/FaBan, plus FigmaIcons.tsx's SendIcon) for
// timeline dots — never an independent approximation of either. (See the repo's
// scratch generator if these ever need regenerating at a different size.)
function iconImg(name: string, width: number, height: number): string {
  return `<img src="${getBaseUrl()}/email-icons/${name}.png" width="${width}" height="${height}" alt="" style="display:block; border:0;">`
}

// ---- Shared shell ----
// @import here is redundant with the <link> tag in <head> on purpose — some
// clients that ignore one respect the other, so both are included to
// maximize how many actually load Poppins/Noto Sans Thai. Neither will
// help in Gmail specifically (web or app): Gmail strips <link rel="stylesheet">
// to external fonts and @font-face/@import alike, the same sanitization
// that already forced icons to PNG and stripped inline <svg> elsewhere in
// this file — it's not a bug here, it's Gmail's documented behavior across
// every sender, not just this app. Everywhere else (Apple Mail, Outlook.com,
// Yahoo, Windows/macOS Mail) this loads the real fonts. Where it's blocked,
// `${FONT}`'s Arial fallback is what actually renders — sans-serif and
// close enough in weight/spacing that the layout doesn't visibly break.
const STYLE_BLOCK = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background: #F8F9FA; }
  @media screen and (max-width: 600px) {
    .email-container { width: 100% !important; }
    .stack-col { display: block !important; width: 100% !important; text-align: left !important; padding-right: 0 !important; padding-left: 0 !important; }
    .stack-col + .stack-col { padding-top: 12px !important; }
    .hide-mobile { display: none !important; }
    .header-title { font-size: 13px !important; }
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
    .text-brand { color: #7EB6E8 !important; }
    .footer-bg { background: #0B1220 !important; border-color: #28344A !important; }
    .header-cell { border-color: #28344A !important; }
    .banner-bg { background: #2A2107 !important; border-color: #92720C !important; }
    .banner-text { color: #FCD34D !important; }
    .alert-bg { background: #2A1113 !important; border-color: #7A2A2A !important; }
    .alert-text { color: #FCA5A5 !important; }
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
            <td class="px-mobile header-cell" style="padding: 30px 32px 24px; border-bottom:1px solid #D0D6DF;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="vertical-align:middle; padding-right:14px;">
                  <img src="${headerLogoUrl}" width="104" height="24" alt="WorkX" style="display:block; border:0;">
                </td>
                <td style="vertical-align:middle; padding-left:14px; border-left:1px solid #E2E8F0;">
                  <span class="text-secondary header-title" style="font-family:${FONT}; font-size:15px; font-weight:600; color:#586782; letter-spacing:0.01em;">Credit &amp; Payment Term</span>
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

// Sixth take, and a different shape from every earlier one. The previous
// version (large bare icon + centered h1 + centered subtitle paragraph, as
// three separate rows) spent nearly a third of the email's height announcing
// a status that a compact bordered box can say just as clearly — and every
// email in the set also had its own separate colored callout box further
// down for the same kind of "here's the why" content (resubmit warning,
// approval note, cancellation reason). Collapsed into one box: a small
// status icon + label on the first line, the explanatory copy (folding in
// any reason text that used to live in its own separate callout) on the
// second. One thing to read, not three; matches the plain "status + request
// info" the whole template set is being trimmed down to.
type StatusTone = 'pending' | 'positive' | 'negative'
const STATUS_TONE_STYLE: Record<StatusTone, { bgClass: string; textClass: string; bg: string; border: string; text: string }> = {
  pending: { bgClass: 'banner-bg', textClass: 'banner-text', bg: '#FFFBEB', border: '#FCD34D', text: '#92400E' },
  positive: { bgClass: 'card-head-bg', textClass: 'text-brand', bg: '#EBF9F9', border: '#66C5C5', text: '#004081' },
  negative: { bgClass: 'alert-bg', textClass: 'alert-text', bg: '#FEF2F2', border: '#FCA5A5', text: '#7F1D1D' },
}
// Icon sits in its own fixed-width column (valign top) instead of inline
// before just the label — label and description are stacked together in the
// column next to it, so the description's left edge lines up under the
// label's instead of jutting out to the far left under the icon on wrap.
// Text colors are each an existing token pair already used (and contrast-
// checked) elsewhere in this file for the same tone — pending's `#92400E`/
// positive's `#004081`/negative's `#7F1D1D`, all on their matching light
// tint — not new colors invented for this box.
function statusBox(tone: StatusTone, iconSvg: string, label: string, description: string): string {
  const s = STATUS_TONE_STYLE[tone]
  return `<tr><td class="px-mobile" style="padding: 32px 32px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="${s.bgClass}" style="background:${s.bg}; border:1px solid ${s.border}; border-radius:4px; overflow:hidden;"><tr>
      <td style="padding:16px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="24" valign="top" style="padding-right:10px;">${iconSvg}</td>
          <td valign="top">
            <div class="${s.textClass}" style="font-family:${FONT}; font-size:16px; font-weight:700; color:${s.text}; line-height:1.3;">${label}</div>
            <div class="${s.textClass}" style="font-family:${FONT}; font-size:13px; font-weight:400; color:${s.text}; line-height:1.65; margin-top:6px;">${description}</div>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>`
}

// Same 135deg sweep as CLAUDE.md's documented Button primary gradient, full
// 0%->100% (a compressed 0-10% version was tried first to force navy behind
// the label sooner — looked broken, like a triangular sticker in the corner
// instead of a gradient, since squeezing 90% of a diagonal transition into a
// 10% sliver of a ~159px-wide button leaves a hard, visible seam). Reverted
// to a smooth full-width sweep and swapped the light end from `--color-teal`
// (#66C5C5) to `--color-teal-dark` (#4AADAD) — both real WorkX tokens
// (CLAUDE.md §3.1), just the darker of the two already-documented shades.
// White label text against this is still ~3.1:1 at the very first character
// (up from ~1.9:1) and clears 4.5:1 (WCAG AA) by the button's midpoint
// onward — an improvement, not a full guarantee at the leading edge, but
// the honest ceiling without inventing a color that isn't in the brand's
// own token set or breaking the gradient's actual visual identity.
function ctaRow(url: string, label: string, extraPaddingBottom = 32): string {
  return `<tr><td align="center" class="px-mobile" style="padding: 24px 32px ${extraPaddingBottom}px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="#004081" style="border-radius:4px; background:linear-gradient(135deg, #4AADAD 0%, #004081 100%);">
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
  return `<tr><td class="footer-bg px-mobile" align="center" style="background:#F8F9FA; padding:28px 32px 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
      <tr><td align="center" style="padding-bottom:14px;">
        <img src="${logoUrl}" width="96" height="22" alt="WorkX" style="display:block; opacity:0.5; border:0;">
      </td></tr>
      <tr><td align="center" class="text-secondary" style="font-family:${FONT}; font-size:12px; font-weight:600; color:#586782; padding-bottom:6px;">
        Credit &amp; Payment Term
      </td></tr>
      <tr><td align="center" class="text-secondary" style="font-family:${FONT}; font-size:11px; color:#586782; line-height:1.7; padding-bottom:12px;">
        อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลฉบับนี้<br>
        หากปุ่มด้านบนกดไม่ได้ <a href="${url}" style="color:#004081;">เปิดลิงก์นี้แทน</a>
      </td></tr>
      <tr><td align="center" class="text-secondary" style="font-family:${FONT}; font-size:10.5px; color:#586782;">
        &copy; 2026 WorkX. All rights reserved.
      </td></tr>
    </table>
  </td></tr>`
}

function cardOpen(title: string): string {
  return `<tr><td class="px-mobile" style="padding: 0 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-bg" style="border:1px solid #D0D6DF; border-radius:4px; overflow:hidden;">
      <tr><td class="card-head-bg" style="background:#F2F6F8; padding:14px 20px;"><h2 class="text-secondary" style="margin:0; font-family:${FONT}; font-size:14px; font-weight:500; color:#586782; letter-spacing:-0.01em;">${title}</h2></td></tr>
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

// "who did it" + "when" is one fact, not two — every card used to spend two
// stacked fieldRow lines on it (e.g. "อนุมัติโดย X" then "วันที่อนุมัติ Y"
// directly underneath), which gave it the same visual weight as unrelated
// single-fact rows like "ประเภทการขาย" and buried the one thing most
// recipients actually open the email to find. Matches customerBlock's
// established "label, primary value, muted secondary detail" shape.
function actorDateRow(label: string, name: string, date: string): string {
  return `<div style="font-family:${FONT}; font-size:14px; line-height:1.9; margin-bottom:12px;">
    <span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">${label}</span>
    <span class="text-secondary" style="font-weight:400; color:#586782;">${name}</span>
    <span class="text-secondary" style="color:#586782; font-size:12px;"> · ${date}</span>
  </div>`
}

// The "|" divider used to sit in its own inline span between the two
// nowrap phrases — fine on a 600px card, but at a 375px width the two
// phrases together don't fit one line, so the browser wraps right after the
// divider and leaves it orphaned alone at the end of a line. Restructured
// as a two-cell table with `stack-col` (the same mobile stacking class
// `.stack-col` already defines but nothing previously applied it to) so
// each phrase gets the full card width and stacks cleanly below 600px; the
// divider itself just hides on mobile (`hide-mobile`) since a stacked
// layout doesn't need one.
function referenceRow(requestNo: string, version: number, proposalNo: string): string {
  const versionChip = version > 1 ? ` <span class="text-secondary" style="color:#586782; font-weight:400;">(v${version})</span>` : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;"><tr>
    <td class="stack-col" style="font-family:${FONT}; font-size:14px; line-height:1.9; white-space:nowrap;">
      <span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">Request No.</span> <span class="text-brand" style="font-weight:600; color:#004081; font-variant-numeric:tabular-nums;">${requestNo}</span>${versionChip}
      <span class="hide-mobile" style="color:#D0D6DF; padding:0 10px;">|</span>
    </td>
    <td class="stack-col" style="font-family:${FONT}; font-size:14px; line-height:1.9; white-space:nowrap;">
      <span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">Proposal No.</span> <span class="text-brand" style="font-weight:600; color:#004081; font-variant-numeric:tabular-nums;">${proposalNo}</span>
    </td>
  </tr></table>`
}

function customerBlock(companyName: string, typeLabel: string, contactPerson: string | undefined, contactPhone: string | undefined): string {
  const contactLine = contactPerson || contactPhone
    ? `<br><span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">ผู้ติดต่อ</span> <span class="text-secondary" style="font-weight:400; color:#586782;">${[contactPerson, contactPhone].filter(Boolean).join(' · ')}</span>`
    : ''
  return `<div style="font-family:${FONT}; font-size:14px; line-height:1.9; margin-bottom:12px;">
    <span class="text-secondary" style="font-size:11px; font-weight:700; color:#586782; text-transform:uppercase; letter-spacing:0.06em;">ลูกค้า</span>
    <span class="text-secondary" style="font-weight:400; color:#586782;">${companyName}</span>
    <span class="text-secondary" style="color:#586782; font-size:12px;">(${typeLabel})</span>${contactLine}
  </div>`
}

function solutionTagsHtml(req: Request): string {
  const tag = (s: string) => `<span class="chip-bg text-brand" style="display:inline-block; padding:4px 8px; margin:0 6px 6px 0; background:#D9F0F0; border-radius:4px; font-family:${FONT}; font-size:12px; color:#004081; line-height:1.4;">${s}</span>`
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

// ==================== Template 1: submit confirmation (sales) ====================
export function buildSubmitConfirmationEmail(req: Request): EmailContent {
  const url = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]

  const body = [
    statusBox('pending', iconImg('hourglass-yellow', 21, 24), 'คำขอของคุณอยู่ระหว่างรอการอนุมัติ',
      'ส่งคำขออนุมัติ Credit &amp; Payment Term เรียบร้อยแล้ว ระบบได้แจ้งผู้อนุมัติ <br>และจะส่งอีเมลแจ้งผลให้คุณทราบอีกครั้ง'),
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

  const subject = `📤 [ส่งสำเร็จ] ยืนยันการส่งคำขอ #${req.requestNo}`
  return { subject, html: shell(subject, `${customerName} · Request No. ${req.requestNo} · อยู่ระหว่างรอการอนุมัติ`, body) }
}

// ==================== Template 2: new request notify (approver) ====================
export function buildNewRequestApproverEmail(req: Request): EmailContent {
  const url = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]
  const isResubmit = req.version > 1

  const body = [
    statusBox('pending', iconImg('hourglass-yellow', 21, 24), 'มีคำขออนุมัติ Credit Term รอดำเนินการ',
      'มีคำขออนุมัติ Credit &amp; Payment Term ฉบับใหม่รอการพิจารณาจากคุณ <br>กรุณาตรวจสอบรายละเอียดด้านล่างและดำเนินการอนุมัติหรือไม่อนุมัติ'),
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      fieldRow('ประเภทการขาย', SALE_TYPE_LABELS[req.saleType], { margin: false }) +
      actorDateRow('ผู้ส่ง', `${req.salesName} (${req.salesEmail})`, formatDateTime(req.updatedAt)) +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    ctaRow(url, 'ดูรายละเอียดคำขอ'),
    footerRow(url),
  ].join('')

  const subject = `⏳ [รออนุมัติ] มีคำขออนุมัติ Credit Term ใหม่ #${req.requestNo}`
  return { subject, html: shell(subject, `${customerName} · Credit Term ${formatCreditTerm(getMaxCreditTerm(req))}${isResubmit ? ` · ส่งซ้ำครั้งที่ ${req.version}` : ''}`, body) }
}

// ==================== Template 3: approved (sales) ====================
export function buildApprovedEmail(req: Request): EmailContent {
  const url = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]

  const body = [
    statusBox('positive', iconImg('check-teal', 24, 18), 'คำขอของคุณได้รับการอนุมัติแล้ว',
      'คำขออนุมัติ Credit &amp; Payment Term ของคุณได้รับการอนุมัติเรียบร้อยแล้ว'),
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      actorDateRow('อนุมัติโดย', req.approvalResult?.approverName ?? '—', req.approvalResult?.approvedAt ? formatDateTime(req.approvalResult.approvedAt) : '—') +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    ctaRow(url, 'ดูรายละเอียดคำขอ'),
    footerRow(url),
  ].join('')

  const subject = `✅ [อนุมัติแล้ว] คำขอ #${req.requestNo} ได้รับการอนุมัติแล้ว`
  return { subject, html: shell(subject, `${customerName} · อนุมัติโดย ${req.approvalResult?.approverName ?? '—'} · Credit Term ${formatCreditTerm(getMaxCreditTerm(req))}`, body) }
}

// ==================== Template 4: rejected (sales) ====================
export function buildRejectedEmail(req: Request): EmailContent {
  const detailUrl = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]

  const body = [
    statusBox('negative', iconImg('xmark-red-solid', 24, 24), 'คำขอของคุณไม่ได้รับการอนุมัติ',
      'คำขออนุมัติ Credit &amp; Payment Term ของคุณไม่ได้รับการอนุมัติ <br>กรุณาดูรายละเอียดคำขอเพื่อแก้ไขและส่งขออนุมัติอีกครั้ง'),
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      actorDateRow('ไม่อนุมัติโดย', req.approvalResult?.approverName ?? '—', req.approvalResult?.rejectedAt ? formatDateTime(req.approvalResult.rejectedAt) : '—') +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    ctaRow(detailUrl, 'ดูรายละเอียดคำขอ'),
    footerRow(detailUrl),
  ].join('')

  const subject = `❌ [ไม่อนุมัติ] คำขอ #${req.requestNo} ไม่ได้รับการอนุมัติ`
  return { subject, html: shell(subject, `${customerName} · ไม่อนุมัติโดย ${req.approvalResult?.approverName ?? '—'}`, body) }
}

// ==================== Template 5: cancellation confirmation (sales) ====================
// Cancellation is only ever sales' own business — they're the one who took
// the action, so they're the one who gets the receipt. The approver used to
// get a separate "this is off the table" email when a request was cancelled
// while still 'pending', but that read as noise to an audience who was never
// going to act on it either way; dropped in favor of sales-only, matching
// how the app never emails the approver a self-confirmation for their own
// approve/reject actions either (see docs/EMAIL_NOTIFICATIONS_SPEC.md §1).
// Content adapts to whether the request had ever been approved: an
// already-approved arrangement going void gets an "อนุมัติโดย" row (nothing
// was decided before this) and a 3-step timeline naming that never-approved
// path — no "อนุมัติแล้ว" step to show, and no need to invent a 4th timeline
// slot just to include one.
export function buildCancelledEmail(req: Request): EmailContent {
  const url = `${getBaseUrl()}/requests/${req.id}`
  const customerName = getCustomerName(req)
  const typeLabel = CUSTOMER_TYPE_LABELS[req.customerInfo.type]
  const cancelledEntry = [...req.history].reverse().find(h => h.action === 'cancelled')
  const wasApproved = Boolean(req.approvalResult?.approvedAt)

  const approvedRow = wasApproved
    ? actorDateRow('อนุมัติโดย', req.approvalResult?.approverName ?? '—', req.approvalResult?.approvedAt ? formatDateTime(req.approvalResult.approvedAt) : '—')
    : ''

  const description = cancelledEntry?.comment
    ? `คำขออนุมัติ Credit &amp; Payment Term ของคุณถูกยกเลิกเรียบร้อยแล้ว <br>เหตุผล: &ldquo;${cancelledEntry.comment}&rdquo;`
    : 'คำขออนุมัติ Credit &amp; Payment Term ของคุณถูกยกเลิกเรียบร้อยแล้ว'

  const body = [
    statusBox('negative', iconImg('ban-red', 24, 24), 'คำขอนี้ถูกยกเลิกแล้ว', description),
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      approvedRow +
      actorDateRow('ยกเลิกโดย', cancelledEntry?.actorName ?? req.salesName, cancelledEntry ? formatDateTime(cancelledEntry.createdAt) : formatDateTime(req.updatedAt)) +
    CARD_CLOSE,
    ctaRow(url, 'ดูรายละเอียดคำขอ'),
    footerRow(url),
  ].join('')

  const subject = `🚫 [ยกเลิกแล้ว] ยืนยันการยกเลิกคำขอ #${req.requestNo}`
  return { subject, html: shell(subject, `${customerName} · ${wasApproved ? 'คำขอที่เคยอนุมัติแล้วถูกยกเลิก' : 'คำขอนี้ถูกยกเลิกแล้ว'}`, body) }
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
