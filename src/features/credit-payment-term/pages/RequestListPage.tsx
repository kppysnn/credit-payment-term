import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequests, getRequestById, deleteRequest, cancelRequest } from '../services/creditTermService'
import type { RequestListItem, RequestStatus } from '../types/request'
import { STATUS_LABELS } from '../types/request'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/FormField'
import { DatePicker } from '../../../components/ui/DatePicker'
import { KebabMenu, type KebabMenuItem } from '../../../components/ui/KebabMenu'
import { DeleteRequestModal } from '../../../components/modals/DeleteRequestModal'
import { CancelModal } from '../../../components/modals/CancelModal'
import { FaPenToSquare, FaCopy } from 'react-icons/fa6'
import { SearchIcon, SortCarets, AddCircleIcon, PrinterIcon, TrashIcon, XMarkIcon, BanIcon } from '../../../components/icons/FigmaIcons'
import { formatCurrency } from '../utils/calculations'
import { formatDate } from '../utils/formatters'
import { exportPDF } from '../services/exportService'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import type { Request } from '../types/request'

const STATUSES: RequestStatus[] = ['draft', 'pending', 'approved', 'rejected', 'cancelled']

type SortKey = 'requestNo' | 'customerName' | 'salesName' | 'totalSelling' | 'status' | 'updatedAt'

