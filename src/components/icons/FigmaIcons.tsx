/**
 * Custom icon set exported directly from the Exzy_WorkX Figma file (node 1317:2565,
 * 730:25425) — these have no equivalent in any public icon library, so they're kept
 * as local SVGs rather than approximated, to match the host's thin-line icon style
 * exactly (chevron, search, sort caret, kebab menu).
 */
import type { CSSProperties } from 'react'

interface IconProps {
  /** number|string to stay assignable to react-icons' IconType, so these can
   * be used interchangeably with react-icons/fi components (e.g. in StatusConfig.icon). */
  size?: number | string
  color?: string
  style?: CSSProperties
}

const ROTATION = { right: 0, down: 90, left: 180, up: -90 } as const

export function ChevronIcon({ size = 14, color = 'currentColor', style, direction = 'right' }: IconProps & { direction?: keyof typeof ROTATION }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={style}>
      <g transform={`translate(7,7) rotate(${ROTATION[direction]}) translate(-4,-7)`}>
        <path d="M1.52227 0L0 1.645L4.94467 7L0 12.355L1.52227 14L8 7L1.52227 0Z" fill={color} />
      </g>
    </svg>
  )
}

export function SearchIcon({ size = 15, color = '#929EB4', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" style={style}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0858 8.80789L15 13.7221L13.7221 15L8.80789 10.0858C7.89022 10.7461 6.78388 11.1492 5.57461 11.1492C2.49571 11.1492 0 8.65352 0 5.57461C0 2.49571 2.49571 0 5.57461 0C8.65352 0 11.1492 2.49571 11.1492 5.57461C11.1492 6.78388 10.7461 7.89022 10.0858 8.80789ZM5.57461 1.71527C3.43911 1.71527 1.71527 3.43911 1.71527 5.57461C1.71527 7.71012 3.43911 9.43396 5.57461 9.43396C7.71012 9.43396 9.43396 7.71012 9.43396 5.57461C9.43396 3.43911 7.71012 1.71527 5.57461 1.71527Z"
        fill={color}
      />
    </svg>
  )
}

export function KebabIcon({ size = 16, color = '#586782', style }: IconProps) {
  const n = Number(size)
  return (
    <svg width={n / 4} height={n} viewBox="0 0 4 16" style={style}>
      <path
        d="M2 4C3.1 4 4 3.1 4 2C4 0.9 3.1 0 2 0C0.9 0 0 0.9 0 2C0 3.1 0.9 4 2 4ZM2 6C0.9 6 0 6.9 0 8C0 9.1 0.9 10 2 10C3.1 10 4 9.1 4 8C4 6.9 3.1 6 2 6ZM2 12C0.9 12 0 12.9 0 14C0 15.1 0.9 16 2 16C3.1 16 4 15.1 4 14C4 12.9 3.1 12 2 12Z"
        fill={color}
      />
    </svg>
  )
}

export function SortIcon({ size = 8, color = '#D0D6DF', style, direction = 'down' }: IconProps & { direction?: 'up' | 'down' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 5 10" style={{ transform: direction === 'up' ? 'rotate(-90deg)' : 'rotate(90deg)', ...style }}>
      <path d="M0 0V10L5 5L0 0Z" fill={color} />
    </svg>
  )
}

/** The two stacked carets next to a sortable table column header, matching the
 * host table's "icon_sort" component (730:25586 etc.) exactly. Gap from the
 * column label is 10px, not a tight 4px — Figma's own icon_sort sits inside a
 * 32px box with the glyph inset ~33% from its left edge, so the *visible*
 * gap between label and glyph works out to ~10-11px even though the layout
 * itself has zero explicit gap (confirmed against Exzy_WorkX 851:2649). */
export function SortCarets({ size = 7, activeColor = '#004081', inactiveColor = '#D0D6DF', sort }: { size?: number; activeColor?: string; inactiveColor?: string; sort?: 'asc' | 'desc' }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, marginLeft: 10 }}>
      <SortIcon size={size} direction="up" color={sort === 'asc' ? activeColor : inactiveColor} />
      <SortIcon size={size} direction="down" color={sort === 'desc' ? activeColor : inactiveColor} />
    </span>
  )
}

