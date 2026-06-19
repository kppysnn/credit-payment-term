import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_BASE: Record<Variant, CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)',
    color: '#F8F9FA',
    border: '4px solid #004081',
  },
  secondary: {
    background: 'linear-gradient(135deg, #EBF9F9 0%, #E8F2FC 100%)',
    color: '#004081',
    border: '4px solid #66C5C5',
  },
  danger: {
    background: 'linear-gradient(135deg, #FF8A80 0%, #D32F2F 100%)',
    color: '#FFFFFF',
    border: '4px solid #D32F2F',
  },
  ghost: {
    background: 'transparent',
    color: '#586782',
    border: '4px solid transparent',
  },
  success: {
    background: 'linear-gradient(135deg, #A8DD8C 0%, #4F9A3A 100%)',
    color: '#FFFFFF',
    border: '4px solid #4F9A3A',
  },
}

const VARIANT_HOVER: Record<Variant, CSSProperties> = {
  primary:   { filter: 'brightness(1.08)', boxShadow: '0 6px 20px rgba(0,64,129,0.18)', transform: 'translateY(-1px)' },
  secondary: { filter: 'brightness(0.97)', boxShadow: '0 4px 14px rgba(102,197,197,0.22)', transform: 'translateY(-1px)' },
  danger:    { filter: 'brightness(1.06)', boxShadow: '0 6px 20px rgba(211,47,47,0.22)', transform: 'translateY(-1px)' },
  ghost:     { background: 'rgba(102,197,197,0.10)', color: '#004081' },
  success:   { filter: 'brightness(1.06)', boxShadow: '0 6px 20px rgba(79,154,58,0.22)', transform: 'translateY(-1px)' },
}

const SIZE_STYLES: Record<Size, CSSProperties> = {
  sm: { padding: '0 12px', fontSize: '12px', height: '30px', gap: 5 },
  md: { padding: '0 18px', fontSize: '13.5px', height: '38px', gap: 6 },
  lg: { padding: '0 24px', fontSize: '14px', height: '44px', gap: 8 },
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  fullWidth,
  children,
  style,
  disabled,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: Props) {
  const sz = SIZE_STYLES[size]
  const base = VARIANT_BASE[variant]
  const hov = VARIANT_HOVER[variant]

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap as number,
        height: sz.height,
        padding: sz.padding as string,
        fontSize: sz.fontSize,
        fontWeight: 600,
        borderRadius: 16,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.15s, box-shadow 0.15s, transform 0.12s, filter 0.15s, border-color 0.15s, color 0.15s',
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'inherit',
        textDecoration: 'none',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        ...base,
        ...style,
      } as CSSProperties}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hov)
        }
        onMouseEnter?.(e)
      }}
      onMouseLeave={e => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, {
            filter: '',
            boxShadow: '',
            transform: '',
            background: (base.background as string) ?? '',
            borderColor: '',
            color: (base.color as string) ?? '',
          })
        }
        onMouseLeave?.(e)
      }}
    >
      {loading ? (
        <span style={{
          width: 13,
          height: 13,
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          display: 'inline-block',
          flexShrink: 0,
        }} />
      ) : icon}
      {children}
    </button>
  )
}
