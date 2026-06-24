# DESIGN.md — W+ Design System · payment&creditTerm Module

> **Primary source of truth:** Figma file `60RgjevWzbKhCCjoc5kcmk` (W+ Library)  
> **Analysed:** Figma pages — Website, Button, Field (182 styles via Styles API)  
> **Last updated:** 2026-06-23

This document is the authoritative design reference for all developers and AI tools working on this module. Follow every rule here exactly. Do not guess or deviate unless a rule is explicitly marked as unclear.

---

## 1. Design System Overview

W+ (WorkPlus / Exzy platform) is a **B2B internal enterprise platform** with a **Professional-Clean** design language. The visual system prioritises:

- **Trust and clarity** over decorative embellishment
- **Semantic colour usage** — every colour carries a role, not just a hex value
- **Bilingual readability** — English (Poppins) and Thai (Noto Sans Thai) coexist in one font stack
- **Consistent component language** — squared 4px buttons/cards (EXZY CI v3, commit `98d50f4`), navy topbar accent, teal interaction signal

The `payment & credit term` module is an **embedded sub-section** of this platform and must look indistinguishable from the rest of the W+ product.

---

## 2. Colour System

### 2.1 Brand Palette (EXZY CI)

These are the only brand colours. Do not invent new brand colours.

| Token (CSS var) | Hex | Role |
|-----------------|-----|------|
| `--color-navy` | `#004081` | Sidebar background, primary heading, info state |
| `--color-navy-dark` | `#002D5C` | Navy hover state |
| `--color-teal` | `#66C5C5` | Accent, focus ring, active indicator, topbar stripe |
| `--color-teal-dark` | `#4AADAD` | Teal hover state |
| `--gradient-primary` | `linear-gradient(135deg, #66C5C5 0%, #004081 100%)` | Primary button, quotation headers |

### 2.2 Neutral / Surface Palette

| Token | Hex | Role |
|-------|-----|------|
| `--color-bg` | `#F8F9FA` | Page background |
| `--color-surface` | `#FFFFFF` | Card body, input background, modal body |
| `--color-surface-2` | `#F2F6F8` | Card header, table header, read-only input, divider panels |
| `--color-border` | `#D0D6DF` | Default border on all elements |

### 2.3 Text Hierarchy

| Token | Hex | Role |
|-------|-----|------|
| `--color-ink` | `#001122` | Primary heading text |
| `--color-body` | `#505050` | Body text, form values |
| `--color-secondary` | `#586782` | Labels, secondary text, read-only values, card subheadings |
| `--color-muted` | `#929EB4` | Placeholders, timestamps, hints, disabled text |

### 2.4 Semantic Status Colours

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#82C566` | Success icon accent, completion indicator |
| `--color-warning` | `#FFCC00` | Warning (use `#92400E` for text on light bg — see badges) |
| `--color-danger` | `#F3554F` | Error, rejected, destructive action |
| `--color-info` | `#004081` | Info state (same as navy) |

### 2.5 Status Badge Colours (exact values — do not approximate)

**Plain icon + colored label (2026-06-24) — no background, no border, no pill.** Squared off in favor of the WorkX host app's convention, where terminal statuses render as a colored Lucide icon + text with no badge container. Replaces the earlier bg/border/text three-column badge.

| Status | Text/icon colour | Icon |
|--------|------------------|------|
| `draft` | `#4A5568` | `FileText` |
| `pending` | `#92400E` | `Hourglass` |
| `approved` | `#14532D` | `CheckCircle` |
| `rejected` | `#7F1D1D` | `XCircle` |
| `revised` | `#1E40AF` | `RefreshCw` |
| `cancelled` | `#6B7280` | `Ban` |

> `#1E40AF` and similar blues are **status-specific** badge colours. Do not use them as general UI blue.

### 2.6 Approval Workflow Accent Colours

Used in status timeline and result panels only:

