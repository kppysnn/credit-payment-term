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

  const counts = {
    pending:   requests.filter(r => r.status === 'pending').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
  }

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
      {/* Notice banner — always the first thing on the page */}
      {currentUser.role === 'sales' && counts.rejected > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 4, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#7F1D1D' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>มี {counts.rejected} คำขอที่ถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่</span>
          <Button variant="secondary" size="sm" onClick={() => setSearchParams({ status: 'rejected' })}>ดูทั้งหมด</Button>
        </div>
      )}
      {currentUser.role === 'approver' && counts.pending > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 4, border: '1px solid #FCD34D', background: '#FFFBEB', color: '#92400E' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>มี {counts.pending} คำขอรอการพิจารณา</span>
          <Button variant="secondary" size="sm" onClick={() => setSearchParams({ status: 'pending' })}>ดูทั้งหมด</Button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ fontSize: 28 }}>รายการคำขอ</h1>
        {currentUser.role === 'sales' && (
          <Link to="/requests/new"><Button icon={<Plus size={15} />}>สร้างคำขอใหม่</Button></Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#586782' }}>สถานะ</span>
          <Select
            value={filterStatus}
            onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('status', e.target.value); return n })}
            style={{ width: 170 }}
          >
            <option value="">ทุกสถานะ</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(filterStatus || filterText) && (
            <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>ล้างตัวกรอง</Button>
          )}
          <div style={{ position: 'relative', width: 280 }}>
            <Input
              value={filterText}
              onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('q', e.target.value); return n })}
              placeholder="ค้นหา Request No., ลูกค้า..."
              style={{ paddingRight: 36 }}
            />
            <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#929EB4', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Table — no enclosing card/border, matching the WorkX host table */}
      {!loading && (
        <div style={{ fontSize: 12, color: '#586782' }}>
          แสดง {filtered.length} จาก {requests.length} รายการ
        </div>
      )}
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#586782' }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#586782' }}>ไม่พบคำขอ</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F2F2F2', borderBottom: '1px solid #D0D6DF' }}>
                {['คำขอ', 'ลูกค้า / โปรเจกต์', 'เซลล์', 'มูลค่ารวม', 'สถานะ', 'อัปเดต', ''].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: h === 'มูลค่ารวม' ? 'right' : 'left', fontWeight: 700, color: '#004081', fontSize: 12.5, whiteSpace: 'nowrap' }}>{h}</th>
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
                  <td style={{ padding: '12px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: '#004081', fontWeight: 700 }}>{req.requestNo}</div>
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: '#586782', marginTop: 2 }}>{req.proposalNo}</div>
                  </td>
                  <td style={{ padding: '12px 20px', verticalAlign: 'middle', maxWidth: 220 }}>
                    <div style={{ color: '#001122', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.customerName}</div>
                    <div style={{ color: '#586782', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.projectName}</div>
                  </td>
                  <td style={{ padding: '12px 20px', verticalAlign: 'middle', color: '#505050', fontSize: 12.5, whiteSpace: 'nowrap' }}>{req.salesName}</td>
                  <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: '#004081', whiteSpace: 'nowrap' }}>{formatCurrency(req.totalSelling)}</td>
                  <td style={{ padding: '12px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}><StatusBadge status={req.status} size="sm" /></td>
                  <td style={{ padding: '12px 20px', verticalAlign: 'middle', color: '#586782', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(req.updatedAt)}</td>
                  <td style={{ padding: '12px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {currentUser.role === 'sales' && (req.status === 'draft' || req.status === 'rejected' || req.status === 'pending') && (
                        <Link to={`/requests/${req.id}/edit`} onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={req.status === 'rejected' ? <RefreshCw size={13} /> : <Edit size={13} />}
                            aria-label="แก้ไขคำขอ"
                          />
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" icon={<Printer size={13} />} aria-label="พิมพ์ / Export PDF" onClick={e => handleExport(e, req.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