/** Bare X mark — Figma's "icon_X" (917:377), built from two crossed bars, not a
 * circled X. Used for "rejected", colored red, no circle/background. */
export function XMarkIcon({ size = 14, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={style}>
      <g stroke={color} strokeWidth={1.8} strokeLinecap="round">
        <line x1="1.5" y1="1.5" x2="12.5" y2="12.5" />
        <line x1="12.5" y1="1.5" x2="1.5" y2="12.5" />
      </g>
    </svg>
  )
}

/** Hourglass — Figma's "hourglass-split" (909:953), exact path. Used for "pending". */
export function HourglassIcon({ size = 14, color = '#FFCC00', style }: IconProps) {
  const n = Number(size)
  return (
    <svg width={n} height={n * (14 / 12)} viewBox="0 0 12 14" style={style}>
      <path
        d="M0.5 14C0.223858 14 0 13.7762 0 13.5C0 13.2239 0.223858 13 0.5 13H1.5V12C1.5 10.2099 2.54528 8.66493 4.05655 7.9403C4.34645 7.8013 4.5 7.56317 4.5 7.35083V6.64919C4.5 6.43685 4.34645 6.19872 4.05655 6.05972C2.54528 5.33509 1.5 3.7901 1.5 2V1H0.5C0.223858 1 0 0.776142 0 0.5C0 0.223858 0.223858 0 0.5 0L11.5 2.19345e-05C11.7761 2.57492e-05 12 0.223886 12 0.50003C12 0.776172 11.7761 1.00003 11.5 1.00002L10.5 1.00001V2C10.5 3.7901 9.45472 5.33509 7.94345 6.05972C7.65355 6.19872 7.5 6.43685 7.5 6.64919V7.35083C7.5 7.56317 7.65355 7.8013 7.94345 7.9403C9.45472 8.66493 10.5 10.2099 10.5 12V13H11.5C11.7761 13 12 13.2239 12 13.5C12 13.7762 11.7761 14 11.5 14H0.5ZM2.5 1.00002V2.00002C2.5 2.5367 2.62078 3.04531 2.83678 3.50004H9.16322C9.37922 3.04531 9.5 2.5367 9.5 2.00002V1.00002H2.5ZM5.5 7.35085C5.5 8.05108 5.02187 8.58648 4.4889 8.84203C3.31139 9.40663 2.5 10.6091 2.5 12C2.5 12 3.36574 10.7014 5.5 10.5208V7.35085ZM6.5 7.35085V10.5208C8.63426 10.7014 9.5 12 9.5 12C9.5 10.6091 8.68861 9.40663 7.5111 8.84203C6.97813 8.58648 6.5 8.05108 6.5 7.35085Z"
        fill={color}
      />
    </svg>
  )
}

/** Filled check-circle — Figma's "check-circle-fill" (909:1364/1029:377), exact
 * path. Used for "approved" — note: Figma colors this teal (#66C5C5), not green. */
export function CheckCircleIcon({ size = 14, color = '#66C5C5', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={style}>
      <path
        d="M18 9C18 13.9706 13.9706 18 9 18C4.02944 18 0 13.9706 0 9C0 4.02944 4.02944 0 9 0C13.9706 0 18 4.02944 18 9ZM13.5341 5.59088C13.2046 5.26137 12.6704 5.26137 12.3409 5.59088C12.3329 5.59884 12.3254 5.60726 12.3185 5.61612L8.41207 10.5938L6.05686 8.23863C5.72736 7.90912 5.19312 7.90912 4.86362 8.23863C4.53411 8.56813 4.53411 9.10236 4.86362 9.43187L7.84087 12.4091C8.17038 12.7386 8.70461 12.7386 9.03411 12.4091C9.04145 12.4018 9.04838 12.394 9.05486 12.3859L13.5461 6.77191C13.8636 6.44154 13.8596 5.91634 13.5341 5.59088Z"
        fill={color}
      />
    </svg>
  )
}

