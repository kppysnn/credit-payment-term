# DESIGN.md — WorkX / W+ Design System · payment&creditTerm Module

> **Primary sources:** Figma `60RgjevWzbKhCCjoc5kcmk` (W+ Library — Website/Button/Field/Icon-grid pages) and Figma `ALvNsSNBdxzj9MVk2imemL` (Exzy_WorkX — the actual host app draft, incl. node `1317:2565` TopMenuBar, `1765:5235` status column, `730:25425` table pattern, `909:1495` RadioCheckbox)
> **Verified against:** live MCP inspection of both files + current `src/` code (not assumptions) — every fact below has been cross-checked against an actual component or an actual Figma node, not carried over from an older doc
> **Last rewritten:** 2026-06-29 — supersedes all prior versions of this file. Previous versions had drifted from the real code in several places (button variants, status-badge text color, input radius, topbar/sidebar structure, icon library) — those are corrected here, not repeated.

This document is the authoritative design reference for this module. Where the live code and an older doc (CLAUDE.md included) disagree, **trust this file** — it was rebuilt directly from `src/` and from Figma, not inherited.

---

## 1. Design System Overview

WorkX / W+ (Exzy platform) is a **B2B internal enterprise platform** in a **Professional-Clean** language:

- Trust and clarity over decoration
- Semantic color usage — every hex carries a role
- Bilingual text — Thai and English coexist in one font stack (Poppins → Noto Sans Thai fallback)
- Squared 4px components app-wide (EXZY CI v3, commit `98d50f4`) — one exception: `<Select>` at 8px (see §5)
- Hierarchy from **color**, not boldness — the host's own tables and status displays use little-to-no bold text; weight is reserved for things that genuinely need it (page titles, totals)

This module is an embedded sub-section of the WorkX host and must be visually indistinguishable from it.

### 1.1 Two layout realities — read this before touching layout

There are **two** layout implementations in this codebase and only one is live:

| | `AppShell.tsx` | `Sidebar.tsx` |
|---|---|---|
| Mounted by the router? | **Yes** — wraps every route | **No** |
| Structure | Two-row sticky top header, no sidebar | 260px navy sidebar |
| When it applies | Right now, in this standalone app | Only if/when this module is embedded inside the real WorkX host shell, which may supply its own sidebar externally |

`Sidebar.tsx` is fully built (nav items, role badge, user footer) but currently renders nowhere. Don't assume a sidebar is visible — it isn't, today. Don't delete it either — it's there for the embedded-host scenario described in `CLAUDE.md`.

---

## 2. Color System

### 2.1 Brand Palette (EXZY CI) — defined in `src/styles/globals.css` `@theme {}`

| Token | Hex | Role |
|-------|-----|------|
| `--color-navy` | `#004081` | Primary heading, info, primary text on light buttons |
| `--color-navy-dark` | `#002D5C` | Navy hover state |
| `--color-teal` | `#66C5C5` | Accent, focus ring, active indicator |
| `--color-teal-dark` | `#4AADAD` | Teal hover state |
| `--gradient-primary` | `linear-gradient(135deg, #66C5C5 0%, #004081 100%)` | Primary button, quotation block headers, `AddCircleIcon`'s effective look |

Components use the **hardcoded hex**, not `var(--color-*)`, in inline styles — this is the established pattern (`CLAUDE.md` §3.2). Don't refactor to CSS vars without an explicit ask.

### 2.2 Neutral / Surface

| Token | Hex | Role |
|-------|-----|------|
| `--color-bg` | `#F8F9FA` | Page background, `<main>`, table-row hover, tfoot tint |
| `--color-surface` | `#FFFFFF` | Card/input/modal body |
| `--color-surface-2` | `#F2F6F8` | Card header, table header bg (where one exists), read-only input bg |
| `--color-border` | `#D0D6DF` | Structural borders — see the three-tier divider system in §6 |

### 2.3 Text Hierarchy

| Token | Hex | Role |
|-------|-----|------|
| `--color-ink` | `#586782` | **Corrected 2026-06-29** — no component actually uses a distinct near-black "ink" anymore. WorkX's own `text/title` token is `#586782` (confirmed against its real page title and a modal header title, both independently) — same value as `--color-secondary`. This token's old value (`#001122`) never matched anything real in WorkX; don't reintroduce it for new headings. |
| `--color-body` | `#505050` | Default body text (`body{}` in globals.css), **the StatusBadge label color, always** |
| `--color-secondary` | `#586782` | Labels, secondary text, section-band labels, **and now all heading/title text too (see `--color-ink` above) and filled field text (`text/filled` token, confirmed via `909:1107`)** |
| `--color-muted` | `#929EB4` | Placeholders (decorative use only — see note below), timestamps, hints |

**`::placeholder` does NOT use `--color-muted`.** It's set to `--color-secondary` (`#586782`) globally in `globals.css`, confirmed against the real app draft — placeholder text needs body-level contrast, not the lighter decorative muted tone. `--color-muted` is reserved for genuinely decorative/disabled contexts (timestamps, disabled input text).

### 2.4 Semantic Status Colors (token level)

| Token | Hex |
|-------|-----|
| `--color-success` | `#82C566` |
| `--color-warning` | `#FFCC00` |
| `--color-danger` | `#F3554F` |
| `--color-info` | `#004081` |

These are *not* all directly used as status icon colors — see §2.5 for the actual per-status mapping, which deviates from this table in two places (`approved` uses teal, not `--color-success` green; `cancelled`/`revised` use colors outside this table entirely).

### 2.5 Status Display — `StatusBadge` (corrected)

**The label is always plain gray (`#505050`). Only the icon carries the status color.** This was confirmed against the real draft of this module's status column (Exzy_WorkX node `1765:5235`) — there is no per-status text color anymore. (An earlier version of this doc listed a "text colour" column per status; that's obsolete — `getStatusConfig()` in `status.ts` has no such field.)

No background, no border, no pill — just `<Icon color={iconColor} /> <span style={{color:'#505050'}}>{label}</span>`.

