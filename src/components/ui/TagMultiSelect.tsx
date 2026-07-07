import { useEffect, useRef, useState } from 'react'
import { XMarkIcon, CheckCircleIcon } from '../icons/FigmaIcons'

export interface TagOptionGroup {
  /** Section header shown above this group's items in the dropdown. */
  label: string
  items: string[]
}

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  groups: TagOptionGroup[]
  /** Appends a free-text "type your own" row after the preset groups, for
   * values that aren't in the list yet (e.g. a catch-all "Other" category). */
  allowCustom?: boolean
  customLabel?: string
  placeholder?: string
  error?: string
}

/** Email-"To"-field-style multi-select: picked values render as removable
 * tag chips inside the box (wrapping and growing the box as more are added,
 * no fixed cap), typing filters a categorized dropdown of the remaining
 * options. Tag visual spec matches the W+ Library "tag-small / Edit" component
 * (Figma 60RgjevWzbKhCCjoc5kcmk, node 1040:407) exactly: #D9F0F0 bg, #004081
 * text, 24px tall, 4px radius. */
export function TagMultiSelect({ value, onChange, groups, allowCustom, customLabel = 'Other', placeholder = 'เลือก solution', error }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [customText, setCustomText] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Closes on any click outside the box+dropdown — needed (rather than a
  // plain input onBlur) because the dropdown holds its own focusable controls
  // (item buttons, the custom-text input), and blur would fire while the
  // user is still interacting with those.
  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  function toggle(item: string) {
    onChange(value.includes(item) ? value.filter(v => v !== item) : [...value, item])
  }
  function remove(item: string) {
    onChange(value.filter(v => v !== item))
  }
  function addCustom() {
    const text = customText.trim()
    if (!text) return
    if (!value.includes(text)) onChange([...value, text])
    setCustomText('')
  }

  const q = query.trim().toLowerCase()
  const filteredGroups = groups
    .map(g => ({ ...g, items: q ? g.items.filter(i => i.toLowerCase().includes(q)) : g.items }))
    .filter(g => g.items.length > 0)
  const noMatches = q !== '' && filteredGroups.length === 0
  const showClearAll = value.length > 0

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', gap: 6,
          width: '100%', minHeight: 38, padding: '5px 8px',
          // Right padding reserves room for the clear-all button below so tags
          // never wrap underneath it.
          paddingRight: showClearAll ? 30 : 8,
          border: `1px solid ${error ? '#F3554F' : focused ? '#004081' : '#D0D6DF'}`,
          borderRadius: 8, background: '#fff', cursor: 'text', boxSizing: 'border-box',
          outline: focused ? '2px solid rgba(0,64,129,0.15)' : 'none', outlineOffset: 2,
          transition: 'border-color 0.15s, outline-color 0.15s',
        }}
      >
        {value.map(item => (
          <span key={item} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, height: 24,
            padding: '0 4px 0 8px', background: '#D9F0F0', borderRadius: 4,
            fontSize: 12, color: '#004081', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {item}
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); remove(item) }}
              aria-label={`นำ ${item} ออก`}
              style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 3, background: 'transparent', color: '#586782', cursor: 'pointer', padding: 0, flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,64,129,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <XMarkIcon size={9} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setFocused(true); setOpen(true) }}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            // Backspace on an empty search box pops the last tag — standard
            // email-chip-field affordance, so removing a tag doesn't always
            // require aiming for its tiny X button.
            if (e.key === 'Backspace' && query === '' && value.length > 0) remove(value[value.length - 1])
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          style={{ flex: 1, minWidth: 90, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#505050', fontFamily: 'inherit', padding: '4px 2px' }}
        />
      </div>

      {/* Clear-all — pinned to the box's top-right corner (not a flex sibling
       * of the tags) so it stays put as tags wrap onto more rows below it,
       * same "X replaces the trailing affordance" convention as DatePicker's
       * own clear button. */}
      {showClearAll && (
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); onChange([]); setQuery('') }}
          aria-label="ล้าง solution ทั้งหมด"
          title="ล้างทั้งหมด"
          style={{ position: 'absolute', top: 9, right: 8, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, background: 'transparent', color: '#586782', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F2F6F8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <XMarkIcon size={11} />
        </button>
      )}

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 6, background: '#fff', border: '1px solid #D0D6DF', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,64,129,0.07)', maxHeight: 300, overflowY: 'auto' }}>
          {noMatches && (
            <div style={{ padding: '14px 12px', fontSize: 13, color: '#929EB4', textAlign: 'center' }}>ไม่พบ solution ที่ค้นหา</div>
          )}
          {filteredGroups.map(g => (
            <div key={g.label}>
              <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.label}</div>
              {g.items.map(item => {
                const selected = value.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); toggle(item) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                      background: selected ? 'rgba(102,197,197,0.12)' : 'transparent', cursor: 'pointer',
                      fontSize: 13, color: selected ? '#004081' : '#505050', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = selected ? 'rgba(102,197,197,0.20)' : '#F2F6F8' }}
                    onMouseLeave={e => { e.currentTarget.style.background = selected ? 'rgba(102,197,197,0.12)' : 'transparent' }}
                  >
                    <span>{item}</span>
                    {selected && <CheckCircleIcon size={14} color="#66C5C5" />}
                  </button>
                )
              })}
            </div>
          ))}
          {allowCustom && (
            <div style={{ borderTop: filteredGroups.length > 0 ? '1px solid #F2F6F8' : 'none' }}>
              <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{customLabel}</div>
              <div style={{ display: 'flex', gap: 6, padding: '4px 12px 10px' }}>
                <input
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                  placeholder="พิมพ์ชื่อ solution แล้ว Enter"
                  style={{ flex: 1, height: 32, padding: '0 10px', border: '1px solid #D0D6DF', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#004081' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#D0D6DF' }}
                />
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); addCustom() }}
                  disabled={!customText.trim()}
                  style={{ height: 32, padding: '0 12px', border: 'none', borderRadius: 6, background: '#004081', color: '#fff', fontSize: 13, cursor: customText.trim() ? 'pointer' : 'not-allowed', opacity: customText.trim() ? 1 : 0.45, fontFamily: 'inherit' }}
                >
                  เพิ่ม
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
