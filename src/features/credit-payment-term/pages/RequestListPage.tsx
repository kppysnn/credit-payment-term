import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequests } from '../services/creditTermService'
import type { RequestListItem, RequestStatus } from '../types/request'
import { STATUS_LABELS, SALE_TYPE_LABELS } from '../types/request'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/FormField'
import { formatCurrency } from '../utils/calculations'
import { formatDate } from '../utils/formatters'
import { Plus, Search, Edit, RefreshCw, Printer } from 'lucide-react'
import { exportPDF } from '../services/exportService'
import { getRequestById } from '../services/creditTermService'

const STATUSES: RequestStatus[] = ['draft', 'pending', 'approved', 'rejected', 'revised', 'cancelled']

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>รายการคำขอ</h1>
        {currentUser.role === 'sales' && (
          <Link to="/requests/new"><Button icon={<Plus size={15} />}>สร้างคำขอใหม่</Button></Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: '#fff', border: '1px solid #D0D6DF', borderRadius: 10, padding: '12px 16px' }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Search size={15} style={{ color: '#A0AEC0', flexShrink: 0 }} />
          <Input
            value={filterText}
            onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('q', e.target.value); return n })}
            placeholder="ค้นหา Request No., Project, ลูกค้า..."
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
      <div style={{ background: '#fff', border: '1px solid #D0D6DF', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#A0AEC0' }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#A0AEC0' }}>ไม่พบคำขอ</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
                  {['Request No.', 'Proposal No.', 'Project Name', 'ลูกค้า', 'ประเภท', 'Total Selling', 'Gross Profit', 'Max Credit', 'งวด', 'สถานะ', 'Sales', 'อัปเดต', ''].map(h => (
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
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#004081', fontWeight: 600, whiteSpace: 'nowrap' }}>{req.requestNo}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#505050' }}>{req.proposalNo}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#001122' }}>{req.projectName}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#505050' }}>{req.customerName}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: 12, color: '#586782' }}>
                      {SALE_TYPE_LABELS[req.saleType]}
                    </td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#001122' }}>{formatCurrency(req.totalSelling)}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: req.grossProfit < 0 ? '#F3554F' : '#001122' }}>{formatCurrency(req.grossProfit)}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#505050' }}>Net {req.maxCreditTerm}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', textAlign: 'center', color: '#505050' }}>{req.installmentCount}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}><StatusBadge status={req.status} size="sm" /></td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', fontSize: 12, color: '#586782', whiteSpace: 'nowrap' }}>{req.salesName}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', color: '#929EB4', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(req.updatedAt)}</td>
                    <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {currentUser.role === 'sales' && (req.status === 'draft' || req.status === 'rejected') && (
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
          </div>
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