| Status | Icon | Icon color | Source |
|--------|------|-------------|--------|
| `draft` | `FiFileText` | `#929EB4` | react-icons/fi |
| `pending` | `HourglassIcon` | `#FFCC00` (`--color-warning`) | `FigmaIcons.tsx`, exact Figma path |
| `approved` | `CheckCircleIcon` | `#66C5C5` (teal) | `FigmaIcons.tsx` — **teal, not `--color-success` green.** Confirmed repeatedly against the real draft; do not "fix" this back to green. |
| `rejected` | `XMarkIcon` | `#F3554F` | `FigmaIcons.tsx` — a bare crossed-bar X, **not** a circled X-mark |
| `revised` | `RefreshIcon` | `#1E40AF` | `FigmaIcons.tsx`, exact `icon_refresh` (937:1108) path |
| `cancelled` | `FiSlash` | `#6B7280` | react-icons/fi |

Size: `sm` → icon 13px / label 12px. `md` (default) → icon 14px / label 13px. Optional `subtitle` line (e.g. approver name) at 11px / `#929EB4`.

### 2.6 Approval Timeline Colors — `StatusTimeline`

Separate palette from §2.5 (timeline dots, not the inline badge):

| Action | Color | Icon |
|--------|-------|------|
| `approved` | `#66C5C5` | `FiCheck` — matches StatusBadge's teal exactly |
| `rejected` | `#F3554F` | `FiX` |
| `cancelled` | `#929EB4` | `FiSlash` |
| `submitted` / `resubmitted` | `#004081` | `MailSendIcon` (exact `icon_Mail_send`, 937:1093) |
| `edited` | `#92400E` | `RefreshIcon` |
| `created` / `draft_saved` | `#586782` | `FiFileText` |

Dot: 28px circle, background = `color + '18'` (≈12% tint), 2px solid border in `color`. Connector line: 2px, `#D0D6DF`. Version chip (`v2`, `v3`...): bg `rgba(0,64,129,0.08)`, color `#004081`, **radius 4** (not pill — this was a stray `9999` fixed in 2026-06-26).

### 2.7 Alert — its own pastel palette (not the brand tokens)

`Alert.tsx` does not reuse `--color-success`/`--color-warning`/etc. directly — it has 4 dedicated pastel pairs:

| Type | bg | border | text |
|------|-----|--------|------|
| `warning` | `#FFFBEB` | `#FCD34D` | `#92400E` |
| `info` | `#EFF6FF` | `#93C5FD` | `#1E40AF` |
| `success` | `#F0FDF4` | `#86EFAC` | `#14532D` |
| `error` | `#FEF2F2` | `#FCA5A5` | `#7F1D1D` |

The same red trio (`#FEF2F2` / `#FCA5A5` / `#7F1D1D`) is reused outside `<Alert>` too — it's the standard "reviewer note / rejection" box color wherever one appears (`ApproveModal`/`RejectModal`/`CancelModal` info boxes use the same red on reject/cancel; `sectionComment` boxes on the detail page; the "previously rejected" inline callout). Treat this exact triplet as the canonical destructive/warning-note color, separate from button danger red.

### 2.8 Shadow System — navy-tinted only, no exceptions

```css
--shadow-sm:    0 1px 2px rgba(0,64,129,0.04);
--shadow-md:    0 4px 14px rgba(0,64,129,0.07);
--shadow-lg:    0 16px 34px rgba(0,64,129,0.10), 0 2px 6px rgba(0,64,129,0.06);
--shadow-hover: 0 4px 14px rgba(0,64,129,0.07);   /* alias of shadow-md, used by Card's hover handler */
```

Never `rgba(0,0,0,x)`. The whole `src/` tree was swept for this — zero violations remain outside dead files.

### 2.9 Other confirmed colors (not part of the token system, used at fixed points)

| Hex | Where | Role |
|-----|-------|------|
| `#7F1D1D` | rejection/cancel info boxes, error-text inside red notes | darker red than `--color-danger`, for text-on-pastel-bg legibility |
| `#FCA5A5` / `#FCD34D` / `#93C5FD` / `#86EFAC` | Alert borders | pastel border companions to each Alert type's bg |
| `rgba(102,197,197,0.10–0.2)` | segBtn active bg tints, ghost-button hover bg, RoleSwitcher active pill bg | teal-tinted backgrounds at varying opacity, never a flat teal fill |
| `#707070` | Button `secondary` text | distinct from `--color-secondary` (`#586782`) — confirm before assuming they're interchangeable |

---

## 3. Typography

### 3.1 Font Stack — one family, no mono

```css
--font-sans: 'Poppins', 'Noto Sans Thai', system-ui, sans-serif;
```

**There is no `--font-mono` anymore.** A 2026-06-2x cleanup (commit `9ae249f`, "...drop JetBrains Mono") removed it project-wide. Numbers/currency/reference codes get `fontVariantNumeric: 'tabular-nums'` on the regular sans font — not a separate monospace family. If you see `fontFamily: 'JetBrains Mono...'` anywhere, it's in dead code (`QuotationInformationStep.tsx`, `StickyRequestSummary.tsx` — both unused, see §11) and should not be treated as current style.

**Poppins MUST come first.** It has no Thai glyphs, so Thai characters cascade to Noto Sans Thai automatically, even mid-string. Reversing the order breaks mixed-language text.

### 3.2 Type Scale (as actually implemented, file by file)

