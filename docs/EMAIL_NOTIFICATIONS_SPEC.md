# Credit & Payment Term — Email Notification Spec

> Portable reference for the transactional emails that connect this app to an
> external mail sender. This app is frontend-only (no backend/mail service in
> this repo) — these are **HTML mockups** meant to be wired into whatever
> mail-sending layer the host platform (W+ / Exzy) uses. Each file in
> `docs/emails/` is a standalone, self-contained email HTML document (inline
> CSS, table-based layout) filled with realistic example data pulled from
> `mockRequests.ts` so it can be opened directly in a browser or pasted into
> an email client preview tool.

---

## 1. Trigger matrix

| # | Trigger (status transition) | Recipient | Template file |
|---|---|---|---|
| 1 | `draft` → `pending` (submit, incl. resubmit) | Sales (`request.salesEmail`) | `01-submit-confirmation-sale.html` |
| 2 | `draft` → `pending` (submit, incl. resubmit) | All users with role `approver` | `02-new-request-approver.html` |
| 3 | `pending` → `approved` | Sales (`request.salesEmail`) | `03-approved-sale.html` |
| 4 | `pending` → `rejected` | Sales (`request.salesEmail`) | `04-rejected-sale.html` |

**Explicitly out of scope for this round:**
- Approver does **not** get a self-confirmation email after they approve/reject — they just acted in the web app and can see the result there.
- "ขอข้อมูลเพิ่ม" (Clarify) has no corresponding `RequestStatus` or `ApprovalAction` in the codebase today (`request.ts`, `approval.ts` only define `draft | pending | approved | rejected | cancelled`). Until that status is added to the data model and `RejectModal`/`creditTermService`, a request that needs more info is just a `rejected` request with the ask spelled out in the section comment — it reuses template #4, no separate template.
- Recipient is **broadcast to the whole `approver` role**, not a per-request assignee — the data model has no assignment field before a decision is made (`ApprovalResult.approverEmail` is only populated *after* someone acts).

## 2. Data mapping

All four templates are populated from a single `Request` object (`src/features/credit-payment-term/types/request.ts`). Field → email content mapping:

| Field | Used in |
|---|---|
| `requestNo`, `version` | All — subject line + reference card |
| `salesName`, `salesEmail` | All — "ผู้ส่ง" field, and templates #1/#3/#4 recipient |
| `proposalNo`, `quotationNo` | All — reference card |
| `customerInfo.data.companyName` (+ `CUSTOMER_TYPE_LABELS[customerInfo.type]`) | All — reference card |
| `customerInfo.data.contactPerson`, `.contactPhone` | All — matches the ผู้ติดต่อ/โทรศัพท์ `FieldDisplay` rows on `RequestDetailPage.tsx` (was missing in an earlier draft) |
| `SALE_TYPE_LABELS[saleType]` | All |
| `solutions` (+ `swSolutions` when `saleType === 'hardware_software_installation'`) | All — rendered as `#D9F0F0`/`#004081` pill tags, matching `solutionTags()` in `RequestDetailPage.tsx:394-403` exactly. Split sale type gets two labeled groups ("Hardware" / "Software & Installation") instead of the page's two fully independent quotation blocks — full per-block quotation numbers/itemized cost-sell tables are deliberately left out of the email (that's the job of the in-app detail page/PDF export, not a notification email) |
| `financial.totalSelling`, `financial.totalCost` | All — flat summary bar (`ราคาทุน`/`ราคาขาย`), **not** `grossProfit`/`marginPercent` (never rendered anywhere in the live app — see §4 note) |
| `installmentCount` | #2 |
| `history` (last entry, action `resubmitted`) + `previousSnapshot` present | #2 — triggers the "ส่งซ้ำครั้งที่ v{n}" warning banner |
| `approvalResult.approverName`, `.approvedAt` | #3 |
| `approvalResult.approverName`, `.rejectedAt`, `.customerComment` / `.hardwareComment` / `.swComment` | #4 — shown verbatim as the rejection reason, per-section |

