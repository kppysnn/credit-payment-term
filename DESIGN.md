---
name: PCT — Payment & Credit Term Approval System
description: Internal approval workflow tool for EXZY Co., Ltd. — structured, role-aware, and audit-traceable.
colors:
  teal: "#66C5C5"
  navy: "#004081"
  ink: "#001122"
  body-text: "#505050"
  text-secondary: "#586782"
  text-muted: "#929EB4"
  text-muted-alt: "#626262"
  bg-primary: "#F8F9FA"
  bg-secondary: "#F2F6F8"
  border: "#D0D6DF"
  success: "#82C566"
  warning: "#FFCC00"
  error: "#F3554F"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "'Poppins', 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "clamp(2.125rem, 4.8vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Poppins', 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "'Poppins', 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "'Poppins', 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  small:
    fontFamily: "'Poppins', 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Poppins', 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.07em"
rounded:
  sm: "6px"
  md: "14px"
  lg: "22px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "64px"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, #66C5C5 0%, #004081 100%)"
    textColor: "#F8F9FA"
    rounded: "9999px"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "linear-gradient(135deg, #7FD0D0 0%, #005BB8 100%)"
    textColor: "#F8F9FA"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "#001122"
    rounded: "9999px"
    padding: "14px 24px"
  button-ghost-hover:
    backgroundColor: "rgba(102,197,197,0.10)"
    textColor: "#004081"
  button-danger:
    backgroundColor: "#F3554F"
    textColor: "#FFFFFF"
    rounded: "9999px"
    padding: "14px 24px"
  card:
    backgroundColor: "#FFFFFF"
    rounded: "14px"
    padding: "24px"
  input:
    backgroundColor: "#FFFFFF"
    textColor: "#001122"
    rounded: "6px"
    padding: "0 12px"
    height: "40px"
---

# Design System: PCT — EXZY Approval Platform

## 1. Overview

**Creative North Star: "The Trusted Instrument"**

PCT is the internal approval instrument for EXZY Co., a B2B technology company that prides itself on running on systems that work. The interface must embody this: every screen should feel like a precision tool — nothing surprising, nothing wasted, nothing uncertain. Users trust the tool because it behaves like the best-run teams at EXZY do: structured, responsive, and genuinely helpful.

The palette anchors on EXZY Teal (#66C5C5) and EXZY Navy (#004081) — two colors that together read as technology with depth. Teal signals activity: hover states, focus rings, active badges, accent marks. Navy signals authority: primary navigation, headings of consequence, CTA emphasis. Between them sits a clean light-background system (#F8F9FA) that keeps reading fast and fatigue low. This is a tool used every day, multiple times; the design must not fight its users.

This system explicitly rejects three aesthetics: legacy enterprise density (gray tables that look like Windows XP, SAP-style forms), consumer-startup template (Notion/Linear cream-white padding, large empty spaces), and aggressive dark-gamer (neon accents, heavy glow effects). PCT must feel distinctly EXZY — not like a category default.

**Key Characteristics:**
- Light, clean backgrounds with flat surfaces; depth conveyed through borders and subtle navy-tinted shadows
- EXZY Teal as signal (hover, active, focus, badge, accent line); EXZY Navy as anchor (nav, headings, CTA, footer)
- Noto Sans Thai primary — the Thai language is first-class, not an afterthought
- Pill-shaped primary buttons with teal-to-navy gradient; used sparingly
- Status badges are the highest-density communication layer: always consistent, always legible
- The activity timeline is a first-class component, not a log page

## 2. Colors: The EXZY CI Palette

A two-color signal system on a clean light ground. Teal signals; Navy anchors. Everything else supports.

### Primary
- **EXZY Teal** (#66C5C5): Signal color. Hover states, active nav indicators, focus rings, badge accents, icon highlights, subtle section borders. Used to show the system responding to the user. Never used as a large background fill.
- **EXZY Navy** (#004081): Anchor color. Sidebar background, critical headings, CTA emphasis, navigation active state, icon containers, footer/dark sections. Provides weight and authority.

### Secondary
- **Teal-to-Navy Gradient** (`linear-gradient(135deg, #66C5C5 0%, #004081 100%)`): Reserved for the primary CTA button and hero action moments only. Prohibited on cards, section backgrounds, headings, badges, and icons.

### Tertiary (Semantic)
- **Success Green** (#82C566): Approved status, positive confirmation, completion indicators.
- **Warning Yellow** (#FFCC00): Pending states, time-sensitive alerts, risk flags. Use with navy or ink text — never white-on-yellow.
- **Error Red** (#F3554F): Rejected status, delete actions, error states, destructive confirmations.

### Neutral
- **Ink** (#001122): Page titles, critical headings, modal titles. Maximum contrast. Used for text that must never be missed.
- **Body Text** (#505050): All paragraph text, table cell values, form input values. 4.5:1+ against white.
- **Slate Secondary** (#586782): Labels, helper text, secondary information. Still readable; not decorative muted.
- **Bluegray Muted** (#929EB4): Placeholder text, disabled labels, timestamps in low-emphasis contexts.
- **Muted Alt** (#626262): Alternative muted tone for light contexts. Use only when #929EB4 reads too blue.
- **Background** (#F8F9FA): Page canvas. All main content sits on this.
- **Secondary Surface** (#F2F6F8): Sidebar content areas, table headers, subtle row alternation, form group backgrounds.
- **Border / Divider** (#D0D6DF): All card borders, table row borders, input borders, section dividers.
- **White** (#FFFFFF): Card surface, modal background, input background.

### Named Rules

**The Signal Rule.** Teal is a signal, not a fill. It appears on ≤15% of any screen surface — as hover states, active indicators, focus rings, and accent marks. Teal backgrounds on sections, cards, or large containers are prohibited. Its relative rarity is what makes it communicate.

**The Gradient Restraint Rule.** Two gradient registers exist, and they are not interchangeable.
- **Signal Gradient** — the full teal-to-navy gradient (`linear-gradient(135deg, #66C5C5 0%, #004081 100%)`). Reserved for exactly one element per screen: the primary CTA. Never on section backgrounds, headings, badge text, icon fills, or decorative stripes. If a second Signal Gradient element is tempting, the design has lost confidence.
- **Wash Gradient** — soft, low-contrast tints where the two stops read as one color from a normal viewing distance (e.g. `linear-gradient(135deg, #EBF9F9 0%, #E8F2FC 100%)` for selected/active control states, `linear-gradient(90deg, #EEF5FB 0%, #EFF9F9 100%)` for subtotal/summary row backgrounds, `linear-gradient(180deg, #ffffff 0%, #F7FBFE 100%)` for card body fills, or a darker navy-toned bar like `linear-gradient(135deg, #001D3D 0%, #004081 100%)` for section-header bars). Wash Gradients are permitted on segmented-control selection states, card section headers, card body backgrounds, and data-row washes — anywhere a flat tint would otherwise sit. A gradient counts as a Wash only while it stays low-contrast; once it's bright or high-contrast enough to read as a signal, it has become a Signal Gradient and the one-per-screen limit applies.

**The Navy Shadow Rule.** No generic black box-shadows (`rgba(0,0,0,0.x)`). Every shadow uses navy tint: small `0 1px 2px rgba(0,64,129,0.04)`, medium `0 4px 14px rgba(0,64,129,0.07)`, large `0 16px 34px rgba(0,64,129,0.10)`.

## 3. Typography: Dual-Script by Design

**Stack:** `'Poppins', 'Noto Sans Thai', system-ui, sans-serif` — defined once as `--font-sans` in `globals.css`. Every component inherits it; no component should set its own `fontFamily` literal for body text.

**Character:** English copy renders in Poppins, Thai copy renders in Noto Sans Thai — automatically, per character, even within a single mixed-language string (e.g. "Quotation No. 1345678-1"). This works because of how the browser resolves font stacks: it doesn't pick a font for the whole text node, it walks the stack per character and uses the first font that has a glyph for it. Poppins is listed first and has zero Thai glyph coverage, so Thai characters (`U+0E01–0E5B`) fall straight through to Noto Sans Thai. Noto Sans Thai is listed second and has full Latin coverage as well as Thai, so it's a safe catch-all.

**Do not reverse this order.** Putting Noto Sans Thai first breaks the split silently: Noto Sans Thai's own Latin glyphs would render English text too, and Poppins would never be reached for anything, since "Thai-first" only changes which font wins on contested Latin characters — Noto already covers Thai either way.

Thai typography demands extra line-height care: vowel marks and tone marks stack above the base letterform, requiring a minimum 1.65 line-height for body text (1.75 preferred). This is not a preference — it is a legibility requirement.

### Hierarchy

- **Display** (700, clamp(2.125rem–3.5rem), lh 1.2): Hero headlines on empty states, large confirmation pages, and marketing-facing contexts. Use `text-wrap: balance`.
- **Headline** (700, clamp(1.875rem–2.75rem), lh 1.25): Section headings, modal titles, page-level headings. Use `text-wrap: balance`.
- **Title** (700, 1.25rem, lh 1.4): Card headings, stat labels, panel titles, table section breaks.
- **Body** (400, 1rem, lh 1.75): All paragraph copy, table cell values, form labels. Max line length 65–75ch on prose; no max on table cells. Thai paragraphs: `text-wrap: pretty`.
- **Small** (400, 0.875rem, lh 1.6): Helper text below inputs, secondary table columns, breadcrumbs, timestamps.
- **Label** (700, 0.6875rem, ls 0.07em, uppercase): Badge text, status tags, column headers in tables, category markers. Thai labels should avoid uppercase; use weight instead.

### Named Rules

**The Thai-First Rule.** Every spacing and sizing decision must be validated with Thai text in place. Thai characters are taller than Latin equivalents. A line-height that works for English body copy will clip tone marks in Thai. Minimum 1.65 line-height everywhere; 1.75 preferred for paragraph text.

## 4. Elevation: Flat by Default, Navy-Tinted on State

This system is flat at rest. Cards and containers sit flush on the canvas with a 1px solid border (`#D0D6DF`). Shadows appear only as a response to interaction state (hover, modal emergence) or semantic elevation (modals are above the canvas; they need separation).

### Shadow Vocabulary

- **Hover lift** (`0 4px 14px rgba(0,64,129,0.07)` + `translateY(-2px)`): Applied to interactive cards on hover. The translateY signals interactivity; the shadow confirms lift.
- **Modal** (`0 16px 34px rgba(0,64,129,0.10)` + `0 2px 6px rgba(0,64,129,0.06)`): Modal panels need clear separation from the backdrop. Two-layer shadow at different radii reads as genuine depth.
- **Small structural** (`0 1px 2px rgba(0,64,129,0.04)`): Topbar, sticky headers, dropdown menus. Barely-there; just enough to signal layer.

### Named Rules

**The Flat-By-Default Rule.** No resting shadows on cards or containers. Border + background difference provide layer separation at rest. Shadows are earned through state transitions, not applied decoratively.

**The Black Shadow Ban.** `rgba(0,0,0,x)` is prohibited. Every shadow is navy-tinted. A black shadow on a cool-light palette reads as a foreign body.

## 5. Components

### Buttons

The primary button is the most distinctive element in the system — pill-shaped, gradient-filled, with an intentional confidence.

- **Shape:** Full pill (`border-radius: 9999px`), `padding: 14px 24px`, `font-size: 0.875rem`, `font-weight: 600`.
- **Primary:** Background is the teal-to-navy gradient. White/`#F8F9FA` text. On hover: `translateY(-2px)`, shadow deepens to `0 6px 20px rgba(0,64,129,0.18)`, brightness increases slightly. If an arrow icon is present, it shifts 3px right on hover.
- **Ghost / Secondary:** Transparent background, `#001122` ink text, `1px solid rgba(0,64,129,0.22)` border. On hover: background `rgba(102,197,197,0.10)`, border shifts to `#66C5C5`, text to `#004081`.
- **Danger:** `#F3554F` background, white text. Pill shape. Used for reject, delete, destructive confirmation actions. Always requires a modal confirmation before the action fires.
- **Disabled:** `opacity: 0.4`, `cursor: not-allowed`. Never change shape or size for disabled state.
- **Height:** 40px minimum (touch target). Desktop: `padding: 10px 20px`.

### Chips / Badges (Status Tags)

The highest-communication-density component in the system. Every status badge must be legible at a glance without reading the text.

- **Shape:** Pill (`border-radius: 9999px`), `padding: 2px 10px`, `font-size: 0.6875rem`, `font-weight: 700`, uppercase (Latin only; Thai: weight-only).
- **Pending (L1/L2):** Background `#FFFBEB`, text `#92400E`, border `1px solid #FCD34D`. Amber register.
- **Approved:** Background `#F0FDF4`, text `#14532D`, border `1px solid #86EFAC`. Green register.
- **Rejected:** Background `#FEF2F2`, text `#7F1D1D`, border `1px solid #FCA5A5`. Red register.
- **Completed:** Background `#F0FDF4`, text `#166534`, border `1px solid #4ADE80`. Darker green register.
- **Draft:** Background `#F7FAFC`, text `#4A5568`, border `1px solid #CBD5E0`. Neutral.
- **Cancelled:** Background `#F9FAFB`, text `#6B7280`, border `1px solid #D1D5DB`. Muted neutral.
- **Revision Needed:** Background `#FDF4FF`, text `#581C87`, border `1px solid #D8B4FE`. Purple register.

### Cards / Containers

Flat, structured, legible. Cards are used only when the content genuinely needs grouping — not as a default layout chrome.

- **Corner Style:** Gently curved (14px radius). Large containers (stat blocks, feature panels): 22px.
- **Background:** `#FFFFFF` (white card on `#F8F9FA` background provides clear layer separation without shadows).
- **Shadow Strategy:** None at rest. Hover: `0 4px 14px rgba(0,64,129,0.07)` + `translateY(-2px)`. Modals: large shadow.
- **Border:** `1px solid #D0D6DF` always. No border + shadow combination at rest.
- **Internal Padding:** `24px` standard. `16px 20px` for panel headers. `20px` for compact cards.
- **Hover border shift:** `rgba(102,197,197,0.5)` — the teal signal reads as interactivity.

### Inputs / Fields

- **Style:** Stroke input — `1px solid #D0D6DF` border on `#FFFFFF` background. Radius `6px`. Height `40px`. Padding `0 12px`.
- **Focus:** `outline: 2px solid rgba(102,197,197,0.6)`, `outline-offset: 2px`, border shifts to `#66C5C5`. Focus ring uses teal, reinforcing the signal rule.
- **Error:** Border `#F3554F`, helper text below in `#F3554F`, `font-size: 0.75rem`.
- **Disabled:** `background: #F2F6F8`, `color: #929EB4`, `cursor: not-allowed`.
- **Labels:** Above the input, `0.75rem`, weight `600`, color `#586782`. Required fields: asterisk `*` in `#F3554F` after label text.

### Navigation (Sidebar)

The sidebar is the spatial anchor of the application — the one persistent element every role sees.

- **Style:** `#004081` (EXZY Navy) background. Width `260px` fixed. No border; the color contrast with `#F8F9FA` content area is separation enough.
- **Logo area:** `72px` height. EXZY wordmark / logo in white or teal.
- **Nav items:** `14px`, weight `500`, color `rgba(255,255,255,0.75)`. `padding: 10px 16px`. Border-radius `8px`.
- **Hover:** `background: rgba(255,255,255,0.08)`, text `rgba(255,255,255,0.95)`.
- **Active:** `background: rgba(102,197,197,0.15)`, text `#FFFFFF`, left border `3px solid #66C5C5`.
- **Mobile:** Drawer pattern — slides in from left, `backdrop-filter: blur(8px)` overlay.
- **User footer:** Pinned to bottom. Avatar + name + role chip. Logout button with `rgba(255,255,255,0.15)` hover.

### Topbar

- **Style:** `#FFFFFF` background, `border-bottom: 1px solid #D0D6DF`. Height `60px`. `padding: 0 24px`.
- **Shadow:** `0 1px 2px rgba(0,64,129,0.04)` — barely visible, just enough layer signal.
- **Page title:** Weight `600`, color `#001122`, `18px`.
- **Actions:** Aligned right. Secondary/ghost buttons only — no primary CTAs in the topbar.

### Tables

The primary data display component. Used on every list page.

- **Header:** `background: #F2F6F8`, `font-size: 0.75rem`, `font-weight: 700`, `text-transform: uppercase`, `color: #586782`, `letter-spacing: 0.05em`. `border-bottom: 1px solid #D0D6DF`.
- **Row height:** `52px`. `border-bottom: 1px solid #D0D6DF`.
- **Row hover:** `background: #F8F9FA`. No elevation, just tint.
- **Cell text:** `#505050` body color. Amounts in monospace (`JetBrains Mono` if available, else `monospace`).
- **Empty state:** Centered illustration or icon, headline in `#001122`, description in `#586782`, optional CTA button.

## 6. Do's and Don'ts

### Do:
- **Do** use EXZY Teal (#66C5C5) exclusively as a signal: hover states, focus rings, active nav indicators, badge accents. Its rarity makes it communicate.
- **Do** use EXZY Navy (#004081) as the anchor: sidebar, headings of consequence, CTA buttons, footer.
- **Do** use navy-tinted shadows at all times: `rgba(0,64,129,0.04/0.07/0.10)`. Never `rgba(0,0,0,x)`.
- **Do** apply the Signal Gradient (full teal-to-navy) to exactly one element per screen: the primary CTA button. Wash Gradients (soft, low-contrast tints) may appear more broadly — see the Gradient Restraint Rule.
- **Do** set Thai body text line-height at minimum 1.65; prefer 1.75. Tone marks stack above Thai letterforms and need room.
- **Do** use `text-wrap: balance` on h1–h3 and `text-wrap: pretty` on Thai paragraphs.
- **Do** keep card surfaces white on the `#F8F9FA` background — the contrast provides layer without shadows.
- **Do** use pill-shaped buttons (border-radius 9999px) for all primary and ghost actions.
- **Do** display status badges consistently with the exact same color mapping across every page — the badge is the fastest status read.
- **Do** require modal confirmation before any destructive action (reject, delete, cancel). Danger buttons are always red (#F3554F).
- **Do** use WCAG AA contrast as a floor, not a ceiling. Body text (#505050 on #FFFFFF) should clear 4.5:1.

### Don't:
- **Don't** use the Signal Gradient (teal-to-navy) on section backgrounds, card fills, heading text, icon fills, badges, or decorative stripes — that combination is reserved for the primary CTA. Wash Gradients are fine in those places; the Signal Gradient is not.
- **Don't** use gradient text (`background-clip: text`). Prohibited. Use a single solid color.
- **Don't** add a new color to the system without a semantic role. The system has two accent colors and three semantic colors. That is enough.
- **Don't** use black-tinted shadows. Every shadow uses navy as the shadow color.
- **Don't** stack border + shadow on a card at rest. Border gives structure; shadow gives lift. Rest state uses border. Hover state uses both.
- **Don't** use `border-left` wider than 1px as an accent stripe on cards, callouts, or alerts. Rewrite with background tint or full border instead.
- **Don't** use glassmorphism on card or content surfaces. Blurs and glass are prohibited as general card treatment — only permissible on transient overlays (the mobile sidebar backdrop).
- **Don't** make the UI look like a SaaS landing page template: no hero metrics grid, no testimonial cards, no big-number stat callouts with gradient borders. This is a workflow tool.
- **Don't** use rounded corners beyond 22px on any card. Pill is reserved for buttons and badges.
- **Don't** add tiny uppercase section-kicker labels above every section heading. One named kicker as a deliberate system is voice; eyebrows on every heading is AI grammar.
- **Don't** use purple, pink, or orange anywhere in the UI. Those colors have no semantic role in this system and will read as accidents.
- **Don't** use line-height below 1.65 for any Thai text. This clips tone marks. It is a legibility defect, not a stylistic choice.
