/**
 * Custom icon set exported directly from the Exzy_WorkX Figma file (node 1317:2565,
 * 730:25425) — these have no equivalent in any public icon library, so they're kept
 * as local SVGs rather than approximated, to match the host's thin-line icon style
 * exactly (chevron, search, sort caret, kebab menu).
 */
import type { CSSProperties } from 'react'

interface IconProps {
  size?: number
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
  return (
    <svg width={size / 4} height={size} viewBox="0 0 4 16" style={style}>
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
