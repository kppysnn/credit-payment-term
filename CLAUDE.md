# CLAUDE.md — payment&creditTerm Design System Integration Guide

> **Project:** Credit & Payment Term Approval Module (embedded in W+ / Exzy platform)  
> **Figma source:** File `60RgjevWzbKhCCjoc5kcmk` (W+ Library) — 182 styles analyzed 2026-06-23  
> **Stack:** React 19 + TypeScript 6 · Vite 8 · Tailwind CSS v4 · React Router DOM v7

---

## 1. Tech Stack & Build

| Layer | Library / Tool | Version |
|-------|---------------|---------|
| UI framework | React | ^19 |
| Language | TypeScript | ~6 |
| Build / dev server | Vite + `@vitejs/plugin-react` | ^8 |
| CSS engine | Tailwind CSS v4 via `@tailwindcss/vite` | ^4.3 |
| Routing | React Router DOM | ^7 |
| Forms | React Hook Form + Zod | ^7 / ^4 |
| Icons | Lucide React | ^1.18 |
| Deployment | Vercel | — |

**Build commands:**
```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run preview  # serve dist/
```

---

## 2. Project Structure

```
src/
├── app/
│   ├── router.tsx          # createBrowserRouter — routes + AppShell wrapper
│   └── UserContext.tsx     # Current user + role context
├── assets/                 # Static images (hero.png, SVGs)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx    # Sticky topbar + <Outlet /> — main shell
│   │   ├── Sidebar.tsx     # Navy sidebar (defined but mounted separately)
│   │   └── RoleSwitcher.tsx# Dev-only role switcher (no-print)
│   ├── modals/
│   │   ├── ApproveModal.tsx
│   │   └── RejectModal.tsx
│   └── ui/                 # ← Shared UI primitives (always use these)
│       ├── Alert.tsx
│       ├── BackButton.tsx
│       ├── Button.tsx
│       ├── Card.tsx        # also exports FieldDisplay, FieldGrid
│       ├── FormField.tsx   # exports FormGroup, Input, Select, Textarea
│       ├── Modal.tsx
│       ├── StatusBadge.tsx
│       └── StatusTimeline.tsx
├── features/
│   └── credit-payment-term/
│       ├── components/     # Form steps (RequestFormStepper, step sub-components)
│       ├── data/           # Mock data (mockCustomers, mockRequests, mockUsers)
│       ├── pages/          # CreateRequestPage, EditRequestPage, RequestDetailPage, RequestListPage
│       ├── services/       # creditTermService, customerService, exportService
│       ├── types/          # TypeScript types: approval, customer, request, user
│       └── utils/          # calculations, formatters, permissions, status, validation
├── styles/
│   ├── globals.css         # ← Master token definitions + global CSS utilities
│   └── print.css           # @media print rules
├── App.css                 # Vite template CSS (ignore for app UI)
├── index.css               # Vite template CSS (ignore for app UI)
└── main.tsx
```

**Route tree** (`src/app/router.tsx`):
```
/ → AppShell
  /requests             → RequestListPage
  /requests/new         → CreateRequestPage
  /requests/:id         → RequestDetailPage
  /requests/:id/edit    → EditRequestPage
```

---

## 3. Design Tokens

### 3.1 Token Definitions

