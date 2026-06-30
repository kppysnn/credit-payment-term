import type { ReactNode } from 'react'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  disabled?: boolean
}

// A sliding switch, not a checkbox — for binary settings the user flips
// rather than items they select from a list (Checkbox stays for the latter).
// Track radius is 4px (--radius-md), matching every other control in the
// app — EXZY CI v3 retired the 9999px pill app-wide, including here; only
// the thumb keeps a small radius so it still reads as a sliding indicator.
export function Toggle({ checked, onChange, label, disabled }: Props) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13 }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
      <span
        aria-hidden
        style={{
          width: 36,
          height: 20,
          flexShrink: 0,
          borderRadius: 4,
          padding: 2,
          background: disabled ? '#D9D9D9' : checked ? '#66C5C5' : '#D0D6DF',
          display: 'flex',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: 2, background: '#FFFFFF', transition: 'margin 0.15s' }} />
      </span>
      {label && <span style={{ lineHeight: 1.4, color: disabled ? '#929EB4' : '#586782' }}>{label}</span>}
    </label>
  )
}
