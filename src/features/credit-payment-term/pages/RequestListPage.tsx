import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequests } from '../services/creditTermService'
import type { RequestListItem, RequestStatus } from '../types/request'
import { STATUS_LABELS } from '../types/request'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/FormField'
import { SearchIcon, SortCarets } from '../../../components/icons/FigmaIcons'
import { formatCurrency } from '../utils/calculations'
import { formatDate } from '../utils/formatters'
import { FiPlus, FiEdit2, FiRefreshCw, FiPrinter, FiAlertTriangle } from 'react-icons/fi'
import { exportPDF } from '../services/exportService'
import { getRequestById } from '../services/creditTermService'

const STATUSES: RequestStatus[] = ['draft', 'pending', 'approved', 'rejected', 'revised', 'cancelled']

const COLUMNS: [string, string][] = [
  ['คำขอ', '15%'], ['ลูกค้า', '22%'], ['เซลล์', '15%'], ['มูลค่ารวม', '13%'],
  ['สถานะ', '12%'], ['อัปเดต', '13%'], ['', '10%'],
]

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
    const matchText = !q || [r.requestNo, r.customerName, r.proposalNo, r.salesName].some(s => s?.toLowerCase().includes(q))
    return matchStatus && matchText
  })

  async function handleExport(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const req = await getRequestById(id)
    if (req) exportPDF(req)
  }

  const rejectedBanner = currentUser.role === 'sales' && counts.rejected > 0
  const pendingBanner = currentUser.role === 'approver' && counts.pending > 0
  const showBanner = rejectedBanner || pendingBanner

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ fontSize: 28 }}>รายการคำขอ</h1>
        {currentUser.role === 'sales' && (
          <Link to="/requests/new"><Button icon={<FiPlus size={15} />}>สร้างคำขอใหม่</Button></Link>
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
            <SearchIcon size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Table block — matches the WorkX host's table pattern (Figma node
          730:25425): an optional flat notice bar sits flush above the count/title
          bar and the table, all inside one bordered frame, no internal borders. */}
      <div style={{ border: '1px solid #D0D6DF', borderRadius: 4, overflow: 'hidden', background: '#FFFFFF' }}>
        {showBanner && (
          rejectedBanner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#FEF2F2', color: '#7F1D1D' }}>
              <FiAlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, flex: 1 }}>มี {counts.rejected} คำขอที่ถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่</span>
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({ status: 'rejected' })}>ดูทั้งหมด</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#FFFBEB', color: '#92400E' }}>
              <FiAlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, flex: 1 }}>มี {counts.pending} คำขอรอการพิจารณา</span>
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({ status: 'pending' })}>ดูทั้งหมด</Button>
            </div>
          )
        )}

        <div style={{ padding: '16px 20px', borderTop: showBanner ? '1px solid #D0D6DF' : undefined }}>
          {!loading && <span style={{ fontSize: 14, color: '#505050' }}>แสดง {filtered.length} จาก {requests.length} รายการ</span>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#586782' }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#586782' }}>ไม่พบคำขอ</div>
        ) : (
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {COLUMNS.map(([h, w]) => (
                  <th key={h} style={{ width: w, padding: '10px 20px', textAlign: 'left', fontWeight: 400, color: '#004081', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {h && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{h}<SortCarets /></span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => navigate(`/requests/${req.id}`)}
                  className="data-row"
                  style={{ background: '#fff', transition: 'background 0.1s', cursor: 'pointer' }}
                >
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#004081', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.requestNo}</div>
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: '#929EB4', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.proposalNo}</div>
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#001122' }}>{req.customerName}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', color: '#505050', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.salesName}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'left', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#004081', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCurrency(req.totalSelling)}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', whiteSpace: 'nowrap' }}><StatusBadge status={req.status} size="sm" /></td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', color: '#586782', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(req.updatedAt)}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {currentUser.role === 'sales' && (req.status === 'draft' || req.status === 'rejected' || req.status === 'pending') && (
                        <Link to={`/requests/${req.id}/edit`} onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={req.status === 'rejected' ? <FiRefreshCw size={15} /> : <FiEdit2 size={15} />}
                            aria-label="แก้ไขคำขอ"
                          />
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" icon={<FiPrinter size={15} />} aria-label="พิมพ์ / Export PDF" onClick={e => handleExport(e, req.id)} />
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