// Shared width for the table row's one-off action button — "แก้ไข" (rejected),
// "ยื่นอีกครั้ง" (cancelled) and "ดูรายละเอียด" (approver) only ever appear one
// at a time per row (mutually exclusive by role/status), but different label
// lengths made the column look uneven scrolling row to row. Fixing the width
// keeps every row's button the same size regardless of which one it is.
const ROW_ACTION_BTN_WIDTH = 132

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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 24, padding: '0 2px 0 8px', background: '#D9F0F0', color: '#004081', borderRadius: 4, fontSize: 12, flexShrink: 0 }}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`ล้างตัวกรอง ${label}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#586782', flexShrink: 0 }}
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
  // A pending request has already been submitted (and may be under active
  // approver review) — unlike a draft, it has real history worth keeping, so
  // "delete" for a pending row routes through the existing Cancel flow
  // (reason required, audit trail preserved) rather than a silent hard
  // delete. customerName comes from the row itself (already computed by
  // getRequests) instead of re-deriving it from the fetched Request.
  const [cancelTarget, setCancelTarget] = useState<{ request: Request; customerName: string } | null>(null)

  const { isMobile } = useBreakpoint()

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

  async function handleCancelClick(id: string, customerName: string) {
    const req = await getRequestById(id)
    if (req) setCancelTarget({ request: req, customerName })
  }

  async function handleDuplicateClick(id: string) {
    const req = await getRequestById(id)
    if (req) navigate('/requests/new', { state: { duplicateFrom: req } })
  }

  async function confirmCancel(reason: string) {
    if (!cancelTarget) return
    await cancelRequest(cancelTarget.request.id, reason, currentUser)
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

  // Build kebab items for a given row — shared between the table view (desktop)
  // and the card view (mobile). `hideDuplicate` lets a caller that already
  // renders its own dedicated "ยื่นอีกครั้ง" button (the desktop
  // table) drop it from the kebab too, same as the rejected-row "แก้ไข" button
  // below is never duplicated into the kebab either.
  function buildKebabItems(req: RequestListItem, opts?: { hideDuplicate?: boolean }): KebabMenuItem[] {
    const isSales = currentUser.role === 'sales'
    const isRejected = req.status === 'rejected'
    const canEdit = isSales && (req.status === 'draft' || req.status === 'pending' || isRejected)
    const items: KebabMenuItem[] = []
    if (canEdit && !isRejected) {
      items.push({ label: 'แก้ไข', icon: <FaPenToSquare size={15} />, onClick: () => navigate(`/requests/${req.id}/edit`) })
    }
    items.push({ label: 'พิมพ์', icon: <PrinterIcon size={15} />, onClick: () => handleExport(req.id) })
    if (isSales && req.status === 'draft') {
      items.push({ label: 'ลบคำขอ', icon: <TrashIcon size={15} />, onClick: () => handleDeleteClick(req.id), danger: true })
    }
    if (isSales && (req.status === 'pending' || req.status === 'approved')) {
      items.push({ label: 'ยกเลิกคำขอ', icon: <BanIcon size={15} />, onClick: () => handleCancelClick(req.id, req.customerName), danger: true })
    }
    if (isSales && req.status === 'cancelled' && !opts?.hideDuplicate) {
      items.push({ label: 'ยื่นอีกครั้ง', icon: <FaCopy size={15} />, onClick: () => handleDuplicateClick(req.id) })
    }
    return items
  }

  // Mobile card view for a single request row
  const renderCard = (req: RequestListItem) => {
    const isSales = currentUser.role === 'sales'
    const isRejected = req.status === 'rejected'
    const canEdit = isSales && (req.status === 'draft' || req.status === 'pending' || isRejected)
    const kebabItems = buildKebabItems(req)

    return (
      <div
        key={req.id}
        className="req-card"
        onClick={() => navigate(`/requests/${req.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/requests/${req.id}`) }}
        aria-label={`คำขอ ${req.requestNo}`}
      >
        {/* Top row: request number + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <div>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: '#004081' }}>{req.requestNo}</div>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: '#586782', marginTop: 2 }}>{req.proposalNo}</div>
          </div>
          {/* No version chip here (unlike the detail page) — keeping the
              list rows to just the status keeps the table calmer; the
              resubmission detail is one click away. */}
          <StatusBadge status={req.status} size="sm" subtitle={req.status === 'approved' ? req.approverName : undefined} />
        </div>

        {/* Customer + sales */}
        <div style={{ fontSize: 13, color: '#586782', marginBottom: 2 }}>{req.customerName}</div>
        <div style={{ fontSize: 12, color: '#929EB4', marginBottom: 8 }}>{req.salesName}</div>

        {/* Amount + date + actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 600, color: '#004081' }}>
            {formatCurrency(req.totalSelling)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#586782' }}>{formatDate(req.updatedAt)}</span>
            {canEdit && isRejected && (
              <Link to={`/requests/${req.id}/edit`} onClick={e => e.stopPropagation()}>
                <Button
                  variant="primary" size="sm" icon={<FaPenToSquare size={14} />}
                  style={{ background: '#004081' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#004081' }}
                >
                  แก้ไข
                </Button>
              </Link>
            )}
            <KebabMenu items={kebabItems} ariaLabel={`ตัวเลือกสำหรับ ${req.requestNo}`} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Title + New Request — stack on mobile */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: 12,
      }}>
        <h1 className="page-title">Credit & Payment Term</h1>
        {currentUser.role === 'sales' && (
          <Link to="/requests/new" style={isMobile ? { width: '100%' } : {}}>
            <Button icon={<AddCircleIcon size={15} />} style={isMobile ? { width: '100%', justifyContent: 'center' } : {}}>
              สร้างคำขอใหม่
            </Button>
          </Link>
        )}
      </div>

      {/* Filters — on mobile: column layout, full width */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 12,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Filter-bar labels match WorkX's own filter row (Exzy_WorkX 851:2542) —
                English text, regular weight, same #586782 as other labels but
                lighter-feeling due to font size 16px context. */}
            <span style={{ fontSize: 16, fontWeight: 400, color: '#586782', flexShrink: 0 }}>Status</span>
            <Select
              value={filterStatus}
              onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('status', e.target.value); return n })}
              style={{ flex: 1, minWidth: 0, width: isMobile ? undefined : 170 }}
            >
              <option value="">ทุกสถานะ</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 400, color: '#586782', flexShrink: 0 }}>Date</span>
            <DatePicker
              startValue={filterDateFrom || null}
              endValue={filterDateTo || null}
              onChange={(from, to) => setSearchParams(p => {
                const n = new URLSearchParams(p)
                if (from) { n.set('dateFrom', from); n.set('dateTo', to ?? from) }
                else { n.delete('dateFrom'); n.delete('dateTo') }
                return n
              })}
              style={{ flex: 1, minWidth: 0, width: isMobile ? undefined : 190 }}
            />
          </div>
        </div>
        <div style={{ position: 'relative', width: isMobile ? '100%' : 280 }}>
          <Input
            value={filterText}
            onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('q', e.target.value); return n })}
            placeholder="ค้นหา Request No., ลูกค้า..."
            style={{ paddingRight: 36, width: '100%' }}
          />
          <SearchIcon size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Table block — matches the WorkX host's table pattern (Figma node
          730:25425) exactly: no outer border/box around the table at all, just
          a flat notice bar flush above it, separated only by a thin
          border-top divider. No count/title bar — Figma's table has none.
          On mobile this becomes a card list. */}
      <div style={{ background: '#FFFFFF' }}>
        {anyFilterActive ? (
          // Tags, not a status sentence — reads as "here's what you've
          // picked," not a system reporting its own state back at you.
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FEF2F2', color: '#7F1D1D', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: 14, flex: 1, minWidth: 140 }}>มี {counts.rejected} คำขอที่ถูกปฏิเสธ — กรุณาแก้ไขและส่งใหม่</span>
              {/* secondary, not ghost — ghost is transparent with a
                  transparent border, invisible against a tinted banner bg
                  and unrecognizable as a button. secondary's solid white +
                  visible border reads as a real, clickable control here. */}
              <Button variant="secondary" size="sm" onClick={() => setSearchParams({ status: 'rejected' })}>ดูคำขอที่ถูกปฏิเสธ</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FFFBEB', color: '#92400E', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: 14, flex: 1, minWidth: 140 }}>มี {counts.pending} คำขอที่รอคุณพิจารณา</span>
              <Button variant="secondary" size="sm" onClick={() => setSearchParams({ status: 'pending' })}>ดูคำขอที่รอพิจารณา</Button>
            </div>
          )
        )}

        {loading ? (
          isMobile ? (
            // Mobile skeleton
            <div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="req-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="skeleton" style={{ width: 120, height: 14 }} />
                      <div className="skeleton" style={{ width: 80, height: 11 }} />
                    </div>
                    <div className="skeleton" style={{ width: 60, height: 20 }} />
                  </div>
                  <div className="skeleton" style={{ width: '70%', height: 13, marginBottom: 4 }} />
                  <div className="skeleton" style={{ width: '50%', height: 11, marginBottom: 10 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton" style={{ width: 100, height: 13 }} />
                    <div className="skeleton" style={{ width: 60, height: 11 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.label || col.key || 'actions'} style={{ width: col.width, padding: '14px 20px', textAlign: 'left', fontWeight: 400, color: '#004081', fontSize: 13 }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #F2F6F8' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div className="skeleton" style={{ width: '80%', height: 13, marginBottom: 6 }} />
                      <div className="skeleton" style={{ width: '55%', height: 11 }} />
                    </td>
                    {[70, 60, 80, 55, 65].map((w, j) => (
                      <td key={j} style={{ padding: '14px 20px' }}>
                        <div className="skeleton" style={{ width: `${w}%`, height: 13 }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filtered.length === 0 ? (
          anyFilterActive ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="19" stroke="#D0D6DF" strokeWidth="2"/><path d="M13 20h14M20 13v14" stroke="#D0D6DF" strokeWidth="2" strokeLinecap="round" transform="rotate(45 20 20)"/></svg>
              <div style={{ fontSize: 14, color: '#586782', fontWeight: 500 }}>ไม่พบคำขอที่ตรงกับเงื่อนไขนี้</div>
              <div style={{ fontSize: 12, color: '#929EB4' }}>ลองเปลี่ยน filter หรือล้างเงื่อนไขออก</div>
              <Button variant="secondary" size="sm" onClick={() => setSearchParams({})}>ล้าง filter ทั้งหมด</Button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="10" width="32" height="28" rx="3" stroke="#D0D6DF" strokeWidth="2"/><path d="M16 20h16M16 27h10" stroke="#D0D6DF" strokeWidth="2" strokeLinecap="round"/><path d="M24 2v8M20 4l4-4 4 4" stroke="#66C5C5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div style={{ fontSize: 15, color: '#586782', fontWeight: 500 }}>ยังไม่มีคำขออนุมัติ</div>
              {currentUser.role === 'sales' ? (
                <>
                  <div style={{ fontSize: 13, color: '#929EB4' }}>สร้างคำขอแรกเพื่อเริ่มกระบวนการอนุมัติ Credit &amp; Payment Term</div>
                  <Link to="/requests/new"><Button icon={<AddCircleIcon size={15} />}>สร้างคำขอแรก</Button></Link>
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#929EB4' }}>คำขอที่รอพิจารณาจะปรากฏที่นี่เมื่อ Sales ส่งคำขอเข้ามา</div>
              )}
            </div>
          )
        ) : isMobile ? (
          // ── Mobile: card list ──────────────────────────────────────
          <div>
            {sorted.map(req => renderCard(req))}
          </div>
        ) : (
          // ── Desktop: table ─────────────────────────────────────────
          <div style={{ overflowX: 'auto' }}>
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
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requests/${req.id}`) } }}
                  tabIndex={0}
                  aria-label={`คำขอ ${req.requestNo}`}
                  className="data-row"
                  style={{ background: '#fff', transition: 'background 0.1s', cursor: 'pointer', borderTop: '1px solid #F2F6F8' }}
                >
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#004081', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.requestNo}</div>
                    {/* #586782 (token), not #929EB4 — this is real text
                        (proposal number), not a decorative/non-text element;
                        #929EB4 measures 2.7:1 on white, below WCAG AA's
                        4.5:1 minimum for body text. */}
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: '#586782', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.proposalNo}</div>
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#586782' }}>{req.customerName}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', color: '#505050', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.salesName}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'left', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#004081', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCurrency(req.totalSelling)}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {/* No version chip here (unlike the detail page) — keeping
                        the list rows to just the status keeps the table
                        calmer; the resubmission detail is one click away. */}
                    <StatusBadge status={req.status} size="sm" subtitle={req.status === 'approved' ? req.approverName : undefined} />
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', color: '#586782', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(req.updatedAt)}</td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    {(() => {
                      const isSales = currentUser.role === 'sales'
                      const isApprover = currentUser.role === 'approver'
                      const isRejected = req.status === 'rejected'
                      const isCancelled = req.status === 'cancelled'
                      const canEdit = isSales && (req.status === 'draft' || req.status === 'pending' || isRejected)
                      const canDuplicate = isSales && isCancelled
                      // Edit/Print consolidated into one kebab menu (Exzy_WorkX
                      // 1317:2856 "option_dropdown" + 934:7551's dropdown list)
                      // — order is deliberate: the common, safe actions first,
                      // the one destructive action last and visually split off.
                      const kebabItems = buildKebabItems(req, { hideDuplicate: canDuplicate })

                      return (
                        <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Rejected requests get their own visible, labeled
                              button right in the row — not tucked in the
                              kebab — so "this one needs you to go fix it" is
                              unmissable, distinct from routine print. Solid
                              navy (#004081, W+ Library "button/primary" —
                              909:1125), not the app's usual teal-navy
                              gradient — a deliberate one-off per Figma, not a
                              change to Button's shared primary variant. */}
                          {canEdit && isRejected && (
                            <Link to={`/requests/${req.id}/edit`}>
                              {/* Button's own mouseleave handler always resets
                                  background to the primary variant's gradient
                                  (hardcoded, ignores any style override) — so
                                  the solid-navy fill has to be re-asserted on
                                  leave too, not just set once on mount. */}
                              <Button
                                variant="primary" size="sm" icon={<FaPenToSquare size={14} />}
                                style={{ background: '#004081', minWidth: ROW_ACTION_BTN_WIDTH }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#004081' }}
                              >
                                แก้ไข
                              </Button>
                            </Link>
                          )}
                          {/* Cancelled requests get the same visible-button
                              treatment as rejected — the one useful action
                              left on a dead-end row shouldn't be buried in
                              the kebab. Solid navy (#004081), not the page-level
                              teal-navy gradient: the gradient is reserved for a
                              single primary CTA per page (e.g. "สร้างคำขอใหม่"
                              above); repeated per-row in a table it read as too
                              loud. Same solid-navy override as the rejected
                              row's "แก้ไข" button, and matches the detail page's
                              own duplicate button (RequestDetailPage.tsx) —
                              same action, same look. */}
                          {canDuplicate && (
                            <Button
                              size="sm" icon={<AddCircleIcon size={14} />}
                              style={{ background: '#004081', minWidth: ROW_ACTION_BTN_WIDTH }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#004081' }}
                              onClick={() => handleDuplicateClick(req.id)}
                            >
                              ยื่นอีกครั้ง
                            </Button>
                          )}
                          {/* Approver rows have no kebab actions at all (only
                              sales gets edit/duplicate/delete/cancel items) —
                              clicking anywhere on the row already opens the
                              detail page, but that wasn't obvious/discoverable
                              enough on its own, so make the click target an
                              explicit, always-visible button instead. Secondary
                              (not the solid-navy above): this shows on every
                              single row for an approver, not just a one-off
                              status, so it should read as routine navigation,
                              not a special call to action. */}
                          {isApprover && (
                            <Link to={`/requests/${req.id}`}>
                              <Button
                                variant="secondary" size="sm"
                                style={{ minWidth: ROW_ACTION_BTN_WIDTH }}
                              >
                                ดูรายละเอียด
                              </Button>
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
          </div>
        )}
      </div>

      <DeleteRequestModal
        open={deleteTarget !== null}
        request={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={confirmDelete}
      />

      <CancelModal
        open={cancelTarget !== null}
        request={cancelTarget?.request ?? null}
        customerName={cancelTarget?.customerName}
        onClose={() => setCancelTarget(null)}
        onCancel={confirmCancel}
      />
    </div>
  )
}