| Event | Accent colour | Rationale |
|-------|---------------|-----------|
| `approved` | `#82C566` | `--color-success` |
| `rejected` | `#F3554F` | `--color-danger` |
| `cancelled` | `#929EB4` | `--color-muted` |
| `submitted` / `resubmitted` | `#004081` | `--color-navy` (info) |
| `edited` | `#92400E` | warning text (pending badge text) |
| `created` / `draft_saved` | `#586782` | `--color-secondary` |

### 2.7 Shadow System (navy-tinted ONLY)

**Never use `rgba(0,0,0,x)` shadows anywhere in this project.**

```css
--shadow-sm:    0 1px 2px rgba(0,64,129,0.04);
--shadow-md:    0 4px 14px rgba(0,64,129,0.07);
--shadow-lg:    0 16px 34px rgba(0,64,129,0.10), 0 2px 6px rgba(0,64,129,0.06);
```

### 2.8 Colours NOT in the W+ Design System — Replace Immediately

| Incorrect hex | Correct replacement |
|---------------|--------------------|
| `#A0AEC0` | `#929EB4` (`--color-muted`) |
| `#E2E8F0` | `#D0D6DF` (`--color-border`) |
| `#1A202C` | `#001122` (`--color-ink`) |
| `#4A5568` | `#586782` (`--color-secondary`) |
| `#F5F7FA` | `#F8F9FA` (`--color-bg`) |
| `#1E3A5F` | `#004081` (`--color-navy`) |
| `#2563EB` (general UI) | `#004081` for info/nav; status colour in badge context only |
| `#D97706` | `#92400E` (warning text) |
| `#9CA3AF` | `#929EB4` (`--color-muted`) |
| `#16A34A` | `#82C566` (`--color-success`) |
| `#DC2626` | `#F3554F` (`--color-danger`) |
| `#EBF4FF` | `rgba(0,64,129,0.08)` (navy-tinted light bg) |
| `#505060` (typo) | `#505050` (`--color-body`) |
| `#991B1B` | `#7F1D1D` (rejected badge text) |
| `#FF8A80` (danger btn start) | `#F3554F` (`--color-danger`) |

---

## 3. Typography

### 3.1 Font Stack

```css
--font-sans: 'Poppins', 'Noto Sans Thai', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Noto Sans Thai', monospace;
```

**Critical rule:** Poppins MUST come first. Poppins has no Thai glyphs, so Thai characters automatically cascade to Noto Sans Thai. Reversing the order breaks mixed-language text. Noto Sans Thai in the mono stack covers the ฿ symbol JetBrains Mono lacks.

### 3.2 Type Scale

| Role | Size | Weight | Colour | Notes |
|------|------|--------|--------|-------|
| Page title | 22px | 700 | `#001122` | `<h1>` in page headers — `RequestListPage` overrides to **28px** inline to match the WorkX host page it sits beside in the nav; other pages keep 22px |
| Card header | 14px | 700 | `#001122` | `letter-spacing: -0.01em` |
| Section label | 11px | 700 | `#586782` | UPPERCASE, `letter-spacing: 0.06em` |
| Body text | 14px | 400 | `#505050` | `line-height: 1.65` |
| Form label | 12px | 600 | `#586782` | above each field |
| Table header | 11px | 700 | `#586782` | UPPERCASE, `letter-spacing: 0.05em` — `RequestListPage` overrides to **12.5px / `#004081` / normal case, no letter-spacing** to match the WorkX host table header style; other tables (e.g. detail-page item/installment tables) keep the grey-uppercase default |
| Hint / muted | 11–12px | 400 | `#929EB4` | timestamps, placeholders |
| Topbar title | 18px | 600 | `#001122` | `letter-spacing: -0.01em` |
| Mono reference | — | 700 | `#004081` (selling) / `#929EB4` (cost) | `font-family: --font-mono` |

### 3.3 Thai Text

Any element containing Thai text needs extra line height:
```css
line-height: 1.75;
```
Use `:lang(th)` or `.thai` class (defined in `globals.css`).

---

## 4. Spacing Scale (4pt base grid)

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | Icon gap, micro gaps |
| `--space-2` | 8px | Button icon gap, badge padding |
| `--space-3` | 12px | Table cell padding, dropdown item |
| `--space-4` | 16px | Form field gap, nav item padding |
| `--space-5` | 20px | Card body padding |
| `--space-6` | 24px | Card-to-card gap, section gap |
| `--space-8` | 32px | Page-level padding |
| `--space-10` | 40px | Large section gap |

