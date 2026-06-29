import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequests, getRequestById, deleteRequest } from '../services/creditTermService'
import type { RequestListItem, RequestStatus } from '../types/request'
import { STATUS_LABELS } from '../types/request'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/FormField'
import { DatePicker } from '../../../components/ui/DatePicker'
import { KebabMenu, type KebabMenuItem } from '../../../components/ui/KebabMenu'
import { DeleteRequestModal } from '../../../components/modals/DeleteRequestModal'
import { SearchIcon, SortCarets, AddCircleIcon, EditIcon, RefreshIcon, PrinterIcon, TrashIcon, XMarkIcon } from '../../../components/icons/FigmaIcons'
import { formatCurrency } from '../utils/calculations'
import { formatDate } from '../utils/formatters'
import { exportPDF } from '../services/exportService'
import type { Request } from '../types/request'

const STATUSES: RequestStatus[] = ['draft', 'pending', 'approved', 'rejected', 'revised', 'cancelled']

type SortKey = 'requestNo' | 'customerName' | 'salesName' | 'totalSelling' | 'status' | 'updatedAt'

// Action column widened (10% -> 16%) to fit the rejected-row's own resubmit
// button alongside the kebab menu — taken from "ลูกค้า" and "อัปเดต", the
// two columns with the most slack.
const COLUMNS: { label: string; width: string; key?: SortKey }[] = [
  { label: 'คำขอ', width: '15%', key: 'requestNo' },
  { label: 'ลูกค้า', width: '18%', key: 'customerName' },
  { label: 'เซลล์', width: '15%', key: 'salesName' },
  { label: 'มูลค่ารวม', width: '13%', key: 'totalSelling' },
  { label: 'สถานะ', width: '12%', key: 'status' },
  { label: 'อัปเดต', width: '11%', key: 'updatedAt' },
  { label: '', width: '16%' },
]

// "อัปเดต" already shows updatedAt for every row (it defaults to createdAt on
// a never-edited request) — so filtering by that one column covers both
// "last edited" and "created" without a second field, matching the request.
// A single-day pick is just a range where from === to.
function matchesDateRange(iso: string, fromIso: string, toIso: string): boolean {
  const d = new Date(iso)
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const [fy, fm, fd] = fromIso.split('-').map(Number)
  const [ty, tm, td] = toIso.split('-').map(Number)
  return day >= new Date(fy, fm - 1, fd).getTime() && day <= new Date(ty, tm - 1, td).getTime()
}

// Matches the W+ Library "Tag/Small" component exactly (1049:411, "Edit"
// state) — not an invented chip style. 24px tall (was ~20px — too small to
// spot, per direct feedback), teal/100 bg (#D9F0F0, not a navy-tinted
// neutral), navy text, gray dismiss icon, 8px/4px asymmetric padding.
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 4px 0 8px', background: '#D9F0F0', color: '#004081', borderRadius: 4, fontSize: 12 }}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`ล้างตัวกรอง ${label}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#586782' }}
      >
        <XMarkIcon size={9} />
      </button>
    </span>
  )
}