All tokens live in **`src/styles/globals.css`** inside a Tailwind v4 `@theme {}` block, which also registers them as CSS custom properties on `:root`.

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* Brand — EXZY CI */
  --color-navy:         #004081;   /* sidebar, primary button, headings */
  --color-navy-dark:    #002D5C;   /* navy hover state */
  --color-teal:         #66C5C5;   /* accent, focus ring, active indicator */
  --color-teal-dark:    #4AADAD;   /* teal hover state */

  /* Primary gradient — used on button/primary, card quotation headers, topbar accent */
  --gradient-primary: linear-gradient(135deg, #66C5C5 0%, #004081 100%);

  /* Neutral surfaces */
  --color-bg:           #F8F9FA;   /* page background */
  --color-surface:      #FFFFFF;   /* card, input, modal body */
  --color-surface-2:    #F2F6F8;   /* card header, table header, read-only input */
  --color-border:       #D0D6DF;   /* default border / divider */

  /* Text scale */
  --color-ink:          #001122;   /* text/title — primary headings */
  --color-body:         #505050;   /* text/describe — body text */
  --color-secondary:    #586782;   /* text/remark, labels, secondary nav text */
  --color-muted:        #929EB4;   /* text/placeholder, timestamp, hint */

  /* Semantic status */
  --color-success:      #82C566;
  --color-warning:      #FFCC00;
  --color-danger:       #F3554F;
  --color-info:         #004081;   /* info = navy */

  /* Shadows — ALWAYS navy-tinted, NEVER rgba(0,0,0,x) */
  --shadow-sm:    0 1px 2px rgba(0,64,129,0.04);
  --shadow-md:    0 4px 14px rgba(0,64,129,0.07);
  --shadow-lg:    0 16px 34px rgba(0,64,129,0.10), 0 2px 6px rgba(0,64,129,0.06);

  /* Fonts */
  --font-sans: 'Poppins', 'Noto Sans Thai', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Noto Sans Thai', monospace;

  /* Border radius — squared off app-wide as of commit 98d50f4 (2026-06-23).
     4px is now the universal radius: buttons, cards, modals, alerts, notice
     boxes, stat cards. Inputs/dropdown items stay at 6px. Badges stay at 4px
     (unchanged — they were already square). Pill (9999px) is no longer used
     anywhere in this codebase; do not reintroduce it without an explicit ask. */
  --radius-sm:   6px;     /* input, dropdown item */
  --radius-md:   4px;     /* card, modal, button, alert, notice box, stat card */

  /* Spacing — 4pt base */
  --space-1:  4px;   --space-2:  8px;   --space-3:  12px;
  --space-4:  16px;  --space-5:  20px;  --space-6:  24px;
  --space-8:  32px;  --space-10: 40px;  --space-12: 48px;  --space-16: 64px;
}
```

### 3.2 Hardcoded vs Token Usage

**Important pattern:** Components currently use **hardcoded hex values** in inline styles, not CSS variable references. When implementing Figma designs, use the same hardcoded values shown below — do NOT switch to `var(--color-*)` unless refactoring the whole component.

| Value | Semantic role | CSS token |
|-------|--------------|-----------|
| `#004081` | Navy / primary | `--color-navy` |
| `#66C5C5` | Teal / accent | `--color-teal` |
| `#001122` | Ink / heading | `--color-ink` |
| `#505050` | Body text | `--color-body` |
| `#586782` | Secondary text, labels | `--color-secondary` |
| `#929EB4` | Muted / placeholder | `--color-muted` |
| `#D0D6DF` | Border default | `--color-border` |
| `#F2F6F8` | Surface-2 / card header bg | `--color-surface-2` |
| `#F8F9FA` | Page bg | `--color-bg` |
| `#FFFFFF` | Card / input bg | `--color-surface` |
| `#F3554F` | Danger / error | `--color-danger` |
| `#82C566` | Success | `--color-success` |
| `#FFCC00` | Warning | `--color-warning` |

---

## 4. Component Library

All shared primitives live in `src/components/ui/`. **Always use these** — don't build raw HTML equivalents.

### 4.1 Button (`src/components/ui/Button.tsx`)

```tsx
import { Button } from '../../../components/ui/Button'

// Variants: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
// Sizes:    'sm' | 'md' | 'lg'
<Button variant="primary" size="md" icon={<Save size={15} />} loading={false}>
  ส่งขออนุมัติ
</Button>
```

Key specs:
- **All variants use `borderRadius: 4`** (squared, EXZY CI v3 — pill was retired in commit `98d50f4`) — never change this
- Primary: `linear-gradient(135deg, #66C5C5 0%, #004081 100%)` bg / white text
- Secondary: `linear-gradient(135deg, #EBF9F9 0%, #E8F2FC 100%)` bg / `#004081` text / `1.5px solid #66C5C5` border
- Hover: `translateY(-1px)` + deepened shadow — applied via `onMouseEnter`/`Leave` inline JS
- Loading: shows spinner, disables click

### 4.2 Card (`src/components/ui/Card.tsx`)

```tsx
import { Card, FieldDisplay, FieldGrid } from '../../../components/ui/Card'

<Card title="ข้อมูลคำขอ" actions={<Button size="sm">Edit</Button>}>
  <FieldGrid cols={3}>
    <FieldDisplay label="Proposal No." value="PRO-2026-001" mono />
    <FieldDisplay label="Status">{children}</FieldDisplay>
  </FieldGrid>
</Card>
```

Key specs:
- Background: `#FFFFFF`, border: `1px solid #D0D6DF`, borderRadius: `4px` (squared, EXZY CI v3)
- Header: bg `#F2F6F8`, `14px / weight 700 / color #001122`, border-bottom `1px solid #D0D6DF`, padding `14px 20px`
- Body padding: `20px` (use `noPad` prop to suppress)
- Hover: `translateY(-2px)` + `shadow-md` + teal border (`rgba(102,197,197,0.5)`)
- `FieldDisplay`: label is `11px / weight 700 / color #586782 / UPPERCASE / letter-spacing 0.06em`
- `FieldGrid`: CSS grid, default 3 columns, gap `16px 28px`

