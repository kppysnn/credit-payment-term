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

/** Pencil/edit — Figma's "icon_Edit" (937:1064), exact path. */
export function EditIcon({ size = 15, color = 'currentColor', style }: IconProps) {
  const n = Number(size)
  return (
    <svg width={n} height={n * (14.5 / 14.648)} viewBox="0 0 14.648 14.5" style={style}>
      <path d="M14.5016 1.43934C14.6969 1.6346 14.6969 1.95118 14.5016 2.14645L13.4587 3.18933L11.4587 1.18933L12.5016 0.146447C12.6969 -0.0488156 13.0134 -0.0488154 13.2087 0.146447L14.5016 1.43934Z" fill={color} />
      <path d="M12.7516 3.89644L10.7516 1.89644L3.93861 8.70943C3.88372 8.76432 3.84237 8.83123 3.81782 8.90487L3.01326 11.3186C2.94812 11.514 3.13405 11.6999 3.32949 11.6348L5.74317 10.8302C5.81681 10.8057 5.88372 10.7643 5.93861 10.7094L12.7516 3.89644Z" fill={color} />
      <path fillRule="evenodd" clipRule="evenodd" d="M0 13C0 13.8284 0.671573 14.5 1.5 14.5H12.5C13.3284 14.5 14 13.8284 14 13V7C14 6.72386 13.7761 6.5 13.5 6.5C13.2239 6.5 13 6.72386 13 7V13C13 13.2761 12.7761 13.5 12.5 13.5H1.5C1.22386 13.5 1 13.2761 1 13V2C1 1.72386 1.22386 1.5 1.5 1.5H8C8.27614 1.5 8.5 1.27614 8.5 1C8.5 0.723858 8.27614 0.5 8 0.5H1.5C0.671573 0.5 0 1.17157 0 2V13Z" fill={color} />
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

/** Mail-send (envelope + badge arrow) — Figma's "icon_Mail_send" (937:1093),
 * composited from its 3 exact layers (envelope, badge circle, mirrored arrow)
 * at their original relative positions within the 32px icon box. */
export function MailSendIcon({ size = 15, color = 'currentColor', style }: IconProps) {
  const n = Number(size)
  return (
    <svg width={n} height={n} viewBox="0 0 32 32" style={style}>
      <g transform="translate(8,10)">
        <path d="M15.8076 10.8564C15.6455 11.1985 15.3901 11.488 15.0703 11.6904C14.7502 11.893 14.3788 12.0001 14 12H2C1.62117 12.0004 1.24994 11.8928 0.929688 11.6904C0.609694 11.4882 0.353707 11.1994 0.191406 10.8574L6.76074 6.83008L8 7.58594L9.23828 6.8291L15.8076 10.8564ZM5.80273 6.24316L0 9.80078V2.69727L5.80273 6.24316ZM12.2891 4.96387C13.1927 5.61504 14.3011 6 15.5 6C15.6686 6 15.8353 5.99044 16 5.97559V9.80078L10.1973 6.24414V6.24316L12.2891 4.96387ZM10.0234 9.05562e-09C10.0086 0.164711 10 0.331424 10 0.5C10 1.96139 10.5712 3.28846 11.501 4.27344L8 6.41406L0.0498047 1.55469C0.15065 1.11308 0.398785 0.718968 0.75293 0.436523C1.1072 0.154019 1.54688 -3.04899e-05 2 9.05562e-09H10.0234Z" fill={color} />
      </g>
      <g transform="translate(19,6)">
        <circle cx="4.5" cy="4.5" r="4.5" fill={color} />
        <g transform="translate(8,2) scale(-1,1)">
          <path d="M0.471758 2.63102C0.528183 2.67938 0.603792 2.70645 0.682506 2.70645C0.76122 2.70645 0.83683 2.67938 0.893255 2.63102L1.94675 1.70256V4.73705C1.94623 4.77171 1.95358 4.80611 1.96839 4.83822C1.98319 4.87033 2.00515 4.8995 2.03296 4.924C2.06077 4.94851 2.09386 4.96786 2.1303 4.98091C2.16673 4.99396 2.20576 5.00044 2.24509 4.99998H2.77208C2.81141 5.00044 2.85044 4.99396 2.88687 4.98091C2.92331 4.96786 2.95641 4.94851 2.98422 4.924C3.01202 4.8995 3.03398 4.87033 3.04879 4.83822C3.06359 4.80611 3.07095 4.77171 3.07042 4.73705V1.69477L4.12392 2.62323C4.18034 2.6716 4.25595 2.69866 4.33467 2.69866C4.41338 2.69866 4.48899 2.6716 4.54542 2.62323L4.91441 2.29803C4.96929 2.2483 5 2.18167 5 2.1123C5 2.04293 4.96929 1.97629 4.91441 1.92656L2.89525 0.14705C2.84384 0.100581 2.78242 0.0636363 2.71459 0.0383867C2.64676 0.0131371 2.57388 9.21314e-05 2.50024 1.85852e-05C2.4265 -0.000555916 2.3534 0.0121944 2.28547 0.0374825C2.21753 0.0627707 2.15619 0.10006 2.10524 0.14705L0.0855895 1.92699C0.0307068 1.97672 0 2.04336 0 2.11273C0 2.1821 0.0307068 2.24874 0.0855895 2.29847L0.471758 2.63102Z" fill="white" />
        </g>
      </g>
    </svg>
  )
}