Deliberately excluded even though the field exists on `Request`: `requestPurpose` (never rendered on the live `RequestDetailPage.tsx` screen — only appears in the PDF export path, `exportService.ts:150` — and is empty in every mock request used here anyway) and per-item (`quotationItems`) cost/sell breakdown (shown on the live page's `itemsTable()`, but itemizing every line would turn a notification email into a document — the CTA button is the path to that level of detail).

Currency values use the real `formatCurrency()` (`utils/calculations.ts`) exactly — `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 })`, e.g. `฿500,000.00`. **Correction from an earlier draft of this doc**: the static mockups in `docs/emails/*.html` show plain `500,000` with no ฿ symbol or decimals — that was based on `exportService.ts`'s raw `.toLocaleString()` calls, not the `formatCurrency()` utility that `RequestFormStepper.tsx`/`RequestDetailPage.tsx` actually use for the same ราคาทุน/ราคาขาย figures. `emailPreviewService.ts` (the live-wired version) uses the correct `formatCurrency()` — confirmed by browser-testing the real submit/approve/reject flow. The static mockups haven't been updated to match; treat `emailPreviewService.ts` as the source of truth. Dates use the `formatDateTime` convention (`th-TH` locale, e.g. `25 มิ.ย. 2569 16:00`).

## 3. Deep link

Every template's CTA button and the plain-text fallback link both point at:

```
{BASE_URL}/requests/{request.id}
```

`{BASE_URL}` is a placeholder (`https://cpt.wplus.example.com` in the mockups) — swap for the real deployed origin when wiring this into the mail sender. Template #4 (rejected) links straight to `/requests/{id}/edit` instead, since editing-then-resubmitting is the only action sales can take from a rejected request.

No query-param deep-linking into the Approve/Reject modals — CTA always lands on the normal `RequestDetailPage`, and the user takes the approve/reject/edit action in the app exactly as they would from the request list. This avoids needing to add modal-auto-open logic to `RequestDetailPage.tsx` for this round.

## 4. Design tokens (verified directly against component source, not CLAUDE.md's token table — see note below)

| Token | Value | Where |
|---|---|---|
| Navy | `#004081` | Reference-number values, primary financial figure, Credit Term value, button gradient end |
| Teal | `#66C5C5` | Button gradient start, Credit Term highlight tile border, **approved-status icon** |
| Primary gradient | `linear-gradient(135deg, #66C5C5 0%, #004081 100%)` | CTA button (with `bgcolor="#004081"` solid fallback for Outlook) |
| Card border | `#D0D6DF` | Every card/table border |
| Card header bg / text | `#F2F6F8` bg, `#586782` text, weight 500 | Card title bar — matches `Card.tsx`'s `<h3>` exactly (weight 500, not 700) |
| Page bg | `#F8F9FA` | Email body background |
| Surface | `#FFFFFF` | Card bg |
| Heading / field-label+value / body / muted | `#586782` / `#586782` / `#505050` / `#929EB4` | Matches every real page `<h1>` (`CreateRequestPage`, `RequestDetailPage`) and `FieldDisplay` in `Card.tsx` — all weight 400-500, never 700, never near-black |
| Status icon colors | pending `#FFCC00`, approved `#66C5C5` (teal, **not green**), rejected `#F3554F` | `utils/status.ts` `STATUS_CONFIG` — status *label text* is always plain `#505050`, only the icon carries color (`StatusBadge.tsx`) |
| Alert tokens (per `Alert.tsx`) | warning `#FFFBEB`/`#FCD34D`/`#92400E` · success `#F0FDF4`/`#86EFAC`/`#14532D` · error `#FEF2F2`/`#FCA5A5`/`#7F1D1D` | Resubmit banner (#2) / approver-note (#3) / rejection-reason (#4) — one color for both title and body, not a two-tone split |
| Version chip | bg `rgba(0,64,129,0.08)`, text `#004081`, weight 600 | Matches `StatusBadge.tsx`'s `v{version}` pill exactly |
| Button text | `#F8F9FA`, weight **400** (never bold), `14px`, `letter-spacing:0.01em` | `Button.tsx` — comment there confirms WorkX buttons are Poppins Regular app-wide |
| Radius | `4px` cards & button | Degrades to square in Outlook desktop — acceptable |
| Font stack | `'Poppins','Noto Sans Thai',Arial,sans-serif` | Poppins has no Thai glyphs — order matters, same rule as the web app |
| Numeric alignment | `font-variant-numeric: tabular-nums` on the same font | The app has **no monospace font anywhere** — `mono` in `FieldDisplay`/`RequestDetailPage` only ever sets `tabular-nums`, never switches font-family. `JetBrains Mono` is a phantom token (defined in `globals.css`, never consumed) |
| Shadows | Not used | Most mail clients strip `box-shadow`; borders carry all separation instead |

**CLAUDE.md drift found while building this:** three things CLAUDE.md documents don't match the live code and were corrected here after checking source directly — (1) the topbar has no teal accent stripe (`AppShell.tsx` header has none), (2) every real page `<h1>` is weight 500 / `#586782`, never weight 700 / `#001122` (`#001122` doesn't appear anywhere in `src/`), (3) `StatusBadge` label text is uniformly `#505050` regardless of status — only the icon color changes, and "approved" is teal `#66C5C5`, not green. Worth updating CLAUDE.md itself at some point so the next person building from it doesn't inherit the same drift.

## 5. Email-HTML constraints applied

- **Table-based layout only** — no flexbox/grid (unreliable across Outlook/Gmail app rendering engines).
- **All CSS inline** on the element, plus a `<style>` block for the handful of things that must live there (`@media` responsive breakpoint at 600px, `@media (prefers-color-scheme: dark)` overrides, `:hover` — none of which inline styles can express).
- **Bulletproof button**: `bgcolor` attribute (solid navy) as the fallback for clients that ignore `background: linear-gradient(...)` in the `style` attribute.
- **Dark mode**: `<meta name="color-scheme" content="light dark">` + `<meta name="supported-color-schemes" content="light dark">`, with a dark override block for body/card backgrounds and text colors. Brand navy/teal accents stay as-is (already legible on a dark surface).
- **Plain-text fallback link** in the footer of every template, in case the button doesn't render/click in a locked-down client.
- **No web fonts loaded via `@import`/`<link>`** — email clients block external stylesheet fetches; Poppins/Noto Sans Thai are listed as preferred but the stack always falls through to system sans/Arial.

## 6. File list

```
docs/emails/
├── 01-submit-confirmation-sale.html   # → sales, on submit/resubmit
├── 02-new-request-approver.html       # → approver role, on submit/resubmit
├── 03-approved-sale.html              # → sales, on approve
└── 04-rejected-sale.html              # → sales, on reject
```

Each is a standalone `.html` file — open directly in a browser to preview, or paste the `<body>` contents into a transactional-email provider template (SendGrid/SES/Postmark, etc.).
