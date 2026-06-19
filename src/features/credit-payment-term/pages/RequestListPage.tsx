import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequests } from '../services/creditTermService'
import type { RequestListItem, RequestStatus } from '../types/request'
import { STATUS_LABELS } from '../types/request'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/FormField'
import { formatCurrency } from '../utils/calculations'
import { formatDate } from '../utils/formatters'
import { Plus, Search, Edit, RefreshCw, Printer, FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { exportPDF } from '../services/exportService'
import { getRequestById } from '../services/creditTermService'

const STATUSES: RequestStatus[] = ['draft', 'pending', 'approved', 'rejected', 'revised', 'cancelled']

function StatCard({ label, count, icon, color, bg }: { label: string; count: number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '4px solid #D0D6DF',
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
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1, fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace' }}>
          {count}
        </div>
        <div style={{ fontSize: 12, color: '#586782', marginTop: 5, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

export function RequestListPage() {
  const { currentUser } = useCurrentUser()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState<RequestListItem[]>([])
  const [loading, setLoading] = useState(true)

  const filterStatus = searchParams.get('status') ?? ''
  const filterText = searchParams.get('q') ?? ''

  const viewAll = currentUser.role === 'approver' || currentUser.role === 'accounting'

  useEffect(() => {
    getRequests(currentUser.id, viewAll).then(r => { setRequests(r); setLoading(false) })
  }, [currentUser])

  const counts = {
    draft:     requests.filter(r => r.status === 'draft').length,
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
  }

  const statCards = currentUser.role === 'sales'
    ? [
        { label: 'แบบร่าง',     count: counts.draft,    icon: <FileText size={18} />,    color: '#586782', bg: '#F2F6F8' },
        { label: 'รออนุมัติ',   count: counts.pending,  icon: <Clock size={18} />,       color: '#92400E', bg: '#FFFBEB' },
        { label: 'อนุมัติแล้ว', count: counts.approved, icon: <CheckCircle size={18} />, color: '#166534', bg: '#F0FDF4' },
        { label: 'ไม่อนุมัติ', count: counts.rejected,  icon: <XCircle size={18} />,     color: '#7F1D1D', bg: '#FEF2F2' },
      ]
    : currentUser.role === 'approver'
    ? [
        { label: 'รออนุมัติ',   count: counts.pending,  icon: <Clock size={18} />,       color: '#92400E', bg: '#FFFBEB' },
        { label: 'อนุมัติแล้ว', count: counts.approved, icon: <CheckCircle size={18} />, color: '#166534', bg: '#F0FDF4' },
        { label: 'ไม่อนุมัติ', count: counts.rejected,  icon: <XCircle size={18} />,     color: '#7F1D1D', bg: '#FEF2F2' },
      ]
    : [
        { label: 'คำขอทั้งหมด',  count: requests.length, icon: <FileText size={18} />,    color: '#004081', bg: '#EBF4FF' },
        { label: 'อนุมัติแล้ว',  count: counts.approved, icon: <CheckCircle size={18} />, color: '#166534', bg: '#F0FDF4' },
        { label: 'ไม่อนุมัติ',   count: counts.rejected, icon: <XCircle size={18} />,     color: '#7F1D1D', bg: '#FEF2F2' },
        { label: 'รออนุมัติ',    count: counts.pending,  icon: <Clock size={18} />,       color: '#92400E', bg: '#FFFBEB' },
      ]

  const filtered = requests.filter(r => {
    const matchStatus = !filterStatus || r.status === filterStatus
    const q = filterText.toLowerCase()
    const matchText = !q || [r.requestNo, r.projectName, r.customerName, r.proposalNo, r.salesName].some(s => s?.toLowerCase().includes(q))
    return matchStatus && matchText
  })

  async function handleExport(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const req = await getRequestById(id)
    if (req) exportPDF(req)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>รายการคำขอ</h1>
          <p style={{ margin: '6px 0 0', color: '#586782', fontSize: 14 }}>สวัสดี, {currentUser.name}</p>
        </div>
        {currentUser.role === 'sales' && (
          <Link to="/requests/new"><Button icon={<Plus size={15} />}>สร้างคำขอใหม่</Button></Link>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statCards.length}, 1fr)`, gap: 14 }}>
        {statCards.map(sc => (
          <StatCard key={sc.label} {...sc} />
        ))}
      </div>

      {/* Alerts */}
      {currentUser.role === 'approver' && counts.pending > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, border: '1px solid #FCD34D', background: '#FFFBEB', color: '#92400E' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>มี {counts.pending} คำขอรอการพิจารณา</span>
          <Button variant="secondary" size="sm" onClick={() => setSearchParams({ status: 'pending' })}>ดูทั้งหมด</Button>
        </div>
      )}
      {currentUser.role === 'sales' && counts.rejected > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#7F1D1D' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>มี {counts.rejected} คำขอที่ถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่</span>
          <Button variant="secondary" size="sm" onClick={() => setSearchParams({ status: 'rejected' })}>ดูทั้งหมด</Button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: '#fff', border: '1px solid #D0D6DF', borderRadius: 10, padding: '12px 16px' }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Search size={15} style={{ color: '#A0AEC0', flexShrink: 0 }} />
          <Input
            value={filterText}
            onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('q', e.target.value); return n })}
            placeholder="ค้นหา Request No., Proposal No., ลูกค้า..."
            style={{ border: 'none', padding: '0 4px', boxShadow: 'none' }}
          />
        </div>
        <Select
          value={filterStatus}
          onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('status', e.target.value); return n })}
          style={{ width: 160 }}
        >
          <option value="">ทุกสถานะ</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
        {(filterStatus || filterText) && (
          <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>ล้างตัวกรอง</Button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '4px solid #D0D6DF', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#A0AEC0' }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#A0AEC0' }}>ไม่พบคำขอ</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
                {['Request No.', 'Proposal No.', 'ลูกค้า', 'Total Selling', 'สถานะ', 'อัปเดต', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#586782', fontSize: 11, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => navigate(`/requests/${req.id}`)}
                  className="data-row"
                  style={{ borderBottom: '1px solid #D0D6DF', background: '#fff', transition: 'background 0.1s', cursor: 'pointer' }}
                >
                  <td style={{ padding: '11px 14px', verticalAlign: 'middle', fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontSize: 12, color: '#004081', fontWeight: 600, whiteSpace: 'nowrap' }}>{req.requestNo}</td>
                  <td style={{ padding: '11px 14px', verticalAlign: 'middle', fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontSize: 12, color: '#505050' }}>{req.proposalNo}</td>
                  <td style={{ padding: '11px 14px', verticalAlign: 'middle', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#505050' }}>{req.customerName}</td>
                  <td style={{ padding: '11px 14px', verticalAlign: 'middle', fontFamily: 'JetBrains Mono, Noto Sans Thai, monospace', fontSize: 12, color: '#001122' }}>{formatCurrency(req.totalSelling)}</td>
                  <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}><StatusBadge status={req.status} size="sm" /></td>
                  <td style={{ padding: '11px 14px', verticalAlign: 'middle', color: '#929EB4', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(req.updatedAt)}</td>
                  <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {currentUser.role === 'sales' && (req.status === 'draft' || req.status === 'rejected' || req.status === 'pending') && (
                        <Link to={`/requests/${req.id}/edit`} onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" icon={req.status === 'rejected' ? <RefreshCw size={13} /> : <Edit size={13} />}>
                            แก้ไข
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" icon={<Printer size={13} />} onClick={e => handleExport(e, req.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #D0D6DF', fontSize: 12, color: '#929EB4', background: '#FAFBFC' }}>
            แสดง {filtered.length} จาก {requests.length} รายการ
          </div>
        )}
      </div>
    </div>
  )
}
