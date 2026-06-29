import { useEffect, useRef, useState } from 'react'
import { ChevronIcon, XMarkIcon } from '../icons/FigmaIcons'

interface Props {
  value: string | null
  onChange: (iso: string | null) => void
  placeholder?: string
  style?: React.CSSProperties
}

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildGrid(monthDate: Date): Date[] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

// Matches the structure of WorkX's own calendar popover (Exzy_WorkX 72:5368)
// — prev/next month header, weekday row, 6x7 day grid, today/selected day
// treatment — but recolored to this app's actual brand tokens (navy/teal/
// Poppins) rather than the literal library-default neutrals (#14181F,
// #DCE0E5, Inter) the Figma export itself uses, which don't appear anywhere
// else in WorkX's real rendered UI. Simplified to single-day selection (no
// Cancel/Done footer) since this filters by one date, not a range.
export function DatePicker({ value, onChange, placeholder = 'เลือกวันที่', style }: Props) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => (value ? new Date(value) : new Date()))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selected = value ? new Date(value) : null
  const today = new Date()
  const label = selected
    ? new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(selected)
    : placeholder

  return (
    <div ref={rootRef} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 38, padding: '0 12px', border: '1px solid #D0D6DF', borderRadius: 8,
          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 14, fontFamily: 'inherit', color: selected ? '#505050' : '#586782', cursor: 'pointer', gap: 8,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {selected ? (
          <span
            role="button"
            aria-label="ล้างวันที่"
            onClick={e => { e.stopPropagation(); onChange(null) }}
            style={{ display: 'flex', flexShrink: 0, color: '#929EB4' }}
          >
            <XMarkIcon size={11} />
          </span>
        ) : (
          <ChevronIcon direction="down" size={10} color="#586782" style={{ flexShrink: 0 }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20,
          background: '#fff', border: '1px solid #D0D6DF', borderRadius: 8,
          boxShadow: '0 16px 34px rgba(0,64,129,0.10), 0 2px 6px rgba(0,64,129,0.06)',
          padding: 16, width: 280,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button
              type="button"
              aria-label="เดือนก่อนหน้า"
              onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              style={navBtnStyle}
            >
              <ChevronIcon direction="left" size={11} color="#001122" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#001122' }}>
              {new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long' }).format(viewMonth)}
            </span>
            <button
              type="button"
              aria-label="เดือนถัดไป"
              onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              style={navBtnStyle}
            >
              <ChevronIcon direction="right" size={11} color="#001122" />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 4 }}>
            {WEEKDAYS.map(w => (
              <span key={w} style={{ fontSize: 11, color: '#929EB4', padding: '4px 0' }}>{w}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {buildGrid(viewMonth).map(d => {
              const inMonth = d.getMonth() === viewMonth.getMonth()
              const isSelected = selected && sameDay(d, selected)
              const isToday = sameDay(d, today)
              return (
                <button
                  type="button"
                  key={d.toISOString()}
                  onClick={() => { onChange(toISODate(d)); setOpen(false) }}
                  style={{
                    height: 32,
                    border: !isSelected && isToday ? '1.5px solid #66C5C5' : '1.5px solid transparent',
                    borderRadius: 4,
                    background: isSelected ? '#004081' : 'transparent',
                    color: isSelected ? '#fff' : inMonth ? '#001122' : '#D0D6DF',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontWeight: isSelected || isToday ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F2F6F8' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #D0D6DF', borderRadius: 8, background: '#fff', cursor: 'pointer', padding: 0,
}
