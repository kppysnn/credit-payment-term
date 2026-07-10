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
| 5 | `pending` → `cancelled` **or** `approved` → `cancelled` (cancelling a `draft` has no email — see below) | Sales (`request.salesEmail`) | `05-cancelled-sale.html` (`buildCancelledEmail()`) |

**Explicitly out of scope for this round:**
- Approver does **not** get a self-confirmation email after they approve/reject — they just acted in the web app and can see the result there. Cancellation follows the same rule: it's never the approver's action to confirm, so they're never emailed about a cancellation either, even one that cancels a request they were waiting to review.
- "ขอข้อมูลเพิ่ม" (Clarify) has no corresponding `RequestStatus` or `ApprovalAction` in the codebase today (`request.ts`, `approval.ts` only define `draft | pending | approved | rejected | cancelled`). Until that status is added to the data model and `RejectModal`/`creditTermService`, a request that needs more info is just a `rejected` request with the ask spelled out in the section comment — it reuses template #4, no separate template.
- Recipient for #2 is **broadcast to the whole `approver` role**, not a per-request assignee — the data model has no assignment field before a decision is made (`ApprovalResult.approverEmail` is only populated *after* someone acts).
- Cancelling a `draft` doesn't email anyone — no one else was waiting on a decision for it. Cancelling a `pending` or `approved` request always emails sales (the actor), with the info card adapting: an `approved`→`cancelled` cancellation adds an "อนุมัติโดย" row (there was a decision to undo) and skips the timeline; a `pending`→`cancelled` cancellation has no approval to show, so it gets a 3-step timeline (created → submitted → cancelled) instead. The caller (`RequestDetailPage.tsx`'s `handleCancel`) checks the request's status *before* calling `cancelRequest()`, since the status flips to `cancelled` by the time the promise resolves.

## 2. Data mapping