### 4.3 FormField (`src/components/ui/FormField.tsx`)

```tsx
import { FormGroup, Input, Select, Textarea } from '../../../components/ui/FormField'

<FormGroup label="Credit Term" required error={errors.creditTerm}>
  <Input value={val} onChange={...} placeholder="0" error={errors.creditTerm} />
</FormGroup>
```

Key specs (all inputs):
- Height: `38px`, padding: `0 12px`, borderRadius: `6px`
- Border resting: `1px solid #D0D6DF`
- Focus: `borderColor: #66C5C5` + `outline: 2px solid rgba(102,197,197,0.6)`
- Error: `borderColor: #F3554F`, bg: `#FEF2F2`
- Disabled: bg `#F2F6F8`, color `#929EB4`, cursor `not-allowed`
- Label: `12px / weight 600 / color #586782`; required `*` in `#F3554F`
- Error message: `12px / color #F3554F` below the field

### 4.4 Modal (`src/components/ui/Modal.tsx`)

```tsx
import { Modal } from '../../../components/ui/Modal'

<Modal open={open} onClose={() => setOpen(false)} title="อนุมัติคำขอ"
  footer={<><Button variant="secondary">ยกเลิก</Button><Button>ยืนยัน</Button></>}
  size="md">
  {children}
</Modal>
```

Key specs:
- Backdrop: `rgba(15,23,42,0.50)` (no blur in current impl, use backdrop-filter if adding)
- Box: `borderRadius: 4` (squared, EXZY CI v3), shadow: `shadow-lg` (navy-tinted)
- Sizes: sm=420px, md=560px, lg=720px max-width
- Scroll lock: `document.body.style.overflow = 'hidden'` while open
- Header: `16px / weight 700 / color #001122`; close button: X icon at 18px

### 4.5 Alert (`src/components/ui/Alert.tsx`)

```tsx
import { Alert } from '../../../components/ui/Alert'
<Alert type="error" title="เหตุผลที่ถูก Reject">…</Alert>
```

Types: `warning | info | success | error` — colors match status badge palette

### 4.6 StatusBadge (`src/components/ui/StatusBadge.tsx`)

```tsx
import { StatusBadge } from '../../../components/ui/StatusBadge'
<StatusBadge status="pending" size="sm" />
```

**Squared off in favor of the WorkX host app's plain status convention (2026-06-24):** no background, no border, no badge pill — just a colored Lucide icon + label, matching how the WorkX shell (e.g. the transport-request module) renders terminal statuses as plain colored text+icon. Config lives in `getStatusConfig()` (`src/features/credit-payment-term/utils/status.ts`), which returns `{ label, color, icon }` per status.

Status color/icon reference:
| Status | color | icon |
|--------|-------|------|
| draft | `#4A5568` | `FileText` |
| pending | `#92400E` | `Hourglass` |
| approved | `#14532D` | `CheckCircle` |
| rejected | `#7F1D1D` | `XCircle` |
| revised | `#1E40AF` | `RefreshCw` |
| cancelled | `#6B7280` | `Ban` |

Badge base: `13px (12px for size="sm") / weight 700 / icon 14px (13px sm) / gap 5px / no uppercase, no background, no border`

---

## 5. Layout System

### 5.1 AppShell (`src/components/layout/AppShell.tsx`)

```
┌────────────────────────────────────────────┐
│  Topbar (height 60px, position sticky)     │
│  bg: #FFFFFF  shadow: shadow-sm            │
│  inset top stripe: 3px solid #66C5C5       │
│  padding: 0 28px                           │
├────────────────────────────────────────────┤
│  <main> padding: 28px 32px                 │
│  bg: #F8F9FA                              │
│  <Outlet />                                │
└────────────────────────────────────────────┘
```

The Sidebar (`src/components/layout/Sidebar.tsx`) is defined separately and not mounted in the current router. It may be injected as part of the parent W+ app shell.

### 5.2 Sidebar Specs (`src/components/layout/Sidebar.tsx`)

- Width: `260px`, bg: `#004081` (navy)
- Active nav item: `borderLeft: 3px solid #66C5C5`, bg: `rgba(102,197,197,0.15)`
- Inactive: `color: rgba(255,255,255,0.65)`
- User footer badge: `borderRadius: 9999px`

### 5.3 Content Layout Patterns

```tsx
// Page wrapper — top-level page container
<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

// Two-column filter bar
<div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>

// Stat cards row (4 columns)
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>

// Form max-width
<div style={{ maxWidth: 760, margin: '0 auto' }}>

// Field grid inside card
<FieldGrid cols={2} />   // or cols={3}
```

