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
 * host table's "icon_sort" component (730:25586 etc.) exactly. */
export function SortCarets({ size = 7, activeColor = '#004081', inactiveColor = '#D0D6DF', sort }: { size?: number; activeColor?: string; inactiveColor?: string; sort?: 'asc' | 'desc' }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, marginLeft: 4 }}>
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