| Role | Size | Weight | Color | Where |
|------|------|--------|-------|-------|
| List-page title | **36px** | **500** | `#586782` | `.page-title` class (globals.css) — used only by `RequestListPage`'s `<h1>`. Matches the WorkX host's own title text exactly ("My Works", Exzy_WorkX `851:2532`) — corrected 2026-06-29, was navy. |
| Form/detail page title | 22px | **500** | `#586782` | Inline `<h1>` on `CreateRequestPage`, `EditRequestPage`, `RequestDetailPage` — a different, smaller convention from the list page (size differs; weight/color do not — both are WorkX's `text/title`, Poppins Medium). Was 700 until 2026-06-29; don't unify the *sizes*, they're deliberately different page types, but weight should match. |
| Card header / Section title | 14px / 16px | **500** | `#586782` | `Card.tsx`, `Section.tsx`, `-0.01em` letter-spacing. Was 700 — WorkX's own title text is Poppins Medium, confirmed twice (page title, modal header), never bold. See §13 typography note. |
| Section band label (`labeledBand`, and its `RequestFormStepper` duplicate) | 13px | **400** | `#586782` | Was 700, then briefly 600 as a guessed "middle tier" (2026-06-29), then settled at 400 the same day once asked directly why it was still bold — there is no middle tier, see the general rule below. |
| `FieldDisplay` label | 11px | 700 | `#586782` | UPPERCASE + `0.06em` letter-spacing, unless `preserveLabelCase` (then normal case, `0.01em`). **Deliberately left at 700** — a distinct micro-label/eyebrow pattern, not directly checked against Figma, don't assume it should soften just because titles did. |
| `FieldDisplay` value | 14px | per-field (`valueWeight` prop, no longer hardcoded) | `#586782` | `line-height: 1.5` — matches WorkX's `text/filled` token (confirmed via `909:1107`), not a distinct "ink" |
| Form label (`FormGroup`) | 12px | **400** | `#586782` | required `*` in `#F3554F`/700 (unconditional). Was 600 — that same `909:1107` component's own field-title header is Poppins Regular. **Any hand-rolled label that isn't actually wrapped in `<FormGroup>` (button-group/radio-row labels like "จำนวนงวด", "ประเภทการขาย") must be styled to match this exactly** — they don't inherit the component's fix automatically and have drifted out of sync with it before. |
| Body text | 14px | 400 | `#505050` | `body{}` in globals.css, `line-height: 1.65` |
| Detail-page table header | 12.5px | **400** | `#004081` | `tableHeaderCell` in `RequestDetailPage.tsx` — **not bold, not uppercase, not gray.** Explicit code comment: "Hierarchy comes from color, not boldness — the host's own tables carry no bold text at all." |
| List-page table header | 13px | 400 | `#004081` | `RequestListPage.tsx` — same philosophy, slightly different size, with sortable carets |
| List-page filter label ("Status"/"Date") | 16px | 400 | `#707070` | English, not Thai — matches WorkX's own filter row exactly (Exzy_WorkX `851:2542`, "Month"). Scoped to just this bar; every other label in the module stays Thai. |
| Form entry-table header (`priceTable`) | 12px | 400 | `#586782` | `RequestFormStepper.tsx` — right-aligned column labels above price inputs |
| Modal header | 16px | **500** | `#586782` | `Modal.tsx`. Was 700 — confirmed Poppins Medium against a real WorkX modal header (`1319:3275`). |
| Hint / muted | 11–12px | 400 | `#929EB4` | timestamps, hints |
| StatusBadge label | 13px (12px `sm`) | 400 | `#505050` always | regardless of status — see §2.5 |

**General rule (settled 2026-06-29, after three passes the same day): there is no "in-between" weight for labels.** Every title/label checked against live Figma came back Medium (500, titles only) or Regular (400, everything else) — bold doesn't appear in any example fetched this engagement. **Any label is 400, full stop** — this includes section-band labels, sub-total labels, radio-card/segmented-button option text, unit suffixes ("วัน", "%"), hint text ("แนะนำ X%"), checkbox labels — anything whose job is to *name* something rather than *be* a value. A "softened to 600 as a middle tier" exception was tried twice for sub-total labels and reverted both times once questioned directly — don't reintroduce it.

**Numbers are the one legitimate exception to "everything is 400 or 500."** A real amount/figure (currency, a validation percentage, a financial total) may keep weight — that's a distinct, defensible "numbers should be scannable" convention, unrelated to heading weight. Within that convention there's a real hierarchy: the *one* grand total per page (`รวมทั้งหมด`) sits at 600/700, category sub-totals sit at 500/600, e.g. `RequestDetailPage`'s `totalStrip` and `RequestFormStepper`'s identical pattern — **keep these two files' numeric weights matched to each other**, a mismatch between them (600/700 vs 500/600) was caught and fixed the same day specifically because the two patterns are supposed to be the same thing.

White text over a colored gradient bar, and the small uppercase `FieldDisplay` eyebrow label (a value-grid label, not a control label) are the only other confirmed exceptions — see §3.2's per-row notes for exactly which ones and why.

### 3.3 Thai Text

```css
:lang(th), .thai { line-height: 1.75; }
```
Needed for tone-mark clearance. Apply via `:lang(th)` (automatic on Thai-script text) or the `.thai` class.

---

## 4. Spacing Scale (4pt base, `globals.css`)

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

Page layout: `<main>` padding `28px 32px` (`AppShell.tsx`).

---

## 5. Border Radius — corrected (twice — see below)

**EXZY CI v3 (commit `98d50f4`): squared app-wide.** But form fields specifically follow a *different* universal radius than buttons/cards do — confirmed directly against the W+ Library's "Web Text field" component (`909:1107`) on 2026-06-29:

| Element | Radius | Note |
|---------|--------|------|
| Buttons, Card, Modal, Alert, comboDropdown panel, quotationBlock | **4px** | universal |
| `<Input>`, `<Textarea>`, `<Select>` | **8px** | all three field types — confirmed via `909:1107` ("Web Text field", `rounded-lg`) and `926:425` ("field-dropdown"). `<Input>`/`<Textarea>` used to be 4px; that was this module's radius-squaring pass overshooting past what the real field component specifies. `<Select>` was already right. |
| Checkbox (`Checkbox.tsx`) | **4px** | confirmed via `1052:450` ("MultiCheckbox") |
| Module-switcher nav tabs (`AppShell.tsx`) | **10px** | another deliberate exception, mirrors the Figma TopMenuBar's tab shape |
| Sidebar nav items (`Sidebar.tsx`, unmounted) | 8px | only relevant if/when Sidebar is mounted |
| Sidebar logo mark, RoleSwitcher pills, Sidebar role badge | 10 / 9999 / 9999 | RoleSwitcher is a dev-only tool — out of scope of the squaring rule. Sidebar's pill role badge is a known stray leftover in unmounted code, not yet fixed (low priority since it never renders). |

`--radius-pill: 9999px` is still **defined** in `globals.css` for legacy/embedded-component reasons but is explicitly commented "kept defined but unused — don't default to it." Don't reach for it in new live-rendered components.

---

## 6. Border / Divider System — three tiers, not one

This is the most-corrected section of this doc. There are three distinct divider weights, each meaning something different — treat them as different concepts, not interchangeable grays:

1. **Structural / block-level (`#D0D6DF`, usually 1px)** — a real boundary between two separate blocks: Card's own border, Modal's header/footer separators, `quotationBlock`'s outer border, a table's `tfoot` top rule (grand total), the `labeledBand` rule when it sits inside a bordered container (`framed=true`).
2. **Soft / row-level (`#F2F6F8`, 1px)** — a divider between peers inside the same block: every ordinary table body row's top border, `comboDropdown` result-row separators, a `labeledBand` rule when it sits in a plain Card body with no outer box to echo (`framed=false`, e.g. the customer note).
3. **Component-resting (`#D0D6DF`)** — the default resting border on inputs/Select/Cards before any state change; not a divider at all, just the element's own edge.

**Tables specifically never have both at once.** A table header row has no bottom border; instead every body row gets a top border in `#F2F6F8`, and only the very last row (tfoot/total) gets the heavier `#D0D6DF` + a tint (`#F8F9FA`). This matches the WorkX host's own table convention (Figma node `730:25425`) and was the single biggest correction made across this module's tables in the 2026-06-2x consistency pass.

**Cards always have an outer border; tables (on their own, outside a Card) never do.** `RequestListPage`'s table sits directly on the page background with zero outer frame — that's intentional, matching the host, not a missing Card wrapper.

**Header padding always equals body padding, table by table** — confirmed against Exzy_WorkX node `851:2649` (one shared padding spec, `16px/10px`, reused for header and body cells alike) and fixed everywhere on 2026-06-29: `RequestListPage` (`14px 20px`), `RequestDetailPage`'s `tableHeaderCell` (`12px 14px`), `RequestFormStepper`'s own summary table (`12px 14px`). The sort-caret gap from the column label was also widened (`marginLeft: 4` → `10`) to match Figma's effective visual spacing. **Still open:** whether the host shows an inline column-filter affordance that this module's tables lack — not yet checked.

---

## 7. Layout

### 7.1 `AppShell.tsx` — the live shell

```
┌──────────────────────────────────────────────────────────┐
│ Row 1: padding 18px 32px, justify space-between           │
│   [WorkX logo, height 44px]   [role-switcher · 14px name  │
│                                 · 32px avatar · 32px       │
│                                 bordered chevron box]      │
├──────────────────────────────────────────────────────────┤ ← 1px solid #D0D6DF (NOT a shadow)
│ Row 2: padding 14px 28px, centered, gap 14, wrap          │
│   [module tab] [module tab] ... [Payment & Credit Term*]  │
└──────────────────────────────────────────────────────────┘
<main> bg #F8F9FA, padding 28px 32px
  <Outlet />
```

Whole header: `position: sticky; top: 0`, bg `#FFFFFF`, **no `boxShadow` at all**. The only separator between the two rows is a literal 1px line (confirmed via Figma's own sibling frame "Frame 7597", height 1px — there is no drop-shadow effect on the real TopMenuBar despite an earlier assumption that there was).

Logo sizing note: Figma's literal logo height is 60px on a 1920px-wide canvas (~3% ratio). Rendered literally at 60px on this app's narrower actual viewport, it read oversized — so the logo is instead scaled to roughly match that *ratio* (44px), not the literal Figma pixel value. This is a deliberate, viewport-relative adaptation, not a deviation to "fix."

Module tabs: inactive = transparent bg, `1px solid transparent`, `#586782` text. Active = `rgba(102,197,197,0.1)` bg, `1px solid #66C5C5`, `#004081` text, radius 10.

**User-profile cluster is sized literally off Figma, unlike the logo.** Confirmed against Exzy_WorkX's own "UserProfile" component (`851:2488`): name text `14px`/`#586782`, avatar `32×32` circle, chevron button `32×32` with `1px solid #D0D6DF` border + `4px` radius, `12px` gap between all three. This is fixed-scale app chrome (touch target + readability), not a brand mark — so it gets Figma's pixel values directly rather than a viewport-relative scale-down. (Was previously built at 22px across the board, which read too small against the rest of the header — fixed 2026-06-29.)

### 7.2 `Sidebar.tsx` — built, not mounted (see §1.1)

```
260px wide, bg #004081, full height
├─ Logo block (72px, border-bottom rgba(255,255,255,.08))
├─ "เมนู" section label (10px, rgba(255,255,255,.3), uppercase)
├─ Nav items (active: borderLeft 3px #66C5C5, bg rgba(102,197,197,.15))
└─ User footer (border-top rgba(255,255,255,.08)): avatar circle + name/email + role badge (pill — stray, see §5)
```

### 7.3 Content Widths

- Forms / detail page: `maxWidth: 760px`, centered
- List/table pages: full fluid width
- Modals: sm=420px / md=560px / lg=720px

---

## 8. Component Rules

### 8.1 Button — 4 variants only (`primary | secondary | danger | ghost`)

**There is no `success` variant.** An earlier doc described a 5th green-gradient variant; it does not exist in `Button.tsx`. Don't reintroduce it without an explicit ask.

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| `primary` (default) | `linear-gradient(135deg, #66C5C5 0%, #004081 100%)` | `#F8F9FA` | none |
| `secondary` | **solid `#FFFFFF`** | `#707070` | `1px solid #D0D6DF` |
| `danger` | **solid `#F3554F`** | `#FFFFFF` | none |
| `ghost` | transparent | `#586782` | `1px solid transparent` |

**`secondary` and `danger` are flat colors, not gradients.** Older docs (including `CLAUDE.md` at time of writing) describe `secondary` as a light teal/navy gradient and `danger` as a red gradient — that's wrong; verify against `Button.tsx` directly before styling to match a doc.

Sizes: `sm`=30px / `md`=38px (default) / `lg`=44px height, with matching padding/fontSize/icon-gap. All radius 4, `fontWeight: 400` (regular, not semibold — every WorkX button/field text style checked is Poppins Regular; this was `600` until 2026-06-29), `letter-spacing: 0.01em`, `white-space: nowrap`.

The form's main submit action has no icon and reads "ส่งคำขออนุมัติ" (not "ส่งขออนุมัติ") — both the icon-removal and the wording were explicit asks, applied to both `RequestFormStepper.tsx` and the equivalent button on `RequestDetailPage.tsx`.

Hover (applied via inline `onMouseEnter`/`onMouseLeave`, not CSS `:hover`):
- `primary`/`danger`: `filter: brightness(1.08)` + navy/red-tinted shadow + `translateY(-1px)`
- `secondary`: bg → `#D0D6DF`
- `ghost`: bg → `rgba(102,197,197,0.10)`, color → `#004081`

Loading state replaces the icon with a spinner and disables the button. A blur-on-mouseup handler clears the focus ring after a mouse click (so it doesn't visually stick through a React Router navigation), and a window-focus listener re-syncs hover styles after blocking calls like `window.print()`/`window.confirm()` that can cause the browser to miss the `mouseleave` event.

### 8.2 Card vs. Section — narrower roles since 2026-06-29

**`<Card>` is no longer the default way to divide a form/detail page into sections.** It was, until a de-carding pass: every plain info section (ข้อมูลคำขอ, ข้อมูลลูกค้า, สรุปยอดรวม, ประวัติสถานะ, etc.) used a bordered, gray-headed `<Card>`, which read as visually heavier/boxier than WorkX's own multi-field forms — confirmed by direct comparison against an assembled WorkX form (Exzy_WorkX "Edit My work", `1190:5406`), which divides sections with a bold title + one thin rule, no border, no background fill, no card at all.

| | `<Card>` | `<Section>` |
|---|---|---|
| Use for | An actual boxed surface where one is wanted (rare in this module now) | Dividing a page into named groups of fields — the default for form/detail-page sectioning |
| Visual | bg `#FFFFFF`, border `1px solid #D0D6DF`, radius 4, header bg `#F2F6F8` | No border, no bg — title `16px/500/#586782` (weight corrected 700→500, see §3.2) + `1px solid #D0D6DF` rule underneath, `10px` padding-bottom, `16px` margin-bottom |
| Hover | `translateY(-2px)` + `shadow-md` + teal border tint | none |

`Card.tsx` still exports `FieldDisplay`/`FieldGrid` (§3.2) — those are unaffected; only the outer boxing changed. `FieldGrid` uses CSS grid `auto-fit` with `minmax(190px or 240px, 1fr)` (190 if `cols>=3`, else 240) — collapses to 2 then 1 column as the container narrows, no manual breakpoints. `gap: 16px 28px`.

**Section gap is 32px, not the 20–24px it was under `<Card>`.** Without a border to mark "this section ended, a new one begins," the gap between sections has to carry more of that signal on its own.

**The whole section list sits inside ONE white panel** (`background: '#fff', border: '1px solid #D0D6DF', borderRadius: 4, padding: 32`) in both `RequestFormStepper.tsx` and `RequestDetailPage.tsx` — added 2026-06-29 after de-carding read as "incomplete," not intentionally airy. The first de-carding pass removed *all* containment, including the page's own background contrast; WorkX's own reference form ("Edit My work", `1190:5406`) is not borderless, it's a single continuous white surface with `<Section>`-style divisions *inside* it. This panel wraps the section list only — the page header/action row above it (request number, status badge, action buttons) stays outside, as page-level chrome.

**The quotation-block wrapper (`quotationBlock` in `RequestDetailPage.tsx`, `quotationCard`/`quotationHeader` in `RequestFormStepper.tsx`) has no stroked border**, but isn't bare either — its gradient header is top-rounded only (`borderRadius: '4px 4px 0 0'`) and sits directly above a body wrapper tinted `#F8F9FA` with bottom rounding (`'0 0 4px 4px'`). Header+body read as one unit through *fill*, not a stroke — fixed 2026-06-29 after the header-only version (no body tint) read as a floating colored chip with nothing tying it to its content. The `labeledBand`/`sectionComment` calls inside these blocks use `framed=true` (`#D0D6DF` rule, `14px` horizontal padding) again now that there's an enclosing tinted area to pad against — don't "fix" this back to `framed=false`, that was only correct for the brief window when the block had zero enclosure.

The form's footer action bar (checkbox + Save Draft/Submit buttons) similarly dropped its full box for a `borderTop: 1px solid #D0D6DF` + `paddingTop: 20`.

### 8.3 Form Fields — corrected against `909:1107` ("Web Text field") on 2026-06-29

All three field types now share the same radius and focus color — confirmed directly from Figma, not assumed:

| | `<Input>`/`<Textarea>`/`<Select>` |
|---|---|
| Height | 38px (Textarea: auto, `8px 12px` padding) |
| Radius | **8px**, all three (Input/Textarea were 4px until this fix — see §5) |
| Border resting | `1px solid #D0D6DF` |
| Focus | border **`#004081`** (navy) + outline `2px solid rgba(0,64,129,0.15)` — Input/Textarea were on a *different* (teal) focus color until this fix; Select's navy was already correct |
| Error | border `#F3554F` — **white background, no red tint** (the red-tinted `#FEF2F2` bg was removed; Figma's error field stays white) |
| Disabled | bg `#F2F6F8`, color `#929EB4` |

Label (`FormGroup`): `12px/600/#586782` (turns **`#FF3028`** on error — a distinct, brighter red from the field border's `#F3554F`). Required `*` is `#F3554F`/700/14px/`margin-left:3` **unconditionally** — it never switches to `#FF3028` even when the field is in error. Hint: `11px/#586782`. Error message text: `12px/#FF3028`.

**Checkbox** (`src/components/ui/Checkbox.tsx`, confirmed via `1052:450` "MultiCheckbox"): 18px square, radius 4, `1px solid #D0D6DF` resting border, white fill. Checked → navy (`#004081`) checkmark glyph, not a filled box. Disabled → bg `#D9D9D9`. Used everywhere a checkbox appears (Approve/Reject/Cancel modal confirmations, the form's final submit-confirmation checkbox) — modals keep their own `accentColor` (teal for approve, red for reject/cancel) as a deliberate semantic layer on top of the otherwise-identical box shape, not a deviation from the Figma spec.

### 8.4 Modal

- Backdrop: `rgba(15,23,42,0.50)`, no blur
- Box: `#FFFFFF`, radius 4, `shadow-lg`, sizes sm=420/md=560/lg=720 max-width
- Header: padding `16px 20px`, `borderBottom: 1px solid #D0D6DF`, title `16px/700/#586782`, close = `FiX` 18px
- Body: padding 20px, scrolls if tall
- Footer: padding `14px 20px`, `borderTop: 1px solid #D0D6DF`, buttons right-aligned, gap 10
- Body scroll-locked while open (`document.body.style.overflow`)

**Destructive-confirm pattern** (`ApproveModal`/`RejectModal`/`CancelModal` all follow this): an info box at the top restates the request number + customer name — navy-tinted (`#F2F6F8`/`#D0D6DF`) for Approve, red-tinted (`#FEF2F2`/`#FCA5A5`/`#7F1D1D` text) for Reject/Cancel — followed by a required checkbox (`accentColor` matches the action: teal for approve, red for reject/cancel) that gates the confirm button. `CancelModal` additionally requires a typed reason in a `<Textarea>`. `RejectModal` requires at least one section comment to already be filled in elsewhere on the page before it'll let you confirm. All three font-weight their info-box request number at **600** (a 700 in `ApproveModal` was a drift fixed 2026-06-2x — keep these three in sync if touching one).

### 8.5 Alert — see §2.7 for exact colors

`16px` icon, `4px` radius, `12px 14px` padding, `10px` gap. Title (if given) is `600` weight.

### 8.6 StatusBadge / StatusTimeline — see §2.5 / §2.6

### 8.7 Quotation block pattern (the module's signature composite component)

Implemented **twice**, independently, in `RequestFormStepper.tsx` (entry form) and `RequestDetailPage.tsx` (read view) — they are not shared code, so a fix to one does not propagate to the other. Check both when touching this pattern.

Structure (read-view, `quotationBlock` in `RequestDetailPage.tsx`), as of the 2026-06-29 de-carding + anchoring pass:
```
gradient header, top-rounded only, white text  ← Quotation No. + label
┌─ body: bg #F8F9FA, bottom-rounded only ─────────────┐
│ items table (header 12.5px/400/#004081, rows /F2F6F8)│
│ "รวม [label]" total strip (labeledBand, framed=true)  │
│ "Payment Schedule" strip + installment table          │
│ optional section-comment block                        │
└────────────────────────────────────────────────────────┘
```
No stroked border anywhere — header and body read as one unit through fill/rounding alone (see §8.2). `labeledBand`: thin top rule + `13px/400/#586782` label (see §3.2's general-bold-rule note — no exception applies here, it's a label like any other). `framed=true` (the current setting inside this body) → rule is `#D0D6DF`, `14px` horizontal padding; this is correct *because* there's an enclosing tinted area again — don't flip it to `framed=false` thinking it's unused now.

`sectionComment` (per-category reviewer note, e.g. "หมายเหตุสำหรับ Hardware") — **redesigned 2026-06-29, red no longer means "this is a comment field," it means "this request is currently rejected":**
- Editable (whoever holds decision authority right now): a plain `<Textarea>`, no extra colored wrapper. Used to be wrapped in its own red box, which — since the `<Textarea>` itself always renders white per `FormField.tsx` — read as a red box around a white box.
- Prior-round rejection quote (shown above the editable field when the live value is still blank): a left-border accent (`borderLeft: 2px solid #F3554F`, no fill), not a full box. Used to be its own red box, which stacked with the editable field's red box into two competing boxes on a resubmitted request.
- Read-only saved value: red (`#FEF2F2`/`#FCA5A5`/`#7F1D1D`) **only if `req.status === 'rejected'`**; otherwise neutral (`#F2F6F8`/`#D0D6DF`/`#586782`) — an approved request's note is a normal saved note, not a warning.
- **Hidden entirely** if empty and there's no prior-round rejection to show.
- Live/snapshot split unchanged: `customerComment`/`hardwareComment`/`swComment` (editable, current round) vs. `req.approvalResult.*Comment` (frozen snapshot of what a past decision said) — replaced an earlier single `decisionComment`/`suggestion` field design.

Form-side equivalents (`RequestFormStepper.tsx`):
- `priceTable`: entry rows for cost/selling price, column headers `12px/400/#586782` right-aligned, no row borders (rhythm via padding only)
- `comboDropdown` (customer search-select, reused for new/existing/reseller flows): radius 4, border `#D0D6DF`, navy-soft shadow, `max-height: 220` scrollable, row hover → `#F2F6F8` bg, `#F2F6F8` row separators
- `segBtn` (sale-type / customer-type / payment-condition selector cards): radius 4, border `1.5px` (`#66C5C5` active / `#D0D6DF` inactive); **active state intentionally keeps a teal-to-navy gradient background** (`linear-gradient(135deg,#EBF9F9 0%,#E8F2FC 100%)`, navy text, navy-tinted shadow `0 1px 5px rgba(0,64,129,0.2)`) rather than matching plain `Button` secondary — this was an explicit user choice ("คงไล่ฟ้าเดิม") to keep, not a leftover to "fix" toward Button's flat white.
- `RadioDot`: the ring is **always neutral gray** (`1px solid #D0D6DF`, white fill) in every state — only the inner 8px navy dot (`#004081`) appears when selected. The ring itself never changes color. Matches the W+ Library "RadioCheckbox" component (`909:1495`) exactly across its untick/tick/disable states.

### 8.8 Row action menu — `RequestListPage` table (added 2026-06-29)

Edit/Print used to be two separate ghost buttons in the table's last column. They're now consolidated into `KebabMenu` (`src/components/ui/KebabMenu.tsx`): a 32px icon-only trigger (`KebabIcon`, matches Exzy_WorkX `1317:2565`) opening a white dropdown (matches `934:7551`'s row structure — full-width rows, `16px/10px` padding, Poppins Regular 14px `#707070` — but navy-tinted shadow per §2.8, not the Figma export's literal black one). Click-outside-to-close via the same `mousedown`+ref pattern as `DatePicker`.

**Item order is deliberate, not alphabetical:** Edit → Print → Delete. Common/safe actions first; Delete is last, separated by a top rule, and colored `#F3554F` — reserved for genuinely destructive actions so it's never the first thing a thumb lands on. Items are built via conditional `.push()` onto a typed array, not a `.filter()`/type-predicate — an earlier filter-based attempt failed to typecheck because TS couldn't narrow a mixed array of `false` and object literals against a `KebabMenuItem` union; explicit push calls sidestep that entirely.

**Delete is real, not a UI stub**, and only ever appears for a draft the current sales user owns:
- `canDeleteRequest` (`permissions.ts`) — deliberately narrower than `canCancelRequest`: cancelling a pending request preserves an audit trail (it's a decision on a real submission); a draft has never been submitted and has no history worth keeping, so it can be hard-deleted outright instead of soft-cancelled.
- `deleteRequest` (`creditTermService.ts`) → `deleteMockRequest` (`mockRequests.ts`) — the only mutation in the service layer that doesn't append a history entry; the row just disappears.
- `DeleteRequestModal` (`src/components/modals/DeleteRequestModal.tsx`) — follows the destructive-confirm visual pattern (§8.4) but **omits the required checkbox** the other three modals use, since it only ever targets a low-stakes draft with nothing to lose beyond itself.

**Rejected rows get a standalone button, not a kebab item.** A rejected request's "edit" is really "resubmit" — same form, different context — so it's surfaced as its own bordered `<Button variant="secondary">` (icon `RefreshIcon`, label "ส่งใหม่") sitting directly in the row, to the left of the kebab. The kebab on a rejected row drops "Edit" (it's now the standalone button) but keeps "Print". This is why the action column widened `10% → 16%` (taken from "ลูกค้า" 22%→18% and "อัปเดต" 13%→11%, the two columns with the most slack) — it now has to fit a labeled button plus the kebab side by side, not just one icon button.

**Banner CTA buttons use `secondary`, not `ghost`.** The rejected/pending attention-banner's "ดูคำขอที่ถูกปฏิเสธ"/"ดูคำขอที่รอพิจารณา" buttons sit on a tinted banner background; `ghost`'s transparent fill + invisible border reads as plain text there, not a button. Fixed by switching both to `secondary` (solid white + visible border), which is `ghost`'s general failure mode anywhere the surrounding background isn't plain white — check for the same mistake before reusing `ghost` on any other colored surface.

---

## 9. Icon System — corrected, replaces all prior versions of this section

Two sources. **Neither `lucide-react` nor `react-icons/fa6` exists anywhere in `src/` anymore** — both were migrated away from (fa6 → fi, then several fi icons → literal Figma exports). If you see either referenced in an older doc, it's stale.

1. **`src/components/icons/FigmaIcons.tsx`** — literal SVG paths exported directly from Figma's icon grid (`60RgjevWzbKhCCjoc5kcmk`, node `937:914`) for icons with a confirmed exact Figma source:

   | Component | Figma source | Note |
   |---|---|---|
   | `ChevronIcon` | — | direction prop: right/down/left/up |
   | `SearchIcon` | — | |
   | `KebabIcon` | — | vertical 3-dot |
   | `SortIcon` / `SortCarets` | — | table column sort carets |
   | `XMarkIcon` | `icon_X` (917:377) | bare crossed bars, **not** a circled X — used for `rejected` |
   | `HourglassIcon` | `hourglass-split` (909:953) | `pending` |
   | `CheckCircleIcon` | `check-circle-fill` (909:1364) | `approved` — colored teal, not green |
   | `AddCircleIcon` | `icon_Add` (937:1058) | a disc with the plus **literally cut out** (evenodd fill, white). Dropped onto a gradient/colored button, the cutout shows the button's own background through the plus — "white ring, gradient plus" is a stacking effect, not separate layers |
   | `PrinterIcon` | `icon_printer` (917:404) | |
   | `EditIcon` | `icon_Edit` (937:1064) | pencil |
   | `TrashIcon` | `icon_delete_bin` (909:1413) | kebab-menu "ลบคำขอ" item + `DeleteRequestModal` confirm button |
   | `RefreshIcon` | `icon_refresh` (937:1108) | distinct path from any chevron-style refresh; used for `revised` status + resubmit actions |
   | `MailSendIcon` | `icon_Mail_send` (937:1093) | 3-layer composite (envelope + badge circle + mirrored arrow), reconstructed at the source's original relative offsets — not simplified to one path |

2. **`react-icons/fi`** (Feather, pure outline) — for everything without a literal Figma export yet: `FiSave`, `FiX`, `FiSlash`, `FiCheckCircle`, `FiXCircle`, `FiCheck`, `FiClock`, `FiFileText`, `FiGrid`, `FiClipboard`, `FiPlus` (Sidebar nav only — see note below), `FiAlertTriangle`, `FiInfo`.

**`Sidebar.tsx`'s `FiPlus` was deliberately left as Feather, not swapped to `AddCircleIcon`.** It's a plain nav-list icon sitting next to other plain Feather icons (`FiGrid`, `FiClipboard`) — a different usage context from `AddCircleIcon`, which is specifically the primary-action-button icon. Swapping just that one icon would introduce a new inconsistency within that same nav list, not fix one.

Icon sizes by context: Button inline 15px · form/nav 16px · Modal close 18px · StatusBadge icon 13–14px · StatusTimeline dot icon 15px · table row action 15px.

---

## 10. Accessibility

- Every input has a `<label>` via `<FormGroup>`
- Icon-only buttons carry `aria-label`
- Color is never the sole status indicator — every `StatusBadge` pairs its color with text
- Focus ring: `2px solid rgba(102,197,197,0.7); outline-offset: 2px` (global `:focus-visible`); `<Select>` additionally gets its own navy focus override per §8.3
- Modal body-scroll-locks while open

---

## 11. Known Dead Code (not design-system facts, but relevant when auditing the design system)

These files are **not imported anywhere live** and should not be treated as representing current design decisions, even though they still exist in the repo and still contain stale patterns (green colors, `JetBrains Mono`, old radii):

- `RequestInformationStep.tsx`
- `CustomerInformationStep.tsx`
- `QuotationInformationStep.tsx`
- `PaymentCreditTermStep.tsx`
- `StickyRequestSummary.tsx`

`RequestFormStepper.tsx` is the one real, live form implementation (used by both `CreateRequestPage` and `EditRequestPage`). If a fix needs to land in "the form," it goes there — not in any of the five files above.

`exportService.ts`'s `printRequest()` function and the `/print/:id` route it opens are **also dead** — no such route is registered in `src/app/router.tsx`, and `printRequest` is never called from anywhere. `exportPDF()` (popup window + `window.print()`) is the only real print/export pathway.

---

## 12. Print / Export

Two genuinely separate stylesheets, neither aware of the other:

- **`src/styles/print.css`** — targets the live SPA's own DOM via `@media print`. Hides `.no-print`, `header`, `nav`, `.role-switcher`. Also references `.sidebar`/`.topbar` classes, but **neither className is actually applied anywhere in the current live markup** (`AppShell` doesn't set `class="topbar"`; `Sidebar` isn't mounted) — those two selectors are currently inert. Page: A4, `margin: 0`. Table borders become visible (`1px solid #D0D6DF`) for print only.
- **`exportService.ts`'s `buildPrintHTML()`** — a fully separate, hand-written HTML string with its own embedded `<style>` block, used by the actual "Print / PDF" button (`exportPDF()`). **This does not inherit anything from the live React screens or from `print.css`** — it's a parallel, manually-maintained copy of the design system that silently drifts every time the live screens change, because nothing about a live-screen fix touches this file. Corrected 2026-06-29 after it was found still on `'Segoe UI', Arial` (not Poppins), 700-weight section titles with a heavy `1.5px solid #004081` underline (not `Section.tsx`'s thin `#D0D6DF` rule), and 600-weight field labels (not `FormGroup`'s `400`) — i.e. it had fallen behind every typography/color fix made this engagement. **Deliberately kept different from the live screens:** the `.quote-group` wrapper and table cells keep visible `1px solid #D0D6DF` borders — an intentional print-specific exception, matching `print.css`'s own existing convention of relying on borders rather than the live UI's subtle background-tint fills (printed/grayscale output can't lean on subtle color the way screen UI can).

**Whenever a typography/color fix lands in `Section.tsx`, `Card.tsx`, `FormField.tsx`, or a live table-header/`labeledBand` convention, check whether `exportService.ts` needs the same fix — it will not pick it up automatically.**

---

## 13. Do / Don't

### ✅ DO
- Use the shared primitives: `<Button>`, `<Card>`, `<FormGroup>`/`<Input>`/`<Select>`/`<Textarea>`, `<Modal>`, `<StatusBadge>`, `<Alert>`
- 4px radius everywhere except form fields (`<Input>`/`<Select>`/`<Textarea>`, all 8px), the module-switcher nav tabs (10px), and the checkbox (4px — same as everything else, just calling it out since it's easy to assume 8px by association with fields)
- Navy-tinted shadows only
- `fontVariantNumeric: 'tabular-nums'` for numbers/currency — no mono font
- `line-height: 1.75` for Thai text blocks
- Check both `RequestFormStepper.tsx` and `RequestDetailPage.tsx` when touching the quotation-block/table pattern — it's duplicated, not shared

### ❌ DON'T
- Use `rgba(0,0,0,x)` shadows
- Reintroduce a `success` Button variant, or gradient `secondary`/`danger` buttons — verify `Button.tsx` directly, don't trust a doc's claim about variant colors
- Give `<Input>`/`<Textarea>` a 4px or 6px radius — all three field types (`Input`/`Textarea`/`Select`) are 8px, confirmed against Figma's "Web Text field" component
- Give `StatusBadge` a per-status text color — the label is always `#505050`
- Use pill radius (`9999`) on anything newly built — it survives only in two known, scoped exceptions (`RoleSwitcher`, dev-only; `Sidebar`'s role badge, unmounted)
- Treat `lucide-react` or `react-icons/fa6` as current — both are fully migrated away from
- Assume a sidebar is visible in this app today — `AppShell.tsx` has none; `Sidebar.tsx` is unmounted

---

## 14. Open Items — not yet resolved

1. **Table column-filter affordance** — does the WorkX host show inline column filters in its table header rows that this module's tables currently lack? Header/body padding parity itself is resolved (§6); this specific question about filter UI is not.
2. **Metropolis brand colors** — a secondary palette referenced in the W+ Library Figma file; exact hex values were never pinned down, and nothing in `src/` currently references them. Likely irrelevant unless a future Figma component pulls one in.
3. **Mobile responsiveness** — the app is desktop-only today. The only responsive behavior anywhere is `FieldGrid`'s `auto-fit` column collapse; nothing else adapts below desktop width.
4. **`Sidebar.tsx`'s stray pill radius + `ROLE_COLORS.accounting` reusing `#82C566`** — low priority since the component is unmounted, but worth a pass before this module is ever embedded in the real host shell (see §1.1).
5. **Dead-code cleanup** (§11) — five unused files still sit in the repo with stale patterns. Safe to delete; not yet done, pending an explicit ask.
6. **Table column-filter affordance** (carried over from above) is still the only unresolved piece of the table audit.

**Resolved 2026-06-29, same day they were raised:** the card/border-heavy layout question (§8.2 — de-carded to `<Section>`) and the list-page filtering UX question (banner reworded + unified with an active-filter strip, date filter added via `<DatePicker>` — see §8.5 below). Not open items anymore; don't re-raise them as if undecided.

### 8.5 DatePicker

`src/components/ui/DatePicker.tsx` — calendar popover supporting both a single day and a date **range** (two clicks: start, then end — auto-swaps if end is picked before start), used by `RequestListPage`'s "Date" filter (filters on `updatedAt`, which already covers "last edited" and falls back to "created" automatically since a never-edited request has `updatedAt === createdAt`; URL params are `dateFrom`/`dateTo`). Structure matches WorkX's own calendar (Exzy_WorkX `72:5368`: prev/next month header, weekday row, day grid, range start/end as a navy pill with a soft in-between fill, Cancel/Done footer) but recolored to this app's actual brand tokens (Poppins, navy `#004081` start/end, teal `#66C5C5` today ring, `rgba(0,64,129,0.08)` in-between fill) rather than the literal library-default neutrals (`#14181F`, `#DCE0E5`, Inter font, `#E0EDFF` range fill) that component's own Figma export uses — those don't appear anywhere else in WorkX's real rendered UI, strongly suggesting that specific component is an unskinned base-library widget, not WorkX's actual brand. A single day is just a range where `dateFrom === dateTo`; the Cancel/Done footer was added back (an earlier single-day-only version skipped it) since range selection genuinely benefits from an explicit confirm step.

**Active-filter strip is chips, not a sentence.** Each active filter (status, date, search) renders as its own small removable tag rather than a `"กำลังกรอง: ..."` string — the sentence-style version read as stiff/system-y rather than friendly once shipped. A "ล้างทั้งหมด" link only appears once 2+ filters are stacked; a single chip's own `×` is enough on its own. This replaced the original `anyFilterActive` strip's text rendering; the mutual-exclusivity logic with the attention banner (§ below) is unchanged.

**Chip spec matches the W+ Library "Tag/Small" component exactly** (`60RgjevWzbKhCCjoc5kcmk`, node `1049:411`, "Edit" state) — not an invented size. An earlier ~20px-tall version was reported as too small to spot: 24px tall, bg `#D9F0F0` (teal/100 — not a navy-tinted neutral), text 12px Poppins Regular `#004081`, dismiss icon `#586782` in a 20px tap target, padding `8px` left / `4px` right, radius 4, gap 4.

---

*DESIGN.md · WorkX / W+ Design System · rebuilt from verified code + Figma, 2026-06-29*