---

## 6. Styling Approach

### Methodology
- **Inline React styles** (`style={{ ... }}`) — used for all component-specific styles
- **CSS classes** — only for: `.data-row`, `.page-title`, `.divider`, `.font-mono`, `.no-print`
- **NO Tailwind utility classes in components** — tokens are defined via `@theme {}` for the Tailwind engine but components do not use `className="text-navy"` etc.

### Typography

```
Page title:      20px / weight 700 / color #001122 / line-height 1.3
Card header:     14px / weight 700 / color #001122 / letter-spacing -0.01em
Section label:   11px / weight 700 / color #586782 / letter-spacing 0.06em / UPPERCASE
Body:            14px / weight 400 / color #505050 / line-height 1.65
Placeholder:     color #929EB4
Timestamp/muted: 11–12px / color #929EB4
Mono (currency): fontFamily 'JetBrains Mono, Noto Sans Thai, monospace' / weight 700
```

> **Font stack rule:** Poppins MUST come before Noto Sans Thai. Poppins has no Thai glyphs, so browsers automatically cascade to Noto Sans Thai for Thai characters. Do not reorder.

> **Thai text** needs `line-height: 1.75` for tone mark clearance. Use `:lang(th)` or `.thai` class (defined in globals.css).

### Shadows

**Never use `rgba(0,0,0,x)` shadows.** Always use navy-tinted:
```css
shadow-sm: 0 1px 2px rgba(0,64,129,0.04)
shadow-md: 0 4px 14px rgba(0,64,129,0.07)
shadow-lg: 0 16px 34px rgba(0,64,129,0.10), 0 2px 6px rgba(0,64,129,0.06)
```

### Hover interactions

Components apply hover/focus states via inline `onMouseEnter`/`onMouseLeave` handlers — not CSS `:hover`. Pattern:

```tsx
onMouseEnter={e => {
  e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,64,129,0.07)'
  e.currentTarget.style.transform = 'translateY(-2px)'
  e.currentTarget.style.borderColor = 'rgba(102,197,197,0.5)'
}}
onMouseLeave={e => {
  e.currentTarget.style.boxShadow = ''
  e.currentTarget.style.transform = ''
  e.currentTarget.style.borderColor = '#D0D6DF'
}}
```

### Focus ring

```css
outline: 2px solid rgba(102,197,197,0.7);
outline-offset: 2px;
```

Defined globally in `:focus-visible` (globals.css). Inputs also set it imperatively in `handleFocus`.

---

## 7. Icon System

**Library:** `lucide-react` (stroke-based, no filled icons)

```tsx
import { Save, Send, Search, Plus, ChevronDown, Check, X } from 'lucide-react'

// Button inline:   size={15}
// Form/nav:        size={16}
// Modal close:     size={18}
// Stat card icon:  size={20}
// Nav (Sidebar):   size={16}
```

Icons inherit `color` from their parent's `style.color`. Pass `color="#66C5C5"` for teal accents.

**No custom SVG sprite system** — `public/icons.svg` is the Vite starter template and is not used by the app components.

---

## 8. Asset Management

- **Source assets:** `src/assets/` (imported by components; Vite hashes and bundles them)
- **Public static:** `public/` (served as-is at `/`)
- **No CDN** configured
- **Images:** Only `src/assets/hero.png` (Vite template, not used in app UI)
- **Build output:** `dist/assets/` (content-hashed bundles)

---

## 9. Figma ↔ Code Mapping

### Figma File
- **File ID:** `60RgjevWzbKhCCjoc5kcmk` (W+ Library)
- **Page:** "Website"
- **Styles count:** 42 fills · 121 text · 19 effects

### Component mapping

| Figma component | Code component | File |
|----------------|----------------|------|
| `button/primary` | `<Button variant="primary">` | `src/components/ui/Button.tsx` |
| `button/secondary` | `<Button variant="secondary">` | same |
| `button/error` | `<Button variant="danger">` | same |
| `field/default` | `<Input>` / `<Select>` / `<Textarea>` | `src/components/ui/FormField.tsx` |
| `field/remark` | hint prop on `<FormGroup>` | same |
| `card` | `<Card>` | `src/components/ui/Card.tsx` |
| `tag/*` status | `<StatusBadge>` | `src/components/ui/StatusBadge.tsx` |
| `sidemenu/*` | `<Sidebar>` | `src/components/layout/Sidebar.tsx` |
| `modal` | `<Modal>` | `src/components/ui/Modal.tsx` |
| `alert` | `<Alert>` | `src/components/ui/Alert.tsx` |
| `Step_form` | `<RequestFormStepper>` | `src/features/credit-payment-term/components/RequestFormStepper.tsx` |
| `option_dropdown` | inline dropdown divs in `RequestFormStepper` | same |