Page layout: `padding: 28px 32px` on `<main>`.

---

## 5. Border Radius Scale

**EXZY CI v3 (commit `98d50f4`, 2026-06-23): the whole app was squared off.** Pill buttons and 14px/16px/22px card radii were retired in favor of one universal 4px radius. Do not reintroduce pill or large radii without an explicit ask.

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 6px | Inputs, dropdown items |
| `--radius-md` | 4px | Cards, modals, buttons, alerts, notice boxes, stat cards — everything except inputs |

Badges were already 4px before this change and are unaffected.

**Rule: All buttons are squared.** `borderRadius: 4` is mandatory.

---

## 6. Border / Stroke Rules

- Default: `1px solid #D0D6DF`
- Active/focus: `1.5px solid #66C5C5`
- Error: `1px solid #F3554F`
- Card header bottom: `1px solid #D0D6DF`
- Table row: `1px solid #D0D6DF`
- Divider: `height: 1px; background: #D0D6DF; border: none`
- Soft divider (inside panels): `borderBottom: 1px solid #F2F6F8`
- Topbar: `borderBottom: 1px solid #D0D6DF`
- Sidebar internal: `rgba(255,255,255,0.08)` (on navy bg)

---

## 7. Layout

### Shell

```
Sidebar: 260px wide, bg #004081, sticky
Topbar: 60px, bg #FFFFFF, borderBottom #D0D6DF
  boxShadow: 0 1px 2px rgba(0,64,129,0.04), inset 0 3px 0 0 #66C5C5
Main: bg #F8F9FA, padding 28px 32px
```

### Content Widths

- Forms: `maxWidth: 760px` centred
- List/table: full fluid width
- Modals: sm=420px / md=560px / lg=720px

---

## 8. Component Rules

### Button

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| `primary` | `linear-gradient(135deg, #66C5C5 0%, #004081 100%)` | `#F8F9FA` | none |
| `secondary` | `linear-gradient(135deg, #EBF9F9 0%, #E8F2FC 100%)` | `#004081` | `1.5px solid #66C5C5` |
| `danger` | `linear-gradient(135deg, #F3554F 0%, #C0392B 100%)` | `#FFFFFF` | none |
| `ghost` | transparent | `#586782` | `1px solid transparent` |
| `success` | `linear-gradient(135deg, #A8DD8C 0%, #4F9A3A 100%)` | `#FFFFFF` | none |

Sizes: sm=30px / md=38px / lg=44px. Always squared (`borderRadius: 4`).

### Card

- bg `#FFFFFF`, border `1px solid #D0D6DF`, radius `4px`
- Header: bg `#F2F6F8`, padding `14px 20px`, text `14px/700/#001122`
- Body padding: `20px`
- Hover: `translateY(-2px)` + `shadow-md` + border `rgba(102,197,197,0.5)`

### Form Fields

- Input height: `38px`, radius `6px`, border `1px solid #D0D6DF`
- Focus: `borderColor #66C5C5`, outline `2px solid rgba(102,197,197,0.6)`
- Error: `borderColor #F3554F`, bg `#FEF2F2`
- Disabled: bg `#F2F6F8`, color `#929EB4`
- Label: `12px/600/#586782`; required `*` in `#F3554F`

### Table

- Header: bg `#F2F6F8`, `11px/700/#586782/UPPERCASE` (default); `RequestListPage` overrides header text to `12.5px/700/#004081`, normal case, to match the WorkX host table
- Row separator: `1px solid #D0D6DF`
- Count footer: bg `#F2F6F8`, `12px/#929EB4`

### Status Badge

Always `<StatusBadge status="..." />`. Never build inline badge spans.

**Plain icon + colored label, no background/border/pill (2026-06-24).** `13px/700` (`12px` for `size="sm"`), icon `14px`/`13px`, `gap: 5px`, no uppercase. Colours/icons per status in §2.5.

