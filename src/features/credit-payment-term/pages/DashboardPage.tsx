import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequests } from '../services/creditTermService'
import type { RequestListItem } from '../types/request'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { formatCurrency } from '../utils/calculations'
import { formatDate } from '../utils/formatters'
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

function StatCard({ label, count, icon, color, bg }: { label: string; count: number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #D0D6DF',
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'box-shadow 0.15s, transform 0.12s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,64,129,0.07)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.transform = ''
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>
          {count}
        </div>
        <div style={{ fontSize: 12, color: '#586782', marginTop: 5, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { currentUser } = useCurrentUser()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<RequestListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const viewAll = currentUser.role === 'approver' || currentUser.role === 'accounting'
    getRequests(currentUser.id, viewAll).then(r => { setRequests(r); setLoading(false) })
  }, [currentUser])

  const counts = {
    draft:     requests.filter(r => r.status === 'draft').length,
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  }

  const recent = requests.slice(0, 8)

  const statCards = currentUser.role === 'sales'
    ? [
        { label: 'แบบร่าง',    count: counts.draft,    icon: <FileText size={18} />,    color: '#586782', bg: '#F2F6F8' },
        { label: 'รออนุมัติ',  count: counts.pending,  icon: <Clock size={18} />,       color: '#92400E', bg: '#FFFBEB' },
        { label: 'อนุมัติแล้ว', count: counts.approved, icon: <CheckCircle size={18} />, color: '#166534', bg: '#F0FDF4' },
        { label: 'ไม่อนุมัติ', count: counts.rejected,  icon: <XCircle size={18} />,    color: '#7F1D1D', bg: '#FEF2F2' },
      ]
    : currentUser.role === 'approver'
    ? [
        { label: 'รออนุมัติ',  count: counts.pending,  icon: <Clock size={18} />,       color: '#92400E', bg: '#FFFBEB' },
        { label: 'อนุมัติแล้ว', count: counts.approved, icon: <CheckCircle size={18} />, color: '#166534', bg: '#F0FDF4' },
        { label: 'ไม่อนุมัติ', count: counts.rejected,  icon: <XCircle size={18} />,    color: '#7F1D1D', bg: '#FEF2F2' },
      ]
    : [
        { label: 'คำขอทั้งหมด', count: requests.length, icon: <FileText size={18} />,    color: '#004081', bg: '#EBF4FF' },
        { label: 'อนุมัติแล้ว',  count: counts.approved, icon: <CheckCircle size={18} />, color: '#166534', bg: '#F0FDF4' },
        { label: 'ไม่อนุมัติ',   count: counts.rejected, icon: <XCircle size={18} />,    color: '#7F1D1D', bg: '#FEF2F2' },
        { label: 'รออนุมัติ',    count: counts.pending,  icon: <Clock size={18} />,       color: '#92400E', bg: '#FFFBEB' },
      ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <p style={{ margin: '6px 0 0', color: '#586782', fontSize: 14 }}>สวัสดี, {currentUser.name}</p>
        </div>
        {currentUser.role === 'sales' && (
          <Link to="/requests/new" style={{ textDecoration: 'none' }}>
            <Button icon={<Plus size={15} />}>สร้างคำขอใหม่</Button>
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${statCards.length}, 1fr)`,
        gap: 14,
        marginBottom: 20,
      }}>
        {statCards.map(sc => (
          <StatCard key={sc.label} {...sc} />
        ))}
      </div>

      {/* Alerts */}
      {currentUser.role === 'approver' && counts.pending > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid #FCD34D',
          background: '#FFFBEB',
          color: '#92400E',
          marginBottom: 20,
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>มี {counts.pending} คำขอรอการพิจารณา</span>
          <Link to="/requests?status=pending" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm">ดูทั้งหมด</Button>
          </Link>
        </div>
      )}

      {currentUser.role === 'sales' && counts.rejected > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid #FCA5A5',
          background: '#FEF2F2',
          color: '#7F1D1D',
          marginBottom: 20,
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>มี {counts.rejected} คำขอที่ถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่</span>
          <Link to="/requests?status=rejected" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm">ดูทั้งหมด</Button>
          </Link>
        </div>
      )}

      {/* Recent requests */}
      <Card
        title="คำขอล่าสุด"
        noPad
        actions={
          <Link to="/requests" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="sm">ดูทั้งหมด</Button>
          </Link>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#929EB4' }}>กำลังโหลด...</div>
        ) : recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <FileText size={32} style={{ color: '#D0D6DF', display: 'block', margin: '0 auto 12px' }} />
            <div style={{ color: '#929EB4', fontSize: 14 }}>ยังไม่มีคำขอ</div>
            {currentUser.role === 'sales' && (
              <div style={{ marginTop: 16 }}>
                <Link to="/requests/new" style={{ textDecoration: 'none' }}>
                  <Button size="sm" icon={<Plus size={13} />}>สร้างคำขอแรก</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
                  {['Request No.', 'Project', 'ลูกค้า', 'Total Selling', 'Max Credit', 'สถานะ', 'อัปเดต'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#586782',
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(req => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/requests/${req.id}`)}
                    className="data-row"
                    style={{ borderBottom: '1px solid #D0D6DF', transition: 'background 0.1s', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#004081', fontWeight: 600, whiteSpace: 'nowrap' }}>{req.requestNo}</td>
                    <td style={{ padding: '11px 14px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#001122' }}>{req.projectName}</td>
                    <td style={{ padding: '11px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#505050' }}>{req.customerName}</td>
                    <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#001122' }}>{formatCurrency(req.totalSelling)}</td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: '#505050' }}>
                      {req.maxCreditTerm === 0 ? 'COD' : `Net ${req.maxCreditTerm}`}
                    </td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={req.status} size="sm" /></td>
                    <td style={{ padding: '11px 14px', color: '#929EB4', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(req.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
