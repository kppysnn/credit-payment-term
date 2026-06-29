import { useEffect, useRef, useState, type ReactNode } from 'react'
import { KebabIcon } from '../icons/FigmaIcons'

export interface KebabMenuItem {
  label: string
  icon: ReactNode
  onClick: () => void
  /** Visually separated (top rule) and colored danger-red — reserve for a
   * genuinely destructive action, and put it last so it's never the first
   * thing a thumb lands on. */
  danger?: boolean
}

interface Props {
  items: KebabMenuItem[]
  ariaLabel?: string
}

// Matches the Exzy_WorkX table row's own action menu exactly: a 32px
// "icon_Kbab" trigger (node 1317:2856) opening a white dropdown list (node
// 934:7551's "dropdown-travel back" structure: full-width rows, 16px/10px
// padding, Poppins Regular 14px/#707070) — recolored shadow to this app's
// navy-tinted convention instead of the literal black drop-shadow the
// Figma export uses.
export function KebabMenu({ items, ariaLabel = 'เมนู' }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#586782' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F2F6F8' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
      >
        <KebabIcon size={16} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 20,
          background: '#fff', border: '1px solid #D0D6DF', borderRadius: 4,
          boxShadow: '0 16px 34px rgba(0,64,129,0.10), 0 2px 6px rgba(0,64,129,0.06)',
          minWidth: 170, overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={e => { e.stopPropagation(); setOpen(false); item.onClick() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontFamily: 'inherit', textAlign: 'left',
                color: item.danger ? '#F3554F' : '#707070',
                borderTop: item.danger ? '1px solid #D0D6DF' : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F2F6F8' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
