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
        // Error label color is #FF3028 — one shade brighter than the field
        // border's #F3554F. Confirmed against the W+ Library "Web Text field"
        // component (909:1107): text/error and stroke/error are two distinct
        // reds, not the same token reused. The required asterisk stays
        // #F3554F unconditionally either way (it never switches to #FF3028).
        // Weight 400, not 600 — that same component's own field-title header
        // is Poppins Regular, not semibold.
        <label style={{ fontSize: 12, fontWeight: 400, color: error ? '#FF3028' : '#586782' }}>
          {label}
          {required && <span style={{ color: '#F3554F', fontWeight: 700, fontSize: 14, marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: '#586782' }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: '#FF3028' }}>{error}</span>}
    </div>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  border: '1px solid #D0D6DF',
  // 8px — matches the W+ Library "Web Text field" component (909:1107)
  // exactly ("rounded-lg"). Not 4px: that was this module's own squared-radius
  // pass overshooting past what the real field component actually specifies.
  borderRadius: 8,
  fontSize: 14,
  color: '#505050',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, outline-color 0.15s',
  boxSizing: 'border-box',
}

// Error state is border-color only — Figma's own error field keeps a white
// background, never a red tint (confirmed against 909:1107's "error" variant).
const errorStyle: React.CSSProperties = { borderColor: '#F3554F' }
const disabledStyle: React.CSSProperties = { background: '#F2F6F8', color: '#929EB4', cursor: 'not-allowed' }

function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  // Navy, not teal — matches the W+ Library text field's "active" state
  // (909:1107) and the Select's existing navy focus exactly; an earlier
  // version of this file had Input/Textarea on a different (teal) focus
  // color than Select, which was the actual inconsistency.
  e.currentTarget.style.borderColor = '#004081'
  e.currentTarget.style.outline = '2px solid rgba(0,64,129,0.15)'
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
      // Matches the W+ Library "field-dropdown" component (926:425) exactly.
      // The chevron itself is the exact same glyph as FigmaIcons' <ChevronIcon
      // direction="down" /> (confirmed identical path data against 926:425's
      // own icon_chevron_down) — reproduced here as a static data-URI since a
      // native <select> can't render a React icon directly.
      style={{ ...inputBase, borderRadius: 8, paddingRight: 32, appearance: 'none', background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 14 14'%3E%3Cg transform='translate(7,7) rotate(90) translate(-4,-7)'%3E%3Cpath d='M1.52227 0L0 1.645L4.94467 7L0 12.355L1.52227 14L8 7L1.52227 0Z' fill='%23586782'/%3E%3C/g%3E%3C/svg%3E") no-repeat right 12px center`, ...(error ? errorStyle : {}), ...(disabled ? disabledStyle : {}), ...style }}
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
