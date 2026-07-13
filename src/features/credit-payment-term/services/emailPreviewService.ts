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

// Matches SendIcon (components/icons/FigmaIcons.tsx) used for the same
// "submitted"/"resubmitted" steps in StatusTimeline.tsx. paperplane-navy.png
// is rendered from that icon's optically-centered canvas (612.8 x 530.24 —
// padded right/bottom only so the glyph's ink, not just its bounding box,
// sits centered in the circle), so it isn't square like the other icons here.
function submittedIconSvg(height: number): string {
  return iconImg('paperplane-navy', Math.round(height * (612.8 / 530.24)), height)
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
    .timeline-line-muted { border-color: #3A4661 !important; background: #3A4661 !important; }
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

// Fifth take. (1) tinted circle behind a bare icon — competed with the
// timeline's small circular dots below it. (2) the same circle scaled to
// 56px — still just a size bump. (3) a full-bleed status-colored band —
// bolder, but (2)'s plain-background version actually read better. (4) (2)
// again, just centered with more room — better, but still the same
// filled-circle-white-icon shape the timeline's current-step dot ALSO
// uses (just a different size), so the two still read as one idea
// repeated rather than two things each doing their own job.
//
// This version drops the circle entirely — no container shape at all, just
// the icon's own true color, large (unconstrained by needing to fit inside
// a badge, so bigger than any icon size used elsewhere in this file) and
// centered above the title. Nothing here can rhyme with the timeline's
// dots anymore because there's no shape left to rhyme with; the icon
// carries its own weight through size and color alone, the same way the
// centering + generous padding (40px top / 32px bottom) already does the
// work a colored container used to be doing.
function headerRow(iconSvg: string, text: string): string {
  return `<tr><td class="px-mobile" align="center" style="padding: 40px 32px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
      <td align="center">${iconSvg}</td>
    </tr></table>
    <div style="height:18px; line-height:18px; font-size:0;">&nbsp;</div>
    <h1 class="text-ink" style="margin:0; text-align:center; font-family:${FONT}; font-size:23px; font-weight:700; color:#001122; line-height:1.35;">${text}</h1>
  </td></tr>`
}

// Centered to match the now-centered header above it, but capped at 420px
// (via a `width:100%; max-width:420px` inner table, not the plain <p>
// directly) rather than left to center across the card's full ~536px
// content width. Uncapped centered text on a 2-line sentence wraps to
// whatever length each line happens to break at — ragged, uneven line
// lengths that are measurably harder to scan than either left-aligned
// text or centered text with a deliberate width. `max-width` (not a fixed
// `width`) so it still shrinks to fit the 335px mobile content area
// instead of overflowing it.
function bodyCopyRow(text: string, maxWidth = 420): string {
  return `<tr><td class="px-mobile" align="center" style="padding: 0 32px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${maxWidth}px;" align="center"><tr>
      <td align="center">
        <p class="text-body" style="margin:0; text-align:center; font-family:${FONT}; font-size:14px; font-weight:400; color:#505050; line-height:1.65;">${text}</p>
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

// Every dot — including the last one — renders the same small 28px
// light-tint ring. An earlier pass made the last dot bigger and
// solid-filled (see the live app's StatusTimeline.tsx, which still does
// this) specifically so the current/final status read as visually heavier
// before reading any label text. That made sense on its own, but stopped
// making sense once the header above gained its own large bare status icon
// (see headerRow) — the header now already answers "what's the outcome"
// boldly, at the top, before the timeline is even reached. Emphasizing the
// SAME status a second time a few lines down, with the literal same icon,
// read as redundant rather than reinforcing (an approved email showing a
// big teal check in the header, then another teal check immediately below
// it in the timeline). The timeline's job here is just the compact history
// log; the header owns "announce the outcome," so nothing in the timeline
// needs to compete for that anymore.
function timelineDotHtml(step: TimelineStep): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
    <td width="28" height="28" align="center" valign="middle" style="width:28px; height:28px; border-radius:50%; background:rgba(${hexToRgb(step.color)},0.09); border:2px solid ${step.color};">${step.iconSvg}</td>
  </tr></table>`
}
function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

// The dot color (step.color) is chosen for the ring/icon, where a fully
// saturated brand hue reads fine against white at 28px. The SAME hex reused
// as small (11.5px) label text is a different contrast problem — #F3554F
// (rejected/cancelled) measures 3.37:1 there, under WCAG AA's 4.5:1 floor
// (caught by /impeccable critique's browser-based contrast scan). Maps each
// dot color to a readable text-safe variant instead of using it directly;
// #66C5C5 already had this (teal ring, navy label) — extended the same
// pattern to red. Returns the dark-mode class alongside the light-mode
// color — the old code picked the class with a separate `=== '#586782'`
// ternary that only knew "gray" vs "everything else is brand-blue," so a
// red label got the navy `text-brand` dark override and silently rendered
// light blue instead of red in dark mode. One function owns both now so
// they can't drift apart again.
function timelineLabelStyle(dotColor: string): { color: string; darkClass: string } {
  if (dotColor === '#66C5C5') return { color: '#004081', darkClass: 'text-brand' }
  if (dotColor === '#F3554F') return { color: '#7F1D1D', darkClass: 'alert-text' }
  if (dotColor === '#586782') return { color: '#586782', darkClass: 'text-secondary' }
  return { color: dotColor, darkClass: 'text-brand' }
}

function timelineHtml(steps: TimelineStep[]): string {
  const colWidth = steps.length <= 2 ? 120 : 90
  // A 2-step timeline in a full-width table leaves most of the row as bare
  // connector line (2 x 120px of content in a ~536px-wide card) — reads as
  // an unbalanced, overly long line rather than a compact "journey so far."
  // Capping the table itself to a narrower, centered width for that case
  // keeps the same dot/line/label parts but in a proportion that doesn't
  // look like it's missing a third step.
  const tableWidth = steps.length <= 2 ? 300 : '100%'
  const tableAlign = steps.length <= 2 ? ' align="center"' : ''
  const dots = steps.map((step, i) => {
    const connector = i < steps.length - 1
      ? `<td valign="middle" style="padding:0 2px;"><div class="timeline-line-muted" style="height:2px; background:#D0D6DF; font-size:0; line-height:0;">&nbsp;</div></td>`
      : ''
    return `<td width="${colWidth}" align="center" valign="middle">${timelineDotHtml(step)}</td>${connector}`
  }).join('')
  const labels = steps.map((step, i) => {
    const sep = i < steps.length - 1 ? `<td>&nbsp;</td>` : ''
    const { color: labelColor, darkClass } = timelineLabelStyle(step.color)
    return `<td width="${colWidth}" align="center" valign="top" style="padding-top:8px;">
      <div class="${darkClass}" style="font-family:${FONT}; font-size:11.5px; font-weight:600; color:${labelColor};">${step.label}</div>
      <div class="text-secondary" style="font-family:${FONT}; font-size:10.5px; color:#586782; margin-top:1px;">${step.date}</div>
    </td>${sep}`
  }).join('')
  return `<tr><td class="px-mobile" style="padding: 4px 32px 24px;">
    <table role="presentation" width="${tableWidth}" cellpadding="0" cellspacing="0" border="0"${tableAlign}>
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
  return { label: APPROVAL_ACTION_LABELS.created, date: formatDateTime(entry.createdAt), color: '#586782', iconSvg: iconImg('filelines-gray', 12, 15) }
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
function sectionCommentsHtml(req: Request, color: string, darkClass: string): string {
  const parts: string[] = []
  if (req.approvalResult?.customerComment) parts.push(`<strong>${SECTION_LABELS.customerComment}:</strong> &ldquo;${req.approvalResult.customerComment}&rdquo;`)
  if (req.approvalResult?.hardwareComment) parts.push(`<strong>${SECTION_LABELS.hardwareComment}:</strong> &ldquo;${req.approvalResult.hardwareComment}&rdquo;`)
  if (req.approvalResult?.swComment) parts.push(`<strong>${SECTION_LABELS.swComment}:</strong> &ldquo;${req.approvalResult.swComment}&rdquo;`)
  return `<div class="${darkClass}" style="font-family:${FONT}; font-size:13px; font-weight:400; color:${color}; line-height:1.65;">${parts.join('<br>')}</div>`
}

// Pulled out of the info card into its own callout so "ยกเลิกเพราะอะไร" reads
// as the one thing worth noticing, not another line buried among reference
// numbers and dates — same "small icon + label + boxed quote" shape as the
// approved-note (green) and resubmit-warning (amber) callouts, and now the
// same *rule* they already follow: icon, background, border, and text are
// all one color family, not just the icon. An earlier version paired the
// red `ban-red` icon with a neutral gray box (reusing `card-head-bg`) —
// technically correct in dark mode, but visually read as a mismatch/mistake
// next to the fully-red-toned reject callouts elsewhere, and buried the one
// thing this box exists to highlight. Reuses the same error token trio
// already documented in this codebase's Alert tokens (`#FEF2F2`/`#FCA5A5`/
// `#7F1D1D`, see EMAIL_NOTIFICATIONS_SPEC.md §4) rather than inventing a
// new red.
function reasonBoxHtml(comment: string | undefined, label: string): string {
  if (!comment) return ''
  return `<tr><td class="px-mobile" style="padding: 0 32px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="alert-bg" style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:4px;"><tr>
      <td width="16" valign="top" style="padding:13px 0 12px 14px;">${iconImg('ban-red', 16, 16)}</td>
      <td valign="top" style="padding:12px 14px 12px 10px;">
        <div class="alert-text" style="font-family:${FONT}; font-size:13px; font-weight:600; color:#7F1D1D; margin-bottom:2px;">${label}</div>
        <div class="alert-text" style="font-family:${FONT}; font-size:13px; font-weight:400; color:#7F1D1D; line-height:1.65;">&ldquo;${comment}&rdquo;</div>
      </td>
    </tr></table>
  </td></tr>`
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

  // Header title used to read "ส่งคำขอสำเร็จ รอการอนุมัติ" (submitted
  // SUCCESSFULLY, awaiting approval) — mixing "the action succeeded" with
  // "current status" in one title, unlike every other template's title
  // (#2/#3/#4 state only the status, no "success" framing). That framing
  // read oddly next to the hourglass icon: "successfully done" primes a
  // checkmark, but checkmark is already #3's icon for a different meaning
  // (approved). Reworded to pure status ("your request is awaiting
  // approval") — matches the icon cleanly, and the "submission went
  // through" fact isn't lost, it's just where it belongs: the subtitle
  // below, same as it already was.
  const body = [
    headerRow(iconImg('hourglass-yellow', 44, 50), 'คำขอของคุณอยู่ระหว่างรอการอนุมัติ'),
    bodyCopyRow('ส่งคำขออนุมัติ Credit &amp; Payment Term เรียบร้อยแล้ว <br>ระบบได้แจ้งผู้อนุมัติ และจะส่งอีเมลแจ้งผลให้คุณทราบอีกครั้ง'),
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

  const subject = `📤 [ส่งสำเร็จ] ยืนยันการส่งคำขอ #${req.requestNo}`
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
      <td width="16" valign="top" style="padding:13px 0 12px 14px;">${iconImg('triangle-exclamation-amber', 16, 14)}</td>
      <td valign="top" style="padding:12px 14px 12px 10px;">
        <div class="banner-text" style="font-family:${FONT}; font-size:13px; font-weight:600; color:#92400E; margin-bottom:2px;">มีการส่งคำขออนุมัติใหม่ (v${req.version}) หลังจากคำขอเดิมถูกปฏิเสธเมื่อวันที่ ${formatDateTime(rejectedEntry.createdAt)}</div>
        <div class="banner-text" style="font-family:${FONT}; font-size:13px; font-weight:400; color:#92400E; line-height:1.65;"><strong>เหตุผลที่ถูกปฏิเสธครั้งก่อน:</strong> &ldquo;${rejectedEntry.comment ?? '—'}&rdquo;</div>
      </td>
    </tr></table>
  </td></tr>` : ''

  const swPart = req.swInstallmentCount ? ` · SW&amp;Install ${req.swInstallmentCount}` : ''
  const financialCard = cardOpen('สรุปรายละเอียดคำขอ') + `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-head-bg" style="background:#F2F6F8; border-radius:4px;"><tr><td style="padding:12px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="text-secondary stack-col" style="font-family:${FONT}; font-size:13px; font-weight:400; color:#586782;">รวมทั้งหมด</td>
        <td class="stack-col" align="right">
          <span class="text-secondary" style="font-family:${FONT}; font-size:12px; color:#586782;">ราคาทุน <span class="text-secondary" style="font-size:14px; font-weight:500; color:#586782; font-variant-numeric:tabular-nums;">${formatCurrency(req.financial.totalCost)}</span></span>
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

  // No timeline here on purpose (reversed from an earlier pass that added
  // one to match #1/#3/#4 for consistency's sake — wrong reasoning). The
  // created->submitted steps are the SALES rep's journey, not the
  // approver's: they don't lead anywhere actionable for this recipient, and
  // showing "here's what already happened" undercuts the actual point of
  // this email, which is "here's what YOU need to do." #1/#3/#4 show a
  // timeline because it's a recap of the recipient's OWN history ending in
  // an outcome; this one is a task handoff mid-flight, not a recap — a
  // subtitle explaining the ask serves that better than a journey ending in
  // a status the recipient hasn't decided yet.
  const body = [
    headerRow(iconImg('hourglass-yellow', 44, 50), 'มีคำขออนุมัติ Credit Term รอดำเนินการ'),
    bodyCopyRow('มีคำขออนุมัติ Credit &amp; Payment Term ฉบับใหม่รอการพิจารณาจากคุณ <br>กรุณาตรวจสอบรายละเอียดด้านล่างและดำเนินการอนุมัติหรือไม่อนุมัติ'),
    resubmitBanner,
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      fieldRow('ประเภทการขาย', SALE_TYPE_LABELS[req.saleType], { margin: false }) +
      actorDateRow('ผู้ส่ง', `${req.salesName} (${req.salesEmail})`, formatDateTime(req.updatedAt)) +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    financialCard,
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
  const steps = [
    createdStep(req),
    submittedStep(req, submittedIconSvg(14)),
    // check-teal.png's canvas is 320x242 (1.322 ratio) — wider than tall, since
    // a trimmed-to-ink checkmark glyph is a diagonal shape with a short
    // descender and a long upstroke, not a square. A plain 13x13 call
    // stretches it into a 1:1 box, visibly skewing the checkmark inside its
    // otherwise-perfectly-round timeline dot border. 15x11 keeps the source's
    // real proportions (matches the same aspect-correction pattern
    // submittedIconSvg() already uses for paperplane-navy.png).
    historyStep(req, 'approved', iconImg('check-teal', 15, 11), '#66C5C5'),
  ].filter(Boolean) as TimelineStep[]

  // Was a green "success" callout (note-bg/circlecheck-green) sitting right
  // under a teal "approved" status icon — two different hues both reading
  // as "this is good news" in one email. /impeccable critique flagged this
  // as a real inconsistency, not an intentional two-tier signal (nothing in
  // the email explains "teal = status, green = comment"). Reuses this
  // template's own status color instead — the exact bg/border/text trio
  // CLAUDE.md documents for Button.tsx's secondary variant (`#EBF9F9`/
  // `#66C5C5`/`#004081`), so the whole email tells one color story instead
  // of two, and still an existing WorkX token set, not a new color.
  const hasNotes = req.approvalResult?.customerComment || req.approvalResult?.hardwareComment || req.approvalResult?.swComment
  const noteBox = hasNotes ? `<tr><td class="px-mobile" style="padding: 0 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-head-bg" style="background:#EBF9F9; border:1px solid #66C5C5; border-radius:4px;"><tr>
      <td width="16" valign="top" style="padding:13px 0 12px 14px;">${iconImg('checkcircle-teal', 16, 16)}</td>
      <td valign="top" style="padding:12px 14px 12px 10px;">
        <div class="text-brand" style="font-family:${FONT}; font-size:13px; font-weight:600; color:#004081; margin-bottom:2px;">หมายเหตุจากผู้อนุมัติ</div>
        ${sectionCommentsHtml(req, '#004081', 'text-brand')}
      </td>
    </tr></table>
  </td></tr>` : ''

  const body = [
    headerRow(iconImg('check-teal', 66, 50), 'คำขอของคุณได้รับการอนุมัติแล้ว'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ของคุณได้รับการอนุมัติเรียบร้อยแล้ว', 480),
    timelineHtml(steps),
    cardOpen('ข้อมูลคำขอ') +
      referenceRow(req.requestNo, req.version, req.proposalNo) +
      customerBlock(customerName, typeLabel, getContactPerson(req), getContactPhone(req)) +
      actorDateRow('อนุมัติโดย', req.approvalResult?.approverName ?? '—', req.approvalResult?.approvedAt ? formatDateTime(req.approvalResult.approvedAt) : '—') +
      solutionTagsHtml(req) +
    CARD_CLOSE,
    noteBox,
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
  const steps = [
    createdStep(req),
    submittedStep(req, submittedIconSvg(13)),
    historyStep(req, 'rejected', iconImg('xmark-red-solid', 13, 13), '#F3554F'),
  ].filter(Boolean) as TimelineStep[]

  const body = [
    headerRow(iconImg('xmark-red-solid', 50, 50), 'คำขอของคุณไม่ได้รับการอนุมัติ'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ของคุณไม่ได้รับการอนุมัติ <br>กรุณาดูรายละเอียดคำขอเพื่อแก้ไขและส่งขออนุมัติอีกครั้ง'),
    timelineHtml(steps),
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

  const steps = wasApproved ? [] : [
    createdStep(req),
    submittedStep(req, submittedIconSvg(13)),
    historyStep(req, 'cancelled', iconImg('ban-red', 13, 13), '#F3554F'),
  ].filter(Boolean) as TimelineStep[]

  const approvedRow = wasApproved
    ? actorDateRow('อนุมัติโดย', req.approvalResult?.approverName ?? '—', req.approvalResult?.approvedAt ? formatDateTime(req.approvalResult.approvedAt) : '—')
    : ''

  // Same reasoning as the submit-confirmation header: "ยกเลิกคำขอสำเร็จ"
  // (cancellation SUCCEEDED) is action-framing, not status-framing, unlike
  // #2/#3/#4's titles. Reworded to pure status so it reads as one more
  // instance of the same title grammar the other templates use, not a
  // fourth different pattern.
  const body = [
    headerRow(iconImg('ban-red', 50, 50), 'คำขอนี้ถูกยกเลิกแล้ว'),
    bodyCopyRow('คำขออนุมัติ Credit &amp; Payment Term ของคุณถูกยกเลิกเรียบร้อยแล้ว'),
    wasApproved ? '' : timelineHtml(steps),
    reasonBoxHtml(cancelledEntry?.comment, 'เหตุผลที่ยกเลิก'),
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
