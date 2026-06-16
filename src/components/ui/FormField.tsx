import type { CSSProperties, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface BaseProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children?: ReactNode
  style?: CSSProperties
}

export function FormGroup({ label, error, hint, required, children, style }: BaseProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: error ? '#DC2626' : '#4A5568' }}>
        {label}
        {required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: '#A0AEC0' }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: '#DC2626' }}>{error}</span>}
    </div>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: 14,
  color: '#1A202C',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
}

const errorStyle: React.CSSProperties = { borderColor: '#FCA5A5', background: '#FFF5F5' }

export function Input({
  error,
  style,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      {...props}
      style={{ ...inputBase, ...(error ? errorStyle : {}), ...style }}
      onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.12)' }}
      onBlur={e => { e.currentTarget.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
    />
  )
}

export function Select({
  error,
  style,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select
      {...props}
      style={{ ...inputBase, paddingRight: 32, appearance: 'none', background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A5568' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center`, ...(error ? errorStyle : {}), ...style }}
    >
      {children}
    </select>
  )
}

export function Textarea({
  error,
  style,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <textarea
      {...props}
      rows={rows}
      style={{ ...inputBase, height: 'auto', padding: '8px 12px', resize: 'vertical', ...(error ? errorStyle : {}), ...style }}
      onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.12)' }}
      onBlur={e => { e.currentTarget.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
    />
  )
}
