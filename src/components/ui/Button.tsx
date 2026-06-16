import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'background:#1E3A5F;color:#fff;border-color:#1E3A5F',
  secondary: 'background:#fff;color:#4A5568;border-color:#E2E8F0',
  danger: 'background:#DC2626;color:#fff;border-color:#DC2626',
  ghost: 'background:transparent;color:#4A5568;border-color:transparent',
  success: 'background:#16A34A;color:#fff;border-color:#16A34A',
}


const SIZE_STYLES: Record<Size, { padding: string; fontSize: string; height: string }> = {
  sm: { padding: '0 12px', fontSize: '12px', height: '30px' },
  md: { padding: '0 16px', fontSize: '14px', height: '36px' },
  lg: { padding: '0 20px', fontSize: '14px', height: '42px' },
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
  ...rest
}: Props) {
  const sz = SIZE_STYLES[size]
  const variantStyle = Object.fromEntries(
    VARIANT_STYLES[variant].split(';').map(s => {
      const [k, v] = s.split(':')
      return [k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()), v?.trim()]
    }),
  )

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: sz.height,
        padding: sz.padding,
        fontSize: sz.fontSize,
        fontWeight: 500,
        borderRadius: 8,
        border: '1px solid',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'background 0.15s, opacity 0.15s',
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'inherit',
        ...variantStyle,
        ...style,
      } as React.CSSProperties}
    >
      {loading ? (
        <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
      ) : icon}
      {children}
    </button>
  )
}