export function RequestListPage() {
  const { currentUser } = useCurrentUser()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState<RequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Request | null>(null)

  const filterStatus = searchParams.get('status') ?? ''
  const filterText = searchParams.get('q') ?? ''
  const filterDateFrom = searchParams.get('dateFrom') ?? ''
  const filterDateTo = searchParams.get('dateTo') ?? ''

  const viewAll = currentUser.role === 'approver' || currentUser.role === 'accounting'

  function loadRequests() {
    getRequests(currentUser.id, viewAll).then(r => { setRequests(r); setLoading(false) })
  }

  useEffect(() => {
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  const counts = {
    pending:   requests.filter(r => r.status === 'pending').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
  }

  const filtered = requests.filter(r => {
    const matchStatus = !filterStatus || r.status === filterStatus
    const q = filterText.toLowerCase()
    const matchText = !q || [r.requestNo, r.customerName, r.proposalNo, r.salesName].some(s => s?.toLowerCase().includes(q))
    const matchDate = !filterDateFrom || matchesDateRange(r.updatedAt, filterDateFrom, filterDateTo || filterDateFrom)
    return matchStatus && matchText && matchDate
  })

  const sorted = [...filtered]
  if (sort) {
    sorted.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : sort.key === 'updatedAt'
          ? new Date(av as string).getTime() - new Date(bv as string).getTime()
          : String(av ?? '').localeCompare(String(bv ?? ''), 'th')
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }

  function toggleSort(key: SortKey) {
    setSort(prev => prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  async function handleExport(id: string) {
    const req = await getRequestById(id)
    if (req) exportPDF(req)
  }

  async function handleDeleteClick(id: string) {
    const req = await getRequestById(id)
    if (req) setDeleteTarget(req)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await deleteRequest(deleteTarget.id, currentUser)
    loadRequests()
  }

  const rejectedBanner = currentUser.role === 'sales' && counts.rejected > 0
  const pendingBanner = currentUser.role === 'approver' && counts.pending > 0
  const anyFilterActive = Boolean(filterStatus || filterText || filterDateFrom)
  // The attention banner ("you have N rejected/pending") and the active-filter
  // strip share one slot and are mutually exclusive: once any filter is on,
  // showing the banner too is redundant — you're already looking at exactly
  // what it would have taken you to. This also means the same clearly-labeled
  // "ดูคำขอทั้งหมด" exit is always in the same spot, however you got filtered
  // (banner click, status dropdown, search, or date picker).
  const showBanner = !anyFilterActive && (rejectedBanner || pendingBanner)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Credit & Payment Term</h1>
        {currentUser.role === 'sales' && (
          <Link to="/requests/new"><Button icon={<AddCircleIcon size={15} />}>สร้างคำขอใหม่</Button></Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Filter-bar labels are English/regular/#707070 in WorkX's own
                filter row (Exzy_WorkX 851:2542, "Month") — distinct from this
                module's usual Thai/600/#586782 form labels, which still apply
                everywhere else (FormGroup, FieldDisplay). Scoped to just this
                bar, not a general app-wide language change. */}
            <span style={{ fontSize: 16, fontWeight: 400, color: '#707070' }}>Status</span>
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
            <span style={{ fontSize: 16, fontWeight: 400, color: '#707070' }}>Date</span>
            <DatePicker
              startValue={filterDateFrom || null}
              endValue={filterDateTo || null}
              onChange={(from, to) => setSearchParams(p => {
                const n = new URLSearchParams(p)
                if (from) { n.set('dateFrom', from); n.set('dateTo', to ?? from) }
                else { n.delete('dateFrom'); n.delete('dateTo') }
                return n
              })}
              style={{ width: 190 }}
            />
          </div>
        </div>
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

      {/* Table block — matches the WorkX host's table pattern (Figma node
          730:25425) exactly: no outer border/box around the table at all, just
          a flat notice bar flush above it, separated only by a thin
          border-top divider. No count/title bar — Figma's table has none. */}
      <div style={{ background: '#FFFFFF' }}>
        {anyFilterActive ? (
          // Tags, not a status sentence — reads as "here's what you've
          // picked," not a system reporting its own state back at you.
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', flexWrap: 'wrap' }}>
            {filterStatus && (
              <FilterChip
                label={STATUS_LABELS[filterStatus as RequestStatus]}
                onRemove={() => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('status'); return n })}
              />
            )}
            {filterDateFrom && (
              <FilterChip
                label={(() => {
                  const fmt = (iso: string) => new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso))
                  return !filterDateTo || filterDateFrom === filterDateTo ? fmt(filterDateFrom) : `${fmt(filterDateFrom)} - ${fmt(filterDateTo)}`
                })()}
                onRemove={() => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('dateFrom'); n.delete('dateTo'); return n })}
              />
            )}
            {filterText && (
              <FilterChip
                label={`"${filterText}"`}
                onRemove={() => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('q'); return n })}
              />
            )}
            {[filterStatus, filterDateFrom, filterText].filter(Boolean).length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>ล้างทั้งหมด</Button>
            )}
          </div>
        ) : showBanner && (
          rejectedBanner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#FEF2F2', color: '#7F1D1D' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: 14, flex: 1 }}>มี {counts.rejected} คำขอที่ถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่</span>
              {/* secondary, not ghost — ghost is transparent with a
                  transparent border, invisible against a tinted banner bg
                  and unrecognizable as a button. secondary's solid white +
                  visible border reads as a real, clickable control here. */}
              <Button variant="secondary" size="sm" onClick={() => setSearchParams({ status: 'rejected' })}>ดูคำขอที่ถูกปฏิเสธ</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#FFFBEB', color: '#92400E' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: 14, flex: 1 }}>มี {counts.pending} คำขอที่รอคุณพิจารณา</span>
              <Button variant="secondary" size="sm" onClick={() => setSearchParams({ status: 'pending' })}>ดูคำขอที่รอพิจารณา</Button>
            </div>
          )
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#586782' }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#586782' }}>ไม่พบคำขอ</div>
        ) : (
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderTop: (showBanner || anyFilterActive) ? '1px solid #D0D6DF' : undefined }}>
                {COLUMNS.map(col => (
                  <th
                    key={col.label || col.key || 'actions'}
                    onClick={col.key ? () => toggleSort(col.key!) : undefined}
                    // Header cell padding matches body-row padding exactly (14px 20px) —
                    // the WorkX host's own table component (Exzy_WorkX 851:2649) uses one
                    // shared padding spec for header and body cells alike; don't let them drift.
                    style={{ width: col.width, padding: '14px 20px', textAlign: 'left', fontWeight: 400, color: '#004081', fontSize: 13, whiteSpace: 'nowrap', cursor: col.key ? 'pointer' : undefined, userSelect: 'none' }}
                  >
                    {col.label && (
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {col.label}
                        {col.key && <SortCarets sort={sort?.key === col.key ? sort.dir : undefined} />}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => navigate(`/requests/${req.id}`)}
                  className="data-row"
                  style={{ background: '#fff', transition: 'background 0.1s', cursor: 'pointer', borderTop: '1px solid #F2F6F8' }}
                >
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#004081', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.requestNo}</div>
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: '#929EB4', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.proposalNo}</div>
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#586782' }}>{req.customerName}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', color: '#505050', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.salesName}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'left', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#004081', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCurrency(req.totalSelling)}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <StatusBadge status={req.status} size="sm" subtitle={req.status === 'approved' ? req.approverName : undefined} />
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', color: '#586782', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(req.updatedAt)}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    {(() => {
                      const isSales = currentUser.role === 'sales'
                      const isRejected = req.status === 'rejected'
                      const canEdit = isSales && (req.status === 'draft' || req.status === 'pending' || isRejected)
                      // Edit/Print consolidated into one kebab menu (Exzy_WorkX
                      // 1317:2856 "option_dropdown" + 934:7551's dropdown list)
                      // — order is deliberate: the common, safe actions first,
                      // the one destructive action last and visually split off.
                      const kebabItems: KebabMenuItem[] = []
                      if (canEdit && !isRejected) {
                        kebabItems.push({ label: 'แก้ไข', icon: <EditIcon size={15} />, onClick: () => navigate(`/requests/${req.id}/edit`) })
                      }
                      kebabItems.push({ label: 'พิมพ์ / Export PDF', icon: <PrinterIcon size={15} />, onClick: () => handleExport(req.id) })
                      if (isSales && req.status === 'draft') {
                        kebabItems.push({ label: 'ลบคำขอ', icon: <TrashIcon size={15} />, onClick: () => handleDeleteClick(req.id), danger: true })
                      }

                      return (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Rejected requests get their own visible, labeled
                              button right in the row — not tucked in the
                              kebab — so "this one needs you to go fix it" is
                              unmissable, distinct from routine edit/print. */}
                          {canEdit && isRejected && (
                            <Link to={`/requests/${req.id}/edit`}>
                              <Button variant="secondary" size="sm" icon={<RefreshIcon size={14} />}>ส่งใหม่</Button>
                            </Link>
                          )}
                          <KebabMenu items={kebabItems} ariaLabel={`ตัวเลือกสำหรับ ${req.requestNo}`} />
                        </div>
                      )
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DeleteRequestModal
        open={deleteTarget !== null}
        request={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={confirmDelete}
      />
    </div>
  )
}