### Status Timeline

- Action colours per §2.6
- Version badge: bg `rgba(0,64,129,0.08)`, color `#004081`

---

## 9. Icon Usage

Library: `lucide-react` (stroke, not filled).

| Context | Size |
|---------|------|
| Button inline | 14–15px |
| Form / input | 16px |
| Modal close | 18px |
| Stat card | 18–20px |
| Timeline | 14px |

---

## 10. Accessibility

- All inputs have `<label>` via `<FormGroup>`
- Icon-only buttons have `aria-label`
- Colour never sole status indicator
- Focus ring: `2px solid rgba(102,197,197,0.7); outline-offset: 2px`
- Modal: scroll-lock while open

---

## 11. Print

`src/styles/print.css`:
- Hide: `.no-print`, `header`, `nav`
- Page: A4, `margin: 0`
- Section title border: `#004081`
- Table borders visible

---

## 12. Do / Don't

### ✅ DO

- Use shared components: `<Button>`, `<Card>`, `<FormGroup>`, `<Input>`, `<Modal>`, `<StatusBadge>`, `<Alert>`
- 4px radius on all buttons, cards, modals, alerts (EXZY CI v3)
- 6px radius on inputs and dropdown items only
- Navy-tinted shadows only
- `JetBrains Mono` for numbers and reference codes
- `line-height: 1.75` for Thai text blocks

### ❌ DON'T

- Use `rgba(0,0,0,x)` shadows
- Use off-brand colours from §2.8
- Use pill buttons or radii above 6px anywhere (retired in commit `98d50f4`)
- Use raw `<button>`/`<input>` without component wrappers
- Use gradients outside the approved set
- Use `#2563EB` blue for general non-status UI

---

## 13. CSS Variables Reference

All defined in `src/styles/globals.css` under `@theme {}`:

```css
--color-navy: #004081;     --color-navy-dark: #002D5C;
--color-teal: #66C5C5;     --color-teal-dark: #4AADAD;
--gradient-primary: linear-gradient(135deg, #66C5C5 0%, #004081 100%);
--color-bg: #F8F9FA;       --color-surface: #FFFFFF;
--color-surface-2: #F2F6F8;  --color-border: #D0D6DF;
--color-ink: #001122;      --color-body: #505050;
--color-secondary: #586782;  --color-muted: #929EB4;
--color-success: #82C566;  --color-warning: #FFCC00;
--color-danger: #F3554F;   --color-info: #004081;
--shadow-sm: 0 1px 2px rgba(0,64,129,0.04);
--shadow-md: 0 4px 14px rgba(0,64,129,0.07);
--shadow-lg: 0 16px 34px rgba(0,64,129,0.10), 0 2px 6px rgba(0,64,129,0.06);
--font-sans: 'Poppins', 'Noto Sans Thai', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Noto Sans Thai', monospace;
--radius-sm: 6px;  --radius-md: 4px;  --radius-lg: 4px;  --radius-pill: 9999px; /* defined, unused */
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
--space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-10: 40px;
```

---

## 14. Unclear / Needs Manual Verification

1. **Icon page** (`937:913`) — not fully retrieved. Confirm all icons covered by Lucide React.
2. **Metropolis brand colours** — secondary palette in Figma; hex values unknown.
3. **Mobile responsive rules** — Figma has mobile field variant (72px vs 60px desktop). App is currently desktop-only.
4. **Topbar height** — Figma Navbar = 80px; current code = 60px. Confirm for embedded context.
5. ~~Stat card radius~~ — **Resolved 2026-06-23 (commit `98d50f4`):** the team deliberately deviated from the Figma spec and squared every radius to 4px app-wide (buttons, cards, modals, alerts, stat cards), retiring pill buttons and the 14px/22px card/stat-card radii. This is an intentional, permanent divergence from the original Figma file, not an open question — don't "fix" components back toward Figma's rounder spec.
6. **Stepper component** — Figma shows a step-form indicator. Current form is a single-page scroll, not a wizard.

---

*DESIGN.md · W+ Design System · EXZY CI v3 · 2026-06-24*