/** Circle-with-plus-cutout — Figma's "icon_Add" (937:1058), exact path. The
 * plus shape is a literal hole cut out of a solid disc (evenodd fill), so when
 * dropped onto a colored/gradient button it reads as "white ring, gradient
 * plus showing through the middle" — exactly the host's "Web Main Button"
 * icon, with no extra layering needed. */
export function AddCircleIcon({ size = 18, color = 'white', style }: IconProps) {
  return (
    <svg width={size} height={Number(size) * (18 / 18.2267)} viewBox="0 0 18.2267 18" style={style}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.2267 9C18.2267 4.02944 14.1465 0 9.11336 0C4.08019 0 0 4.02944 0 9C0 13.9706 4.08019 18 9.11336 18C14.1465 18 18.2267 13.9706 18.2267 9ZM8.26964 4H9.95729V8.16667H14.1763V9.83333H9.95729V14H8.26963V9.83333H4.05038V8.16667H8.26964V4Z"
        fill={color}
      />
    </svg>
  )
}

/** Printer — Figma's "icon_printer" (917:404), exact path. */
export function PrinterIcon({ size = 15, color = 'currentColor', style }: IconProps) {
  const n = Number(size)
  return (
    <svg width={n} height={n * (16 / 19)} viewBox="0 0 19 16" style={style}>
      <path d="M5.9375 0C4.62582 0 3.5625 1.10207 3.5625 2.46154V3.69231H15.4375V2.46154C15.4375 1.10207 14.3742 0 13.0625 0H5.9375Z" fill={color} />
      <path d="M13.0625 9.84615H5.9375C5.28166 9.84615 4.75 10.3972 4.75 11.0769V14.7692C4.75 15.449 5.28166 16 5.9375 16H13.0625C13.7183 16 14.25 15.449 14.25 14.7692V11.0769C14.25 10.3972 13.7183 9.84615 13.0625 9.84615Z" fill={color} />
      <path d="M0 7.38462C0 6.02515 1.06332 4.92308 2.375 4.92308H16.625C17.9367 4.92308 19 6.02515 19 7.38462V11.0769C19 12.4364 17.9367 13.5385 16.625 13.5385H15.4375V11.0769C15.4375 9.71745 14.3742 8.61538 13.0625 8.61538H5.9375C4.62582 8.61538 3.5625 9.71745 3.5625 11.0769V13.5385H2.375C1.06332 13.5385 0 12.4364 0 11.0769V7.38462ZM2.96875 8.61538C3.29667 8.61538 3.5625 8.33987 3.5625 8C3.5625 7.66013 3.29667 7.38462 2.96875 7.38462C2.64083 7.38462 2.375 7.66013 2.375 8C2.375 8.33987 2.64083 8.61538 2.96875 8.61538Z" fill={color} />
    </svg>
  )
}

/** Trash bin — Figma's "icon_delete_bin" (909:1413), exact path. */
export function TrashIcon({ size = 15, color = 'currentColor', style }: IconProps) {
  const n = Number(size)
  return (
    <svg width={n} height={n * (18 / 14)} viewBox="0 0 14 18" style={style}>
      <path d="M9.12 7.47L7 9.59L4.87 7.47L3.46 8.88L5.59 11L3.47 13.12L4.88 14.53L7 12.41L9.12 14.53L10.53 13.12L8.41 11L10.53 8.88L9.12 7.47ZM10.5 1L9.5 0H4.5L3.5 1H0V3H14V1H10.5ZM1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM3 6H11V16H3V6Z" fill={color} />
    </svg>
  )
}

/** Solid filled circle with X inside — mirror of CheckCircleIcon for rejection/error states. */
export function XCircleIcon({ size = 14, color = '#F3554F', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={style}>
      <path d="M9 0C4.02944 0 0 4.02944 0 9C0 13.9706 4.02944 18 9 18C13.9706 18 18 13.9706 18 9C18 4.02944 13.9706 0 9 0ZM12.5355 12.5355C12.2426 12.8284 11.7574 12.8284 11.4645 12.5355L9 10.0711L6.53553 12.5355C6.24264 12.8284 5.75736 12.8284 5.46447 12.5355C5.17157 12.2426 5.17157 11.7574 5.46447 11.4645L7.92893 9L5.46447 6.53553C5.17157 6.24264 5.17157 5.75736 5.46447 5.46447C5.75736 5.17157 6.24264 5.17157 6.53553 5.46447L9 7.92893L11.4645 5.46447C11.7574 5.17157 12.2426 5.17157 12.5355 5.46447C12.8284 5.75736 12.8284 6.24264 12.5355 6.53553L10.0711 9L12.5355 11.4645C12.8284 11.7574 12.8284 12.2426 12.5355 12.5355Z" fill={color} />
    </svg>
  )
}

