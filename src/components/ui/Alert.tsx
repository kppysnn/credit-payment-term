import type { ReactNode } from 'react'
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'

type AlertType = 'warning' | 'info' | 'success' | 'error'

const CONFIG: Record<AlertType, { bg: string; border: string; color: string; Icon: typeof AlertTriangle }> = {
  warning: { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', Icon: AlertTriangle },
  info:    { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', Icon: Info },
  success: { bg: '#F0FDF4', border: '#86EFAC', color: '#14532D', Icon: CheckCircle },
  error:   { bg: '#FEF2F2', border: '#FCA5A5', color: '#7F1D1D', Icon: XCircle },
}

interface Props {
  type?: AlertType
  title?: string
  children: ReactNode
}

export function Alert({ type = 'info', title, children }: Props) {
  const { bg, border, color, Icon } = CONFIG[type]
  return (
    <div style={{ display: 'flex', gap: 10, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '12px 14px' }}>
      <Icon size={16} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 13, color }}>
        {title && <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>}
        {children}
      </div>
    </div>
  )
}
