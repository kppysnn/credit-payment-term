# Design Guidelines

## Design intent

Internal tool. Clarity and trust over visual showmanship. Every element earns its place by reducing confusion, not by looking impressive.

## Color tokens

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#1E3A5F` | Sidebar, key headings, primary actions |
| `--color-primary-light` | `#2D5A8E` | Hover states on primary elements |
| `--color-accent` | `#2563EB` | Links, focus rings, active nav items |
| `--color-bg` | `#F5F7FA` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, modals, inputs |
| `--color-border` | `#E2E8F0` | Dividers, input borders |
| `--color-text-primary` | `#1A202C` | Body text, labels |
| `--color-text-secondary` | `#4A5568` | Secondary labels, metadata |
| `--color-text-muted` | `#A0AEC0` | Placeholder text, disabled |
| `--color-success` | `#16A34A` | Approved status, success alerts |
| `--color-warning` | `#D97706` | Pending status, warnings |
| `--color-danger` | `#DC2626` | Rejected status, destructive actions |

## Status badges

Each status has a defined light tinted background + matching text + border:

| Status | Background | Text | Border |
|---|---|---|---|
| draft | `#F7FAFC` | `#4A5568` | `#CBD5E0` |
| pending | `#FFFBEB` | `#92400E` | `#FCD34D` |
| approved | `#F0FDF4` | `#14532D` | `#86EFAC` |
| rejected | `#FEF2F2` | `#7F1D1D` | `#FCA5A5` |
| cancelled | `#F9FAFB` | `#6B7280` | `#D1D5DB` |

## Typography

- Font: Inter (sans) for all UI text; JetBrains Mono for request numbers, tax IDs, reference codes
- Base body: 14px / 1.5 line-height
- Page headings: 20–24px, font-weight 600
- Card headings: 16px, font-weight 600
- Labels: 12px, font-weight 500, uppercase not used
- Numeric data (currency, percentages): monospace for alignment

## Layout structure

```
┌─────────────────────────────────────────────────┐
│  Sidebar (240px fixed, navy #1E3A5F)           │
│  ┌──────────────────────────────────────────┐  │
│  │  Top bar (56px, white, border-bottom)   │  │
│  ├──────────────────────────────────────────┤  │
│  │  Main content area (flex-grow, bg-bg)   │  │
│  │  padding: 24px                           │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

- Sidebar is always 240px; collapses for print
- Main content max-width: none (full width of the flex area)
- Content cards use `bg-surface rounded-lg border border-border`

## Form conventions

- Input height: 36px (h-9)
- Label above input, 12px medium weight, `--color-text-secondary`
- Required fields: label has `*` suffix in `--color-danger`
- Error message: 12px `--color-danger`, appears immediately below the field
- Focus ring: 2px solid `--color-accent` with 2px offset
- Read-only fields in detail view: label + value with `FieldDisplay` component — no input chrome

## Stepper

- 5 steps shown as numbered circles across the top
- Completed steps: filled circle, checkmark icon
- Current step: filled circle, step number, bottom border accent
- Future steps: empty circle, muted text
- Clicking a completed step navigates backward (not forward)

## Cards and sections

- Use `Card` component for all grouped content sections
- Card has optional `title` (16px bold) and `actions` slot (right-aligned)
- Inside cards: `FieldGrid` for read-only data display (2–3 columns)
- No nested cards

## Buttons

| Variant | Usage |
|---|---|
| `primary` | Main submit actions (Submit, Approve) |
| `secondary` | Secondary nav (Back, Cancel, Close) |
| `danger` | Destructive confirm (Reject, Cancel Request) |
| `ghost` | Inline tertiary actions |
| `success` | Rare positive confirm in modals |

- All async buttons show loading spinner and disable on click
- Destructive flows always require a confirmation checkbox before the button enables

## Modals

- Max-width: 480px centered
- Overlay: `rgba(0,0,0,0.5)` with backdrop blur
- Scroll lock: `document.body.style.overflow = 'hidden'` while open
- Always include: title, body, cancel + confirm buttons
- Confirm button disabled until required fields are filled and confirmation checkbox is checked

## Print / PDF

- `@media print`: hide `.no-print` elements (sidebar, topbar, role switcher, action buttons, nav)
- `@page`: `size: A4; margin: 0`
- Print content uses a white background with full-bleed header block in `--color-primary`
- Font size bumped to 13px in print context
- Tables get visible borders in print
- Approval signature block at the bottom

## Accessibility

- All form inputs have associated `<label>` elements
- Icon-only buttons have `aria-label`
- Color is never the sole indicator of status (badges always include text label)
- Focus ring visible on all interactive elements
- Modal traps focus while open

## DEV Role Switcher

- Fixed bottom-right, `z-index: 50`
- Only visible in development (never appears in print)
- Shows current role + 3 role buttons
- `className="no-print"` to suppress in export
