import type { CSSProperties, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface BaseProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  children?: ReactNode
  style?: CSSProperties
}

export function FormGroup({ label, error, hint, required, children, style }: BaseProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: error ? '#F3554F' : '#586782' }}>
          {label}
          {required && <span style={{ color: '#F3554F', fontWeight: 700, fontSize: 14, marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: '#586782' }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: '#F3554F' }}>{error}</span>}
    </div>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  border: '1px solid #D0D6DF',
  borderRadius: 4,
  fontSize: 14,
  color: '#505050',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, outline-color 0.15s',
  boxSizing: 'border-box',
}

const errorStyle: React.CSSProperties = { borderColor: '#F3554F', background: '#FEF2F2' }
const disabledStyle: React.CSSProperties = { background: '#F2F6F8', color: '#929EB4', cursor: 'not-allowed' }

function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = '#66C5C5'
  e.currentTarget.style.outline = '2px solid rgba(102,197,197,0.6)'
  e.currentTarget.style.outlineOffset = '2px'
}
function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, error?: string) {
  e.currentTarget.style.borderColor = error ? '#F3554F' : '#D0D6DF'
  e.currentTarget.style.outline = 'none'
}

export function Input({
  error,
  style,
  disabled,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      {...props}
      disabled={disabled}
      aria-invalid={!!error}
      style={{ ...inputBase, ...(error ? errorStyle : {}), ...(disabled ? disabledStyle : {}), ...style }}
      onFocus={handleFocus}
      onBlur={e => handleBlur(e, error)}
    />
  )
}

function handleSelectFocus(e: React.FocusEvent<HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#004081'
  e.currentTarget.style.outline = '2px solid rgba(0,64,129,0.15)'
  e.currentTarget.style.outlineOffset = '2px'
}
function handleSelectBlur(e: React.FocusEvent<HTMLSelectElement>, error?: string) {
  e.currentTarget.style.borderColor = error ? '#F3554F' : '#D0D6DF'
  e.currentTarget.style.outline = 'none'
}

export function Select({
  error,
  style,
  children,
  disabled,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select
      {...props}
      disabled={disabled}
      aria-invalid={!!error}
      // Matches the W+ Library "field-dropdown" component (926:425) exactly:
      // 8px radius (not 4px, like Input) and a navy focus border (not teal).
      style={{ ...inputBase, borderRadius: 8, paddingRight: 32, appearance: 'none', background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23586782' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center`, ...(error ? errorStyle : {}), ...(disabled ? disabledStyle : {}), ...style }}
      onFocus={handleSelectFocus}
      onBlur={e => handleSelectBlur(e, error)}
    >
      {children}
    </select>
  )
}

export function Textarea({
  error,
  style,
  rows = 3,
  disabled,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <textarea
      {...props}
      disabled={disabled}
      aria-invalid={!!error}
      rows={rows}
      style={{ ...inputBase, height: 'auto', padding: '8px 12px', resize: 'vertical', ...(error ? errorStyle : {}), ...(disabled ? disabledStyle : {}), ...style }}
      onFocus={handleFocus}
      onBlur={e => handleBlur(e, error)}
    />
  )
}