/** Circle with diagonal slash — ban/cancel/no-entry symbol. Used for cancel actions. */
export function BanIcon({ size = 14, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={style}>
      <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.02944 0 0 4.02944 0 9C0 13.9706 4.02944 18 9 18C13.9706 18 18 13.9706 18 9C18 4.02944 13.9706 0 9 0ZM2 9C2 5.13401 5.13401 2 9 2C10.6584 2 12.1924 2.57001 13.3995 3.51472L3.51472 13.3995C2.57001 12.1924 2 10.6584 2 9ZM4.6005 14.4853C5.80761 15.43 7.34164 16 9 16C12.866 16 16 12.866 16 9C16 7.34164 15.43 5.80761 14.4853 4.6005L4.6005 14.4853Z" fill={color} />
    </svg>
  )
}

/** Circular refresh arrows — Figma's "icon_refresh" (937:1108), exact path
 * (distinct from the chevron-style refresh icon used elsewhere). */
export function RefreshIcon({ size = 15, color = 'currentColor', style }: IconProps) {
  const n = Number(size)
  return (
    <svg width={n} height={n} viewBox="0 0 18 18" style={style}>
      <path d="M9 0C4.6311 0 0.990135 3.11333 0.172485 7.24218H2.67078C3.44055 4.46634 5.97904 2.42578 9 2.42578C10.816 2.42578 12.4571 3.16371 13.645 4.35498L10.7578 7.24218H18V0L15.3633 2.63672C13.7348 1.00772 11.4855 0 9 0ZM0 10.7578V18L2.63672 15.3633C4.26519 16.9923 6.51453 18 9 18C13.3689 18 17.0099 14.8867 17.8275 10.7578H15.3292C14.5595 13.5336 12.0209 15.5742 9 15.5742C7.18396 15.5742 5.54289 14.8363 4.35498 13.645L7.24218 10.7578H0Z" fill={color} />
    </svg>
  )
}

/** Hamburger — three stacked bars, standard mobile-nav toggle glyph (no
 * matching node in the Figma file since the desktop module-tabs row has no
 * mobile equivalent there yet). */
export function MenuIcon({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 14" style={style}>
      <g stroke={color} strokeWidth={1.8} strokeLinecap="round">
        <line x1="0" y1="1" x2="18" y2="1" />
        <line x1="0" y1="7" x2="18" y2="7" />
        <line x1="0" y1="13" x2="18" y2="13" />
      </g>
    </svg>
  )
}

/** Paper-plane ("send") — Font Awesome 6 Solid's paper-plane glyph, used for
 * the "submitted"/"resubmitted" timeline step. The raw glyph fills its 512x512
 * viewBox edge-to-edge, but its ink isn't evenly distributed: measured pixel
 * centroid sits at (306,265), not the geometric center (256,256), so centering
 * it by bounding box (what flex/align-center does) reads as shifted toward the
 * bottom-right, leaving a visible gap top-left — the classic "arrow/paper-plane
 * glyphs need optical, not geometric, centering" problem. viewBox pads only the
 * far side of each axis (no crop of the artwork) so bounding-box centering also
 * centers the ink; same fix is baked into public/email-icons/paperplane-navy.png. */
export function SendIcon({ size = 15, color = 'currentColor', style }: IconProps) {
  const n = Number(size)
  return (
    <svg width={n * (612.8 / 530.24)} height={n} viewBox="0 0 612.8 530.24" style={style}>
      <path fill={color} d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480l0-83.6c0-4 1.5-7.8 4.2-10.8L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z" />
    </svg>
  )
}