### Figma token → code value quick reference

| Figma token | Hex value | Where used in code |
|-------------|-----------|-------------------|
| `bg/white` | `#FFFFFF` | Card bg, input bg, modal bg |
| `bg/grey` | `#F2F6F8` | Card header bg, table header, read-only input bg |
| `stroke/normal` | `#D0D6DF` | All default borders |
| `stroke/active` | `#004081` | Not currently used (focus uses teal) |
| `stroke/error` | `#F3554F` | Error input borders |
| `text/title` | `#001122` | Headings, card titles, mono amounts |
| `text/describe` | `#505050` | Body text |
| `text/read-only` | `#586782` | Labels, secondary text |
| `text/placeholder` | `#929EB4` | Placeholder, muted, timestamp |
| `text/error` | `#F3554F` | Error messages |
| `icon/active` | `#004081` | Active icons (navy) |
| `icon/completed` | `#66C5C5` | Teal check marks |

---

## 10. Data Model Overview

Key types in `src/features/credit-payment-term/types/`:

```typescript
// request.ts
type RequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'revised' | 'cancelled'
type SaleType = 'hardware' | 'hardware_software_installation'
type PaymentCondition = 'before_delivery' | 'on_po' | 'on_delivery' | 'on_installation' |
                        'on_acceptance' | 'monthly' | 'other'

interface Request {
  id, requestNo, version, createdAt, updatedAt
  salesEmail, salesName, salesId
  proposalNo, quotationNo, projectName, saleType
  customerInfo: RequestCustomerInfo    // discriminated union: new | existing | reseller
  quotationItems: QuotationItem[]      // type: 'hardware' | 'software' | 'installation'
  installmentCount, installments: PaymentInstallment[]
  swInstallmentCount?, swInstallments?  // only for hardware_software_installation
  financial: FinancialSummary
  status: RequestStatus
  approvalResult?, history: ApprovalHistoryEntry[]
}
```

---

## 11. Design Rules & Constraints

### Must follow
- **Buttons:** always squared (`borderRadius: 4`). Never use any other radius. (Pill was retired app-wide in commit `98d50f4`, 2026-06-23 — don't reintroduce it.)
- **Cards:** always `borderRadius: 4`. Never deviate.
- **Shadows:** always navy-tinted (`rgba(0,64,129,x)`). Never use black/grey shadows.
- **Font stack:** Poppins → Noto Sans Thai (order matters). Never reverse.
- **Topbar accent:** `inset 0 3px 0 0 #66C5C5` in boxShadow.

### Status badges
- Plain colored Lucide icon + label, no background, no border, no uppercase — config in `getStatusConfig()`.

### Forms
- Label above input, 12px, `#586782`
- Required mark: `*` in `#F3554F`, `marginLeft: 3`
- Error shown immediately below field, 12px, `#F3554F`
- Input height: `38px`

### Modals
- Always include: title, body, cancel + confirm buttons in footer
- Confirm disabled until confirmation checkbox is checked (destructive flows)
- Max-width by size: sm=420, md=560, lg=720

### Print
- Hide: `.no-print`, `header`, `nav`, `.role-switcher`
- Page size: A4, margin: 0 (via `print.css`)
- Tables get `1px solid #E2E8F0` borders in print

### Accessibility
- Icon-only buttons require `aria-label`
- Color is never the sole status indicator (badge always has text)
- Focus ring must be visible on all interactive elements

---

## 12. Adding New Components from Figma

When implementing a Figma component into this codebase:

1. **Use inline styles** (React `CSSProperties`) — not Tailwind classes, not CSS modules
2. **Reference the token table** in §3.2 for every color — do not invent new hex values
3. **Pick the radius** from `--radius-sm` (6px, inputs/dropdowns) or `--radius-md` (4px, everything else: cards, buttons, modals, alerts) — only those two values exist now
4. **Use Lucide icons** at the sizes listed in §7
5. **Wrap in a `<Card>`** if the Figma component is a panel/card
6. **Use `<FormGroup>` + `<Input>`** for any text input — do not build raw `<input>` elements
7. **Apply hover** via `onMouseEnter/Leave` on the root element (not CSS `:hover`) to match existing patterns
8. **Test Thai text** — verify line-height on any element that may contain Thai characters

---

*Last updated: 2026-06-24 · EXZY CI v3 design system (squared radii, commit `98d50f4`)*
