import type { ReactNode, CSSProperties } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  style?: CSSProperties
  actions?: ReactNode
  noPad?: boolean
}

export function Card({ title, children, style, actions, noPad }: CardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #D0D6DF',
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s, transform 0.12s, border-color 0.15s',
        ...style,
      }}
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
    >
      {(title || actions) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid #D0D6DF',
          background: '#F2F6F8',
        }}>
          {title && (
            // Weight 500 (Medium), not 700 — matches Section.tsx and WorkX's
            // own text/title weight (confirmed Poppins Medium, never bold).
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#586782', letterSpacing: '-0.01em' }}>
              {title}
            </h3>
          )}
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      )}
      <div style={noPad ? undefined : { padding: 20 }}>{children}</div>
    </div>
  )
}

interface FieldProps {
  label: string
  value?: string | number | null
  mono?: boolean
  children?: ReactNode
  /** Business terms like "Default Credit Term" read better in their natural
   * Title Case than forced uppercase — opt out per-field, not globally. */
  preserveLabelCase?: boolean
  /** Most values stay at normal weight; reserve a heavier weight for values
   * that genuinely matter (reference numbers, key terms), per-field. */
  valueWeight?: number
}

export function FieldDisplay({ label, value, mono, children, preserveLabelCase, valueWeight }: FieldProps) {
  return (
    <div>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#586782',
        marginBottom: 4,
        letterSpacing: preserveLabelCase ? '0.01em' : '0.06em',
        textTransform: preserveLabelCase ? 'none' : 'uppercase',
      }}>
        {label}
      </div>
      {children ?? (
        <div style={{
          fontSize: 14,
          color: '#586782',
          fontWeight: valueWeight,
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
          lineHeight: 1.5,
        }}>
          {value ?? '—'}
        </div>
      )}
    </div>
  )
}

export function FieldGrid({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  // auto-fit instead of a hard column count: holds `cols` columns at typical
  // desktop widths but collapses to 2, then 1, as the container narrows —
  // no breakpoints needed, and it never overflows on a narrow screen.
  const minWidth = cols >= 3 ? 190 : 240
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`, gap: '16px 28px' }}>
      {children}
    </div>
  )
}
