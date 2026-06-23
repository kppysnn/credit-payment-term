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
        borderRadius: 14,
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
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#001122', letterSpacing: '-0.01em' }}>
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
}

export function FieldDisplay({ label, value, mono, children }: FieldProps) {
  return (
    <div>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#586782',
        marginBottom: 4,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {children ?? (
        <div style={{
          fontSize: 14,
          color: '#001122',
          fontFamily: mono ? 'JetBrains Mono, Noto Sans Thai, monospace' : undefined,
          lineHeight: 1.5,
        }}>
          {value ?? '—'}
        </div>
      )}
    </div>
  )
}

export function FieldGrid({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '16px 28px' }}>
      {children}
    </div>
  )
}