All five templates are populated from a single `Request` object (`src/features/credit-payment-term/types/request.ts`). Field → email content mapping:

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
| Primary gradient | `linear-gradient(135deg, #4AADAD 0%, #004081 100%)` | CTA button (with `bgcolor="#004081"` solid fallback for Outlook). Full smooth 0%→100% sweep, same as the original brand gradient — only the light end changed, from `--color-teal` (`#66C5C5`) to `--color-teal-dark` (`#4AADAD`), both real, already-documented WorkX tokens (CLAUDE.md §3.1). A first attempt compressed the transition into a 0-10% stop instead of changing the color — passed contrast math but looked broken (a hard-edged triangular patch in the corner, not a gradient) on this button's actual ~159px rendered width, and was reverted. The color swap keeps the gradient visually smooth and improves white-label-text contrast from ~1.9:1 (measured, WCAG AA fail) to ~3.1:1 at the very first character and ≥4.5:1 (AA) from the button's midpoint on — a real improvement, though not a full guarantee at the leading edge; going further would mean inventing a color outside WorkX's own token set |
| Card border | `#D0D6DF` | Every card/table border |
| Card header bg / text | `#F2F6F8` bg, `#586782` text, weight 500 | Card title bar — matches `Card.tsx`'s `<h3>` exactly (weight 500, not 700) |
| Page bg | `#F8F9FA` | Email body background |
| Surface | `#FFFFFF` | Card bg |
| Heading / field-label+value / body / secondary (timestamps, hints) | `#586782` / `#586782` / `#505050` / `#586782` | Matches every real page `<h1>` (`CreateRequestPage`, `RequestDetailPage`) and `FieldDisplay` in `Card.tsx` — all weight 400-500, never 700, never near-black. **`#929EB4` (`--color-muted`) is no longer used as real text anywhere in these templates** (fixed in an `/impeccable audit` pass — measured 2.5-2.7:1 against every background it appeared on, below WCAG AA's 4.5:1 floor for body text; same fix `DESIGN.md` §10 already applied to `StatusBadge`/`RequestListPage`/`DatePicker` in the live app, just never ported to the email templates until now) |
| Status icon colors | pending `#FFCC00`, approved `#66C5C5` (teal, **not green**), rejected `#F3554F`, cancelled `#F3554F` (red — same as rejected, not the web app's gray `StatusBadge` treatment; see note below) | `utils/status.ts` `STATUS_CONFIG` — status *label text* is always plain `#505050`, only the icon carries color (`StatusBadge.tsx`) |
| Alert tokens (per `Alert.tsx`) | warning `#FFFBEB`/`#FCD34D`/`#92400E` · success `#F0FDF4`/`#86EFAC`/`#14532D` · error `#FEF2F2`/`#FCA5A5`/`#7F1D1D` | Resubmit banner (#2) / approver-note (#3) / rejection-reason (#4) — one color for both title and body, not a two-tone split |
| Version chip | bg `rgba(0,64,129,0.08)`, text `#004081`, weight 600 | Matches `StatusBadge.tsx`'s `v{version}` pill exactly |
| Button text | `#F8F9FA`, weight **400** (never bold), `14px`, `letter-spacing:0.01em` | `Button.tsx` — comment there confirms WorkX buttons are Poppins Regular app-wide |
| Radius | `4px` cards & button | Degrades to square in Outlook desktop — acceptable |
| Font stack | `'Poppins','Noto Sans Thai',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif` | Poppins has no Thai glyphs — order matters, same rule as the web app. The `-apple-system`/`Segoe UI` fallbacks are deliberate (not just a leftover Arial default) — see §5 |
| Numeric alignment | `font-variant-numeric: tabular-nums` on the same font | The app has **no monospace font anywhere** — `mono` in `FieldDisplay`/`RequestDetailPage` only ever sets `tabular-nums`, never switches font-family. `JetBrains Mono` is a phantom token (defined in `globals.css`, never consumed) |
| Shadows | Not used | Most mail clients strip `box-shadow`; borders carry all separation instead |

**CLAUDE.md drift found while building this:** three things CLAUDE.md documents don't match the live code and were corrected here after checking source directly — (1) the topbar has no teal accent stripe (`AppShell.tsx` header has none), (2) every real page `<h1>` is weight 500 / `#586782`, never weight 700 / `#001122` (`#001122` doesn't appear anywhere in `src/`), (3) `StatusBadge` label text is uniformly `#505050` regardless of status — only the icon color changes, and "approved" is teal `#66C5C5`, not green. Worth updating CLAUDE.md itself at some point so the next person building from it doesn't inherit the same drift.

**Deliberate email-only divergence from `StatusBadge.tsx`:** the web app renders `cancelled` as gray (`#6B7280`, CLAUDE.md §4.6) — same neutral treatment across icon and label. In the email templates, `cancelled` uses the same red as `rejected` (`#F3554F`) instead, by explicit request: a gray icon read as too low-contrast/easy-to-miss for a recipient just skimming an inbox, where a rejected vs. cancelled request needs to register as "needs attention" either way. This is scoped to the email templates only — `StatusBadge.tsx`/`utils/status.ts` in the live app are unchanged, so cancelled requests still show gray in-app.

## 5. Email-HTML constraints applied

- **Table-based layout only** — no flexbox/grid (unreliable across Outlook/Gmail app rendering engines).
- **All CSS inline** on the element, plus a `<style>` block for the handful of things that must live there (`@media` responsive breakpoint at 600px, `@media (prefers-color-scheme: dark)` overrides, `:hover` — none of which inline styles can express).
- **Bulletproof button**: `bgcolor` attribute (solid navy) as the fallback for clients that ignore `background: linear-gradient(...)` in the `style` attribute.
- **Dark mode**: `<meta name="color-scheme" content="light dark">` + `<meta name="supported-color-schemes" content="light dark">`, with a dark override block for body/card backgrounds and text colors. Brand navy/teal accents stay as-is (already legible on a dark surface). Every hardcoded text color inside a colored callout (headline, resubmit-warning banner, approved-note, cancellation-reason box) needs its own dark-mode class — a plain inline `color:` with no class is invisible to the `@media (prefers-color-scheme: dark)` block. Found by screenshotting each template with `color_scheme='dark'` (Playwright) after shipping: the main `<h1>` headline had no class at all (`#001122` on a `#111A2B` dark card — effectively invisible), and the approved-note green text stayed `#14532D` on its own dark-flipped `#0F2A18` background (same color family, ~1.5:1 contrast). Fixed via `.text-ink`/`.note-text`/`.banner-text` classes alongside the existing `.text-body`/`.text-secondary`/`.text-muted`/`.text-brand`. Any new callout box needs the same treatment — a background-only dark override without a paired text-color class will silently pass light-mode QA and fail dark-mode.
- **Plain-text fallback link** in the footer of every template, in case the button doesn't render/click in a locked-down client.
- **No header gradient accent bar** — an earlier draft had a 4px `linear-gradient(135deg, #66C5C5 0%, #004081 100%)` strip across the top of every template purely as a decorative flourish. Removed: the WorkX logo already anchors the header, and a gradient hairline above it read as a generic AI-generated design tic rather than a WorkX-specific brand marker. The gradient itself is still used elsewhere (CTA button) — just not as a bare accent line.
- **Callout boxes need their own semantic dark-mode class, not a shared one** — `reasonBoxHtml()` (cancellation reason) used to share the `banner-bg` class with the resubmit-warning banner. Both are neutral-gray in light mode, but `banner-bg`'s dark override is tuned amber/olive (for the warning banner), so the reason box flipped to a warning-colored box in dark mode even though nothing about a cancellation reason is a warning. Fixed by reusing `card-head-bg` (the same neutral dark-navy override cards already use) instead.
- **Bold icon glyphs read as their color; thin ones read as pale** — the rejected-email headline icon used `xmark-red-bare` (a thin-stroke X) even though its color was correct (`#F3554F`); a thin stroke has low ink coverage, so it reads as washed-out pink rather than vivid red regardless of the exact hex value. Swapped for `xmark-red-solid` (the same bold X already used correctly in the timeline dot for this template) — same color, thicker strokes, actually reads as "red" at a glance. General rule for any icon used at header size (~20-25px): prefer the filled/solid variant over an outline one, since coverage area affects perceived color intensity as much as hue does.
- **A CSS class needs to actually be applied for its mobile behavior to fire** — `.stack-col` (stack two columns full-width below 600px) was defined in the media query since this file's very first version but never once used on an element. Two spots needed it and silently didn't get it: `referenceRow()`'s "Request No. | Proposal No." line and #2's financial summary strip — at 375px both just crammed and word-wrapped mid-token (e.g. "รวม" / "ทั้งหมด" split across lines) instead of stacking cleanly. Wired up now, plus a `.hide-mobile` utility for the "|" divider (which otherwise stacks as its own orphaned line between the two).
- **A 460×107px logo shown at 104×24px is ~4x more resolution than the display size ever needs** — `public/workx-logo.png` was 61.9KB for an asset that renders at roughly 100×24px twice per email (header + footer). Resized to 206×48px (~2x the largest display size, safe for retina) and re-quantized to a 64-color palette — 2.15KB, a 97% reduction, no visible quality loss at real display size (checked at 4x zoom). Every email sent carries this asset, so the saving compounds across every recipient.
- **Custom fonts don't survive Gmail** — Gmail (web and mobile app) strips every `@import`/`@font-face`/`<link rel="stylesheet">` referencing an external font, regardless of host (Google Fonts or otherwise) or which browser/OS opens Gmail's web client — confirmed empirically: Gmail shows the same fallback font in both Chrome and Safari, which rules out a browser-level quirk and points at Gmail's own HTML sanitizer. This is a documented, industry-wide email-client limitation (every ESP's dev docs describe the same behavior), not something fixable from the sending side. Apple Mail, Outlook.com, Yahoo Mail, and Outlook/Windows Mail render the real Poppins/Noto Sans Thai; only Gmail specifically falls back. Since a hard fallback to bare Arial is the realistic ceiling, the stack is tuned to look intentional there too: `-apple-system`/`BlinkMacSystemFont` (renders San Francisco on Apple Mail and Gmail-on-macOS) and `'Segoe UI'` (Outlook/Windows Mail) sit ahead of Arial as closer visual matches to Poppins' geometric weight, with Arial as the final floor.

## 6. File list

```
docs/emails/
├── 01-submit-confirmation-sale.html   # → sales, on submit/resubmit
├── 02-new-request-approver.html       # → approver role, on submit/resubmit
├── 03-approved-sale.html              # → sales, on approve
├── 04-rejected-sale.html              # → sales, on reject
└── 05-cancelled-sale.html              # → sales, on cancelling a pending or approved request
```

Each is a standalone `.html` file — open directly in a browser to preview, or paste the `<body>` contents into a transactional-email provider template (SendGrid/SES/Postmark, etc.). `05-cancelled-sale.html` shows the never-approved (`pending`→`cancelled`) content branch — the `approved`→`cancelled` branch (adds an "อนุมัติโดย" row, drops the timeline) isn't checked into a separate static file; exercise it via the app's real cancel flow on an approved request instead.

**These 5 files are generated directly from `emailPreviewService.ts`'s `build*Html()` functions** by `docs/emails/generate-mockups.ts` (run via `npx vite-node docs/emails/generate-mockups.ts` — needs `vite-node` specifically, not plain `tsx`/`node`, since the footer's WorkX logo is imported the same way the app does and only Vite's asset-import handling resolves that to a URL) — not hand-written separately. This is deliberate: earlier drafts of these mockups were edited by hand and drifted out of sync with the live-wired version (stale header/timeline markup, and a placeholder `https://cpt.wplus.example.com` domain that doesn't resolve, so the CTA buttons didn't actually go anywhere). Re-generate them from the real functions any time `emailPreviewService.ts` changes, rather than hand-editing the HTML in both places.
