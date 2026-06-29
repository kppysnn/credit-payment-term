import type { ReactNode, CSSProperties } from 'react'

interface SectionProps {
  title?: string
  children: ReactNode
  style?: CSSProperties
  actions?: ReactNode
}

// The airy alternative to <Card> for dividing a form/detail page into named
// groups — matches how WorkX's own multi-field forms do it (Exzy_WorkX "Edit
// My work", 1190:5406): a bold title + one thin rule underneath, no bordered
// box, no background fill. Reserve <Card> for places that want an actual
// boxed surface (e.g. a quotation block's colored header, a stat card);
// reach for <Section> anywhere the box was only ever there to say "this is
// the next group of fields" — which was true of every <Card> in this
// module's form and detail page before this pass.
export function Section({ title, children, style, actions }: SectionProps) {
  return (
    <div style={style}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 16, borderBottom: '1px solid #D0D6DF' }}>
          {/* Weight 500 (Medium), not 700 — WorkX's own text/title is Poppins
              Medium everywhere checked (page title, modal header); it never
              goes as heavy as bold. */}
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: '#586782', letterSpacing: '-0.01em' }}>{title}</h3>
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
