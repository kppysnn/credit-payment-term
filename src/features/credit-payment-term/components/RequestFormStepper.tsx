import { useState, useEffect, useRef } from 'react'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import type { Request } from '../types/request'
import type { CurrentUser } from '../types/user'
import type { Customer, CustomerType } from '../types/customer'
import { CUSTOMER_TYPE_LABELS } from '../types/customer'
import { type SaleType, type PaymentCondition } from '../types/request'
import { Section } from '../../../components/ui/Section'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Toggle } from '../../../components/ui/Toggle'
import { Modal } from '../../../components/ui/Modal'
import { FormGroup, Input, Select } from '../../../components/ui/FormField'
import { formatCurrency, calcInstallmentAmount, calcTotalInstallmentPercent } from '../utils/calculations'
import { searchCustomers } from '../services/customerService'
import { FaFloppyDisk } from 'react-icons/fa6'
import { XMarkIcon } from '../../../components/icons/FigmaIcons'

interface InstRow { installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: PaymentCondition | '' }

interface Props {
  initialRequest?: Request
  currentUser: CurrentUser
  onSaveDraft: (data: Record<string, unknown>) => Promise<void>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onResubmit?: (data: Record<string, unknown>) => Promise<void>
  isResubmit?: boolean
  isPendingEdit?: boolean
}

const SALE_TYPES = [
  { value: 'hardware', label: 'Quotation เดียว', desc: 'Hardware หรือ Software ในใบเดียว' },
  { value: 'hardware_software_installation', label: 'แยก Quotation', desc: 'Hardware แยกจาก Software & Installation' },
  { value: 'lump_sum', label: 'Lump Sum', desc: 'รวมทุกรายการ ไม่แยกใบ' },
]
const CUSTOMER_TYPES: CustomerType[] = ['new', 'existing', 'reseller']
const CREDIT_TERM_PRESETS = [7, 15, 30, 60, 90, 120]
const CREDIT_TERM_HINTS: Record<number, string> = { 7: '1 สัปดาห์', 15: '15 วัน', 30: '1 เดือน', 60: '2 เดือน', 90: '3 เดือน', 120: '4 เดือน' }
const INSTALLMENT_COUNT_PRESETS = [1, 2, 3, 4, 6, 12, 24, 36]
const MAX_INSTALLMENTS = 360 // 30 years monthly — a ceiling against stray input, not a realistic expectation
const INSTALLMENT_PRESETS: Record<number, Array<{ label: string; percents: number[] }>> = {
  1: [{ label: '100', percents: [100] }],
  2: [
    { label: '50 / 50', percents: [50, 50] },
    { label: '60 / 40', percents: [60, 40] },
    { label: '30 / 70', percents: [30, 70] },
    { label: '70 / 30', percents: [70, 30] },
  ],
  3: [
    { label: '30 / 40 / 30', percents: [30, 40, 30] },
    { label: '50 / 30 / 20', percents: [50, 30, 20] },
    { label: '30 / 30 / 40', percents: [30, 30, 40] },
    { label: '40 / 30 / 30', percents: [40, 30, 30] },
  ],
  4: [
    { label: '25 / 25 / 25 / 25', percents: [25, 25, 25, 25] },
    { label: '40 / 20 / 20 / 20', percents: [40, 20, 20, 20] },
    { label: '20 / 30 / 30 / 20', percents: [20, 30, 30, 20] },
    { label: '30 / 20 / 20 / 30', percents: [30, 20, 20, 30] },
  ],
}

function numVal(v: unknown): number { return Number(v) || 0 }

// Even split across n installments. The last one absorbs whatever rounding
// remainder is left over (e.g. 3 installments -> 33.33/33.33/33.34) so the
// total always lands on exactly 100%, never 99.99 or 100.01.
function equalSplitPercents(n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(10000 / n) / 100
  const percents = Array(n).fill(base)
  percents[n - 1] = Math.round((100 - base * (n - 1)) * 100) / 100
  return percents
}

// UNIFORM_MODE (true) = one shared Credit Term value applied to every
// installment. CUSTOM_MODE (false) = each installment carries its own day
// count. True once a request's saved installments actually carry different
// credit terms — lets the form re-derive which mode to start in on edit-load
// instead of needing a separate persisted flag (the per-row value already
// exists in PaymentInstallment.creditTermDays regardless of mode).
function isCreditTermUniform(installments?: Array<{ creditTermDays: number }>): boolean {
  if (!installments || installments.length < 2) return true
  return new Set(installments.map(i => i.creditTermDays)).size <= 1
}

function formatThousands(v: unknown): string {
  if (v === '' || v === undefined || v === null) return ''
  const n = Number(v)
  return Number.isNaN(n) ? '' : n.toLocaleString('en-US')
}

/* ── Radio selection card styles ── */
// Text weight 400, not 600 — this is option text for a value the user is
// picking (functionally a radio button), the same category as every other
// label/control text in this form, not a heading. Selection state is
// already carried entirely by color/border/background; weight doesn't need
// to also signal it.
function segBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 400,
    cursor: 'pointer',
    border: active ? '1.5px solid #66C5C5' : '1.5px solid #D0D6DF',
    background: active
      ? 'linear-gradient(135deg, #EBF9F9 0%, #E8F2FC 100%)'
      : '#fff',
    color: active ? '#004081' : '#586782',
    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
    boxShadow: active ? '0 1px 5px rgba(0,64,129,0.2)' : 'none',
    textAlign: 'left',
  }
}


// Matches the W+ Library "RadioCheckbox" component (909:1495) exactly: the ring
// stays neutral gray in every state — only the inner dot appears, navy, when
// selected. The ring itself never changes color (it didn't in any of the
// component's three states: untick / tick / disable).
function RadioDot({ active }: { active: boolean }) {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
      border: '1px solid #D0D6DF',
      background: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#004081' }} />}
    </span>
  )
}

export function RequestFormStepper({
  initialRequest, currentUser, onSaveDraft, onSubmit, onResubmit, isResubmit = false, isPendingEdit = false,
}: Props) {
  const req = initialRequest
  const { isMobile } = useBreakpoint()

  const [formData, setFormData] = useState<Record<string, unknown>>(
    req ? flattenRequest(req) : getDefaults(currentUser),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  // Snapshot of collectData() taken once right after mount (see effect near
  // collectData below) — only meaningful in resubmit mode, where it lets
  // handleSubmit detect "sales changed literally nothing since the
  // rejection" and ask for one extra confirmation before sending.
  const initialSnapshotRef = useRef<string | null>(null)
  const [noChangeConfirmOpen, setNoChangeConfirmOpen] = useState(false)
  const isDirtyRef = useRef(false)

  const [existingDropdownOpen, setExistingDropdownOpen] = useState(false)
  const [existingResults, setExistingResults] = useState<Customer[]>([])
  const [resellerDropdownOpen, setResellerDropdownOpen] = useState(false)
  const [resellerResults, setResellerResults] = useState<Customer[]>([])

  const [draftLoading, setDraftLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── HW payment state ──
  // No request loaded yet → leave blank rather than defaulting to 0, so the
  // field starts genuinely unanswered instead of looking like "0 days" was
  // already chosen (and tripping the custom-value check below).
  const [hwCreditTermDays, setHwCreditTermDays] = useState<number | ''>(
    req?.installments[0]?.creditTermDays ?? ''
  )
  const [hwInstallmentCount, setHwInstallmentCount] = useState<number>(req?.installmentCount ?? 1)
  const [hwInstallments, setHwInstallments] = useState<InstRow[]>(
    req?.installments?.map(i => ({
      installmentPercent: i.installmentPercent,
      creditTermDays: i.creditTermDays,
      paymentCondition: i.paymentCondition,
    })) ?? [{ installmentPercent: 100, creditTermDays: '', paymentCondition: 'on_delivery' }]
  )
  const [hwCustomCreditTerm, setHwCustomCreditTerm] = useState(false)
  const [hwCustomCount, setHwCustomCount] = useState(false)
  // Holds the literal in-progress text of the custom count <Input> — kept
  // separate from hwInstallmentCount (which must always be a valid number
  // for rendering) so the field can go blank mid-edit instead of snapping
  // back to a forced value on every keystroke.
  const [hwCountDraft, setHwCountDraft] = useState<number | ''>(req?.installmentCount ?? 1)
  // "กรอกอิสระ" — table view (>4 installments) only: lets the amount column
  // be typed directly, back-calculating installmentPercent instead of the
  // other way around. Off by default (percent stays the editable column).
  const [hwAmountInputMode, setHwAmountInputMode] = useState(false)
  // "ใช้เครดิตเทอมเดียวกันทุกงวด" — UNIFORM_MODE (true, default) vs
  // CUSTOM_MODE (false, per-row). Re-derived from saved data on edit-load.
  const [hwCreditTermUniform, setHwCreditTermUniform] = useState(isCreditTermUniform(req?.installments))
  const [hwCustomCtRows, setHwCustomCtRows] = useState<Record<number, boolean>>({})

  // ── SW payment state ──
  const [swCreditTermDays, setSwCreditTermDays] = useState<number | ''>(
    req?.swInstallments?.[0]?.creditTermDays ?? ''
  )
  const [swInstallmentCount, setSwInstallmentCount] = useState<number>(req?.swInstallmentCount ?? 1)
  const [swInstallments, setSwInstallments] = useState<InstRow[]>(
    req?.swInstallments?.map(i => ({
      installmentPercent: i.installmentPercent,
      creditTermDays: i.creditTermDays,
      paymentCondition: i.paymentCondition,
    })) ?? [{ installmentPercent: 100, creditTermDays: '', paymentCondition: 'on_delivery' }]
  )
  const [swCustomCreditTerm, setSwCustomCreditTerm] = useState(false)
  const [swCustomCount, setSwCustomCount] = useState(false)
  const [swCountDraft, setSwCountDraft] = useState<number | ''>(req?.swInstallmentCount ?? 1)
  const [swAmountInputMode, setSwAmountInputMode] = useState(false)
  const [swCreditTermUniform, setSwCreditTermUniform] = useState(isCreditTermUniform(req?.swInstallments))
  const [swCustomCtRows, setSwCustomCtRows] = useState<Record<number, boolean>>({})

  const fd = formData
  const saleType = String(fd.saleType || '') as SaleType
  const separateQuotation = saleType === 'hardware_software_installation'
  const isLumpSum = saleType === 'lump_sum'
  const customerType = String(fd.customerType || '') as CustomerType | ''
  const nc = (fd.newCustomer as Record<string, string>) ?? {}
  const ec = (fd.existingCustomer as Record<string, unknown>) ?? {}
  const rs = (fd.reseller as Record<string, string>) ?? {}
  const proposalNo = String(fd.proposalNo || '')
  const hwQuotationNo = proposalNo ? `${proposalNo}-1` : 'Quotation-1'
  // single mode: both blocks share -1; split mode: sw gets -2
  const swQuotationNo = separateQuotation
    ? (proposalNo ? `${proposalNo}-2` : 'Quotation-2')
    : hwQuotationNo

  useEffect(() => {
    const current = [...hwInstallments]
    while (current.length < hwInstallmentCount) current.push({ installmentPercent: '', creditTermDays: '', paymentCondition: 'on_delivery' })
    setHwInstallments(current.slice(0, hwInstallmentCount))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwInstallmentCount])

  useEffect(() => {
    const current = [...swInstallments]
    while (current.length < swInstallmentCount) current.push({ installmentPercent: '', creditTermDays: '', paymentCondition: 'on_delivery' })
    setSwInstallments(current.slice(0, swInstallmentCount))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swInstallmentCount])

  const hwSelling   = numVal(fd.hardwareSellingPrice)
  const hwCost      = numVal(fd.hardwareCost)
  const swSelling   = numVal(fd.softwareSellingPrice)
  const swCost      = numVal(fd.softwareCost)
  const instSelling = numVal(fd.installationSellingPrice)
  const instCost    = numVal(fd.installationCost)
  const serviceSelling = swSelling + instSelling
  const serviceCost    = swCost + instCost
  const totalSelling   = hwSelling + serviceSelling
  const totalCost      = hwCost + serviceCost

  function update(patch: Record<string, unknown>) {
    isDirtyRef.current = true
    setFormData(prev => ({ ...prev, ...patch }))
  }

  async function openExistingDropdown(query = '') {
    const res = await searchCustomers(query); setExistingResults(res); setExistingDropdownOpen(true)
  }
  async function onExistingType(q: string) {
    update({ existingCustomer: { ...ec, companyName: q }, existingCustomerId: '' })
    const res = await searchCustomers(q); setExistingResults(res); setExistingDropdownOpen(true)
  }
  function selectExisting(c: Customer) {
    update({ existingCustomerId: c.id, existingCustomer: { companyName: c.companyName, defaultCreditTerm: c.defaultCreditTerm ?? 0, contactPerson: '', contactPhone: '' } })
    setHwCreditTermDays(c.defaultCreditTerm ?? 0); setHwCustomCreditTerm(false)
    setSwCreditTermDays(c.defaultCreditTerm ?? 0); setSwCustomCreditTerm(false)
    setExistingDropdownOpen(false); setExistingResults([])
  }

  async function openResellerDropdown(query = '') {
    const res = await searchCustomers(query); setResellerResults(res); setResellerDropdownOpen(true)
  }
  async function onResellerType(q: string) {
    update({ reseller: { ...rs, resellerCompanyName: q, resellerId: '' } })
    const res = await searchCustomers(q); setResellerResults(res); setResellerDropdownOpen(true)
  }
  function selectReseller(c: Customer) {
    update({ reseller: { ...rs, resellerId: c.id, resellerCompanyName: c.companyName, defaultCreditTerm: c.defaultCreditTerm ?? 0, contactPerson: '', contactPhone: '' } })
    setHwCreditTermDays(c.defaultCreditTerm ?? 0); setHwCustomCreditTerm(false)
    setSwCreditTermDays(c.defaultCreditTerm ?? 0); setSwCustomCreditTerm(false)
    setResellerDropdownOpen(false); setResellerResults([])
  }

  function collectData(): Record<string, unknown> {
    return {
      ...formData,
      hwCreditTermDays, hwInstallmentCount, hwInstallments, hwCreditTermUniform,
      swCreditTermDays, swInstallmentCount, swInstallments, swCreditTermUniform,
    }
  }

  useEffect(() => {
    if (isResubmit) initialSnapshotRef.current = JSON.stringify(collectData())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!proposalNo.trim()) e.proposalNo = 'กรุณาระบุ'
    if (!saleType) e.saleType = 'กรุณาเลือก'
    if (!customerType) e.customerType = 'กรุณาเลือก'
    if (customerType === 'new' && !nc?.companyName?.trim()) e['new.companyName'] = 'กรุณาระบุชื่อบริษัท'
    if (customerType === 'existing' && !String(ec.companyName || '').trim()) e.existingCompanyName = 'กรุณาระบุหรือค้นหาบริษัท'
    if (customerType === 'reseller') {
      if (!rs?.resellerCompanyName?.trim()) e['res.resellerCompanyName'] = 'กรุณาระบุหรือค้นหา Reseller'
      if (!rs?.endCustomerCompanyName?.trim()) e['res.endCustomerCompanyName'] = 'กรุณาระบุลูกค้าปลายทาง'
    }
    if (isLumpSum ? totalSelling <= 0 : hwSelling <= 0) e.hwSell = isLumpSum ? 'กรุณาระบุราคาขายอย่างน้อย 1 รายการ' : 'กรุณาระบุราคาขาย Hardware'
    if (!hwCreditTermUniform) {
      hwInstallments.slice(0, hwInstallmentCount).forEach((row, i) => { if (row.creditTermDays === '' || numVal(row.creditTermDays) < 0) e[`hwInst${i}.ct`] = 'ระบุวัน' })
    } else if (hwCreditTermDays === '' || numVal(hwCreditTermDays) < 0) {
      e.hwCreditTermDays = 'กรุณาระบุ Credit Term'
    }
    const hwTotalPct = calcTotalInstallmentPercent(hwInstallments.slice(0, hwInstallmentCount))
    hwInstallments.slice(0, hwInstallmentCount).forEach((row, i) => {
      if (!row.installmentPercent) e[`hwInst${i}.pct`] = 'ระบุ%'
      else if (numVal(row.installmentPercent) < 0) e[`hwInst${i}.pct`] = 'ติดลบ'
    })
    if (Math.abs(hwTotalPct - 100) >= 0.01 && hwInstallmentCount > 0) e.hwTotalPct = `รวม ${hwTotalPct.toFixed(1)}% ≠ 100%`

    if (!isLumpSum) {
      if (!swCreditTermUniform) {
        swInstallments.slice(0, swInstallmentCount).forEach((row, i) => { if (row.creditTermDays === '' || numVal(row.creditTermDays) < 0) e[`swInst${i}.ct`] = 'ระบุวัน' })
      } else if (swCreditTermDays === '' || numVal(swCreditTermDays) < 0) {
        e.swCreditTermDays = 'กรุณาระบุ Credit Term'
      }
      const swTotalPct = calcTotalInstallmentPercent(swInstallments.slice(0, swInstallmentCount))
      swInstallments.slice(0, swInstallmentCount).forEach((row, i) => {
        if (!row.installmentPercent) e[`swInst${i}.pct`] = 'ระบุ%'
        else if (numVal(row.installmentPercent) < 0) e[`swInst${i}.pct`] = 'ติดลบ'
      })
      if (Math.abs(swTotalPct - 100) >= 0.01 && swInstallmentCount > 0) e.swTotalPct = `รวม ${swTotalPct.toFixed(1)}% ≠ 100%`
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleDraft() {
    setDraftLoading(true); setSubmitError('')
    try { await onSaveDraft(collectData()); isDirtyRef.current = false } catch (err: unknown) { setSubmitError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด') }
    finally { setDraftLoading(false) }
  }

  async function doSubmit() {
    setSubmitLoading(true); setSubmitError('')
    try {
      if (isResubmit && onResubmit) await onResubmit(collectData())
      else await onSubmit(collectData())
      isDirtyRef.current = false
    } catch (err: unknown) { setSubmitError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด') }
    finally { setSubmitLoading(false) }
  }

  async function handleSubmit() {
    if (!validate()) {
      setSubmitError('กรุณากรอกข้อมูลให้ครบถ้วน — เลื่อนไปยังช่องที่ผิดพลาดให้แล้ว')
      // wait for the error state to commit to the DOM before querying it
      requestAnimationFrame(() => {
        document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }
    // Resubmitting with literally nothing changed since the rejection is
    // allowed (the fix may have happened outside the form — a phone call
    // confirming a price, say) but is unusual enough to deserve one extra
    // confirmation rather than going straight through silently.
    if (isResubmit && initialSnapshotRef.current !== null && JSON.stringify(collectData()) === initialSnapshotRef.current) {
      setNoChangeConfirmOpen(true)
      return
    }
    await doSubmit()
  }

  /* ── Shared helpers ── */
  const selectStyle: React.CSSProperties = { width: '100%', height: 38 }

  const comboDropdown = (results: Customer[], visible: boolean, onSelect: (c: Customer) => void) =>
    visible && (
      <div style={{ position: 'relative', zIndex: 1, width: '100%', background: '#fff', border: '1px solid #D0D6DF', borderRadius: 6, boxShadow: '0 4px 14px rgba(0,64,129,0.10)', overflowY: 'auto', maxHeight: 220, marginTop: 6 }}>
        {results.length > 0 ? results.map(c => (
          <button key={c.id}
            onMouseDown={e => { e.preventDefault(); onSelect(c) }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #F2F6F8', fontSize: 13 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F2F6F8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
          >
            <div style={{ fontWeight: 400, color: '#586782' }}>{c.companyName}</div>
            <div style={{ color: '#586782', fontSize: 12, marginTop: 2 }}>Net {c.defaultCreditTerm ?? 0} วัน · {c.contactPerson}</div>
          </button>
        )) : (
          <div style={{ padding: '10px 14px', color: '#586782', fontSize: 13 }}>ไม่พบข้อมูลลูกค้า</div>
        )}
      </div>
    )

  const priceTable = (rows: Array<{ label: string; spKey: string; costKey: string }>) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ width: 120 }} />
          <th style={{ padding: '0 16px 4px 0', textAlign: 'right', fontSize: 12, fontWeight: 400, color: '#586782' }}>ราคาทุน (THB)</th>
          <th style={{ padding: '0 0 4px', textAlign: 'right', fontSize: 12, fontWeight: 400, color: '#586782' }}>ราคาขาย (THB)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, spKey, costKey }) => {
          const sellError = spKey === 'hardwareSellingPrice' ? errors.hwSell : undefined
          return (
            <tr key={spKey}>
              <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 400, color: '#586782' }}>{label}</td>
              <td style={{ padding: '8px 16px 8px 0', verticalAlign: 'top' }}>
                <Input type="text" inputMode="numeric"
                  value={formatThousands(fd[costKey])}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    update({ [costKey]: digits ? Number(digits) : '' })
                  }}
                  placeholder="0"
                  style={{ textAlign: 'right' }}
                />
              </td>
              <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                <Input type="text" inputMode="numeric"
                  value={formatThousands(fd[spKey])}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    update({ [spKey]: digits ? Number(digits) : '' })
                  }}
                  placeholder="0"
                  style={{ textAlign: 'right' }}
                  error={sellError}
                />
                {sellError && <div style={{ marginTop: 4, fontSize: 12, color: '#F3554F' }}>{sellError}</div>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  const summaryAmount = (value: number, color = '#586782', size?: number, weight: number = 700) => (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: weight, color, fontSize: size }}>
      {formatCurrency(value)}
    </span>
  )

  const quotationHeader = (quotationNo: string, groupLabel: string, gradient: string) => (
    <div style={{ background: gradient, borderRadius: '4px 4px 0 0', padding: '12px 14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 12px' }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
        {groupLabel}
      </span>
      <span style={{ fontSize: 13 }}>
        <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.78)' }}>Quotation No. </span>
        <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{quotationNo}</span>
      </span>
    </div>
  )

  /* ── Payment block (closure over component state) ── */
  function renderPaymentBlock(prefix: 'hw' | 'sw', sellingTotal: number, costTotal: number, summaryLabel: string) {
    const ctDays       = prefix === 'hw' ? hwCreditTermDays       : swCreditTermDays
    const setCtDays    = prefix === 'hw' ? setHwCreditTermDays    : setSwCreditTermDays
    const instCount    = prefix === 'hw' ? hwInstallmentCount      : swInstallmentCount
    const setInstCount = prefix === 'hw' ? setHwInstallmentCount   : setSwInstallmentCount
    const insts        = prefix === 'hw' ? hwInstallments          : swInstallments
    const setInsts     = prefix === 'hw' ? setHwInstallments       : setSwInstallments
    const isCustomCT   = prefix === 'hw' ? hwCustomCreditTerm      : swCustomCreditTerm
    const setIsCustomCT= prefix === 'hw' ? setHwCustomCreditTerm   : setSwCustomCreditTerm
    const isCustomCount   = prefix === 'hw' ? hwCustomCount   : swCustomCount
    const setIsCustomCount= prefix === 'hw' ? setHwCustomCount: setSwCustomCount
    const countDraft      = prefix === 'hw' ? hwCountDraft    : swCountDraft
    const setCountDraft   = prefix === 'hw' ? setHwCountDraft : setSwCountDraft
    const amountInputMode    = prefix === 'hw' ? hwAmountInputMode    : swAmountInputMode
    const setAmountInputMode = prefix === 'hw' ? setHwAmountInputMode : setSwAmountInputMode
    const ctUniform    = prefix === 'hw' ? hwCreditTermUniform    : swCreditTermUniform
    const setCtUniform = prefix === 'hw' ? setHwCreditTermUniform : setSwCreditTermUniform
    const customCtRows    = prefix === 'hw' ? hwCustomCtRows    : swCustomCtRows
    const setCustomCtRows = prefix === 'hw' ? setHwCustomCtRows : setSwCustomCtRows

    const creditTermIsCustom = isCustomCT || (ctDays !== '' && !CREDIT_TERM_PRESETS.includes(numVal(ctDays)))
    const countIsCustom = isCustomCount || !INSTALLMENT_COUNT_PRESETS.includes(instCount)
    const totalPct = calcTotalInstallmentPercent(insts.slice(0, instCount))
    const pctOk    = Math.abs(totalPct - 100) < 0.01
    const ctErrKey  = prefix === 'hw' ? 'hwCreditTermDays' : 'swCreditTermDays'
    const pctErrKey = prefix === 'hw' ? 'hwTotalPct'       : 'swTotalPct'

    function updateInstRow(i: number, field: keyof InstRow, value: unknown) {
      const updated = [...insts]
      if (!updated[i]) updated[i] = { installmentPercent: '', creditTermDays: '', paymentCondition: 'on_delivery' }
      updated[i] = { ...updated[i], [field]: value }
      setInsts(updated)
    }

    function applyPreset(percents: number[]) {
      const updated = percents.map((percent, idx) => ({
        ...(insts[idx] || { creditTermDays: '', paymentCondition: 'on_delivery' as PaymentCondition }),
        installmentPercent: percent,
      }))
      setInstCount(percents.length); setInsts(updated)
    }

    // Switching from UNIFORM_MODE to CUSTOM_MODE seeds every row from the
    // single value that was in use so far (if any was picked) so rows start
    // as a real dropdown selection, not a 0-day custom-input fallback — '',
    // not 0, is the "nothing chosen yet" seed (0 isn't a preset, so it would
    // render as a custom-typed field instead of an unselected dropdown).
    function toggleCreditTermMode(uniform: boolean) {
      if (!uniform) {
        const seed = ctDays === '' ? '' : numVal(ctDays)
        setInsts(insts.map(row => ({ ...row, creditTermDays: row.creditTermDays === '' ? seed : row.creditTermDays })))
      }
      setCtUniform(uniform)
    }

    // กรอกอิสระ (free-amount entry): every row is independently editable —
    // no row is auto-computed. The empty rows show a live "แนะนำ" suggestion
    // (remaining amount split evenly across however many are still blank)
    // as guidance, not a default — same pattern as the card view's
    // suggestedPct hint. The existing total-% validation is the actual
    // correctness check at submit time.
    function setAmountRow(i: number, amount: number) {
      updateInstRow(i, 'installmentPercent', amount === 0 ? '' : (sellingTotal > 0 ? (amount / sellingTotal) * 100 : 0))
    }

    // Bulk counterpart to the per-row suggestion hint — typing a value into
    // every row one at a time doesn't scale once instCount runs into the
    // hundreds. This fills every row that's STILL blank (leaving anything
    // already typed untouched) with an even split of whatever's left, in
    // one action. Same last-row-absorbs-the-rounding-remainder technique as
    // equalSplitPercents, just scoped to the empty rows' share of 100%
    // instead of the whole 100%.

    // Curated split presets exist for 1-4; beyond that there's no hand-picked
    // option to fall back to, so the split starts as an even share across all
    // n rows instead — see equalSplitPercents.
    function changeCount(next: number) {
      const clamped = Math.max(1, Math.min(MAX_INSTALLMENTS, Math.round(next) || 1))
      const curated = INSTALLMENT_PRESETS[clamped]?.[0]?.percents
      applyPreset(curated ?? equalSplitPercents(clamped))
    }

    // Per-row credit term control (CUSTOM_MODE only) — same dropdown +
    // "ระบุเอง" pattern as the single block-level Credit Term field above,
    // just sized down for the table's tighter column when compact.
    function creditTermRowControl(i: number, row: InstRow, compact: boolean) {
      const days = row.creditTermDays
      const errKey = `${prefix}Inst${i}.ct`
      const isCustom = customCtRows[i] || (days !== '' && !CREDIT_TERM_PRESETS.includes(numVal(days)))
      if (isCustom) {
        // Same placeholder + suffix pattern as the single block-level
        // Credit Term field's own custom-input (above): "พิมพ์จำนวนวัน"
        // while empty, then a "วัน" unit label that stays next to whatever
        // number gets typed — so a filled row reads "15 วัน", the same way
        // a picked dropdown option does, instead of a bare unlabeled "15".
        if (compact) {
          // The input is still pinned to a fixed 92px box matching the
          // dropdown's own width/position exactly — the suffix + X button
          // are an absolutely-positioned group laid out after it, so
          // neither one can shift where the input box itself sits (a flex
          // row's centering point moves with total content width, which is
          // exactly what caused the previous misalignment).
          return (
            <div style={{ position: 'relative', display: 'inline-block', width: 92 }}>
              {/* "พิมพ์จำนวนวัน" (the full phrase, same as the block-level
                  field below) gets clipped to "พิมพ์จำนวนวั" at this width —
                  92px is a hard constraint here since it's pinned to the
                  dropdown's own width, so this column uses a shorter
                  placeholder that actually fits instead of a truncated one. */}
              <Input type="number" min="0" value={days}
                onChange={e => updateInstRow(i, 'creditTermDays', e.target.value !== '' ? Number(e.target.value) : '')}
                placeholder="ระบุวัน" error={errors[errKey]}
                className="no-spinner"
                style={{ width: '100%', textAlign: 'right', height: 32, fontSize: 12 }} />
              <div style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 4, height: 32, display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
                <span style={{ color: '#586782', fontSize: 11, fontWeight: 400 }}>วัน</span>
                <button type="button"
                  onClick={() => { setCustomCtRows(prev => ({ ...prev, [i]: false })); updateInstRow(i, 'creditTermDays', CREDIT_TERM_PRESETS[0]) }}
                  style={{ width: 20, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, background: 'transparent', color: '#586782', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F2F6F8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  aria-label="เลือกจากรายการแทน">
                  <XMarkIcon size={13} />
                </button>
              </div>
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Input type="number" min="0" value={days}
              onChange={e => updateInstRow(i, 'creditTermDays', e.target.value !== '' ? Number(e.target.value) : '')}
              placeholder="พิมพ์จำนวนวัน" error={errors[errKey]}
              style={{ textAlign: 'right', flex: 1 }} />
            <span style={{ color: '#586782', fontSize: 13, fontWeight: 400, flexShrink: 0 }}>วัน</span>
            <button type="button"
              onClick={() => { setCustomCtRows(prev => ({ ...prev, [i]: false })); updateInstRow(i, 'creditTermDays', CREDIT_TERM_PRESETS[0]) }}
              style={{ width: 28, height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, background: 'transparent', color: '#586782', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F2F6F8' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              aria-label="เลือกจากรายการแทน">
              <XMarkIcon size={16} />
            </button>
          </div>
        )
      }
      return (
        <Select
          value={days === '' ? '' : (CREDIT_TERM_PRESETS.includes(numVal(days)) ? String(days) : 'custom')}
          onChange={e => {
            const v = e.target.value
            if (v === 'custom') { setCustomCtRows(prev => ({ ...prev, [i]: true })); updateInstRow(i, 'creditTermDays', '') }
            else { setCustomCtRows(prev => ({ ...prev, [i]: false })); updateInstRow(i, 'creditTermDays', v === '' ? '' : Number(v)) }
          }}
          error={errors[errKey]}
          style={compact ? { width: 92, height: 32, fontSize: 12, paddingLeft: 8, paddingRight: 22 } : selectStyle}
        >
          <option value="">— วัน —</option>
          {CREDIT_TERM_PRESETS.map(d => <option key={d} value={d}>{d} วัน</option>)}
          <option value="custom">ระบุเอง</option>
        </Select>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px 20px' }}>

        {/* Credit Term + Count */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <FormGroup label="Credit Term" required={ctUniform} error={errors[ctErrKey]} style={{ width: 200 }}>
            {!ctUniform ? (
              <div style={{ height: 38, display: 'flex', alignItems: 'center', fontSize: 13, color: '#929EB4', fontStyle: 'italic' }}>
                กำหนดแยกต่องวด
              </div>
            ) : creditTermIsCustom ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Input
                  type="number" min="0" autoFocus
                  value={ctDays}
                  onChange={e => setCtDays(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="พิมพ์จำนวนวัน"
                  error={errors[ctErrKey]}
                  style={{ flex: 1 }}
                />
                <span style={{ color: '#586782', fontSize: 13, fontWeight: 400, flexShrink: 0 }}>วัน</span>
                <button type="button" onClick={() => { setIsCustomCT(false); setCtDays('') }}
                  style={{ width: 28, height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, background: 'transparent', color: '#586782', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F2F6F8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  aria-label="เลือกจากรายการแทน">
                  <XMarkIcon size={16} />
                </button>
              </div>
            ) : (
              <Select
                value={ctDays === '' ? '' : String(ctDays)}
                onChange={e => {
                  const v = e.target.value
                  if (v === 'custom') { setIsCustomCT(true); setCtDays('') }
                  else setCtDays(v === '' ? '' : Number(v))
                }}
                error={errors[ctErrKey]}
                style={selectStyle}
              >
                <option value="">— เลือกวัน —</option>
                {CREDIT_TERM_PRESETS.map(days => (
                  <option key={days} value={days}>{days} วัน ({CREDIT_TERM_HINTS[days]})</option>
                ))}
                <option value="custom">ระบุเอง</option>
              </Select>
            )}
          </FormGroup>

          {/* Was a hard-capped 1-4 segmented control — a request can run to
              hundreds of installments (long-term/multi-year payment plans),
              so this now mirrors Credit Term's own dropdown + "ระบุเอง"
              pattern right beside it instead of a fixed button row. */}
          <FormGroup label="จำนวนงวด" style={{ width: 170 }}>
            {countIsCustom ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Input
                  type="number" min="1" max={MAX_INSTALLMENTS} autoFocus
                  value={countDraft}
                  onChange={e => {
                    const v = e.target.value
                    // Stays blank while typing instead of forcing a value on
                    // every keystroke — only commits to instCount once the
                    // text actually parses to a real number, so clearing the
                    // field to type a replacement no longer snaps back to 1.
                    setCountDraft(v === '' ? '' : Number(v))
                    if (v !== '' && Number(v) >= 1) changeCount(Number(v))
                  }}
                  // type="number" inputs don't support .select(), so there's
                  // no reliable "select all on focus" here — just fall back
                  // cleanly to the last valid count if left blank/invalid.
                  onBlur={() => { if (countDraft === '' || numVal(countDraft) < 1) setCountDraft(instCount) }}
                  placeholder="พิมพ์จำนวนงวด"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={() => { setIsCustomCount(false); changeCount(INSTALLMENT_COUNT_PRESETS[0]); setCountDraft(INSTALLMENT_COUNT_PRESETS[0]) }}
                  style={{ width: 28, height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, background: 'transparent', color: '#586782', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F2F6F8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  aria-label="เลือกจากรายการแทน">
                  <XMarkIcon size={16} />
                </button>
              </div>
            ) : (
              <Select
                value={String(instCount)}
                onChange={e => {
                  const v = e.target.value
                  // Starts genuinely blank (placeholder visible), not
                  // pre-filled with the current count — switching into
                  // "ระบุเอง" should read as "type a number," not "edit this
                  // existing one." instCount itself doesn't change here, so
                  // the card/table preview still shows whatever it last did
                  // until a real number is typed.
                  if (v === 'custom') { setIsCustomCount(true); setCountDraft(''); return }
                  changeCount(Number(v))
                }}
                style={selectStyle}
              >
                {INSTALLMENT_COUNT_PRESETS.map(n => <option key={n} value={n}>{n} งวด</option>)}
                <option value="custom">ระบุเอง</option>
              </Select>
            )}
          </FormGroup>
        </div>

        {/* Preset buttons — shown for any count that has presets defined */}
        {(INSTALLMENT_PRESETS[instCount] ?? []).length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: '#586782', fontWeight: 400, marginBottom: 8 }}>สัดส่วน</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(INSTALLMENT_PRESETS[instCount] ?? []).slice(0, 4).map(preset => {
                const active = preset.percents.every((p, idx) => numVal(insts[idx]?.installmentPercent) === p)
                return (
                  <button key={preset.label} type="button" onClick={() => applyPreset(preset.percents)}
                    style={{ padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 400, cursor: 'pointer',
                      border: active ? '1.5px solid #004081' : '1.5px solid #D0D6DF',
                      background: active ? '#004081' : '#FFFFFF',
                      color: active ? '#FFFFFF' : '#586782' }}>
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Installment table — unified for all installment counts */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#586782', fontWeight: 400 }}>รายละเอียดงวด</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Toggle
                checked={!ctUniform}
                onChange={on => toggleCreditTermMode(!on)}
                label={<span style={{ fontSize: 13, color: '#586782', fontWeight: 400 }}>ระบุเครดิตเทอมแยกแต่ละงวด</span>}
              />
              <Toggle
                checked={amountInputMode}
                onChange={on => {
                  if (on) {
                    setInsts(insts.map(r => ({ ...r, installmentPercent: '' })))
                    setAmountInputMode(true)
                  } else {
                    applyPreset(equalSplitPercents(instCount))
                    setAmountInputMode(false)
                  }
                }}
                label={<span style={{ fontSize: 13 }}>กรอกอิสระ</span>}
              />
            </div>
          </div>
          <div style={{ border: '1px solid #D0D6DF', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 14px', fontWeight: 400, color: '#004081', fontSize: 12.5, textAlign: 'left', background: '#F2F6F8', borderBottom: '2px solid #D0D6DF', width: !ctUniform ? '14%' : '33.34%' }}>งวดที่</th>
                    <th style={{ padding: '10px 14px', fontWeight: 400, color: '#004081', fontSize: 12.5, textAlign: 'center', background: '#F2F6F8', borderBottom: '2px solid #D0D6DF', width: !ctUniform ? '20%' : '33.33%' }}>สัดส่วน (%)</th>
                    {!ctUniform && (
                      <th style={{ padding: '10px 14px', fontWeight: 400, color: '#004081', fontSize: 12.5, textAlign: 'center', background: '#F2F6F8', borderBottom: '2px solid #D0D6DF', width: '22%' }}>เครดิตเทอม (วัน)</th>
                    )}
                    <th style={{ padding: '10px 14px', fontWeight: 400, color: '#004081', fontSize: 12.5, textAlign: 'right', background: '#F2F6F8', borderBottom: '2px solid #D0D6DF', width: !ctUniform ? '44%' : '33.33%' }}>มูลค่า (THB)</th>
                  </tr>
                </thead>
                <tbody>
                  {insts.slice(0, instCount).map((row, i) => {
                    const pct = numVal(row.installmentPercent)
                    const totalAmt = sellingTotal > 0 ? calcInstallmentAmount(sellingTotal, pct) : 0
                    const pctErrRowKey = `${prefix}Inst${i}.pct`
                    const isNegative = pct < 0
                    const negativeError = isNegative ? 'ติดลบ' : undefined
                    const rowBg = errors[pctErrRowKey] || isNegative ? '#FEF2F2' : (i % 2 === 1 ? '#FAFBFC' : undefined)
                    return (
                      <tr key={i} style={{ borderTop: '1px solid #F2F6F8', background: rowBg }}>
                        <td style={{ padding: '6px 14px', color: '#586782' }}>{i + 1}</td>
                        <td style={{ padding: '6px 14px', textAlign: 'center' }}>
                          {amountInputMode ? (
                            <span style={{ fontVariantNumeric: 'tabular-nums', color: isNegative ? '#F3554F' : '#586782' }}>{pct ? `${pct.toFixed(2)}%` : '—'}</span>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Input type="number" min="0" max="100" value={row.installmentPercent}
                                onChange={e => updateInstRow(i, 'installmentPercent', e.target.value !== '' ? Number(e.target.value) : '')}
                                placeholder="0"
                                error={errors[pctErrRowKey] || negativeError}
                                className="no-spinner"
                                style={{ width: 64, textAlign: 'right', height: 32 }} />
                              <span style={{ color: '#586782', fontSize: 12 }}>%</span>
                            </div>
                          )}
                        </td>
                        {!ctUniform && (
                          <td style={{ padding: '6px 14px', textAlign: 'center' }}>
                            {creditTermRowControl(i, row, true)}
                          </td>
                        )}
                        <td style={{ padding: '6px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isNegative ? '#F3554F' : '#004081', fontWeight: 500 }}>
                          {amountInputMode ? (
                            <Input type="text" inputMode="numeric" value={formatThousands(totalAmt || '')}
                              onChange={e => {
                                const digits = e.target.value.replace(/\D/g, '')
                                setAmountRow(i, digits ? Number(digits) : 0)
                              }}
                              placeholder="0"
                              error={negativeError}
                              style={{ width: 110, textAlign: 'right', height: 32 }} />
                          ) : (
                            totalAmt !== 0 ? formatCurrency(totalAmt) : '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            {/* Label is plain weight — the red/gray color swap on the number
                already carries the "did this hit 100%" signal; weight
                doesn't need to also do that job (same "color, not boldness"
                principle as the table headers — see DESIGN.md §3.2). */}
            <span style={{ fontSize: 12, color: '#586782', fontWeight: 400 }}>รวมสัดส่วนงวด</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pctOk ? '#586782' : '#F3554F' }}>{totalPct.toFixed(0)}%</span>
          </div>
          {/* transform: scaleX(), not width — same visual result (the
              rounded track clips it identically) without animating a layout
              property on every percent change. */}
          <div style={{ height: 6, background: '#D0D6DF', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', transformOrigin: 'left', transform: `scaleX(${Math.min(Math.max(totalPct, 0), 100) / 100})`, background: pctOk ? '#66C5C5' : '#F3554F', transition: 'transform 0.2s' }} />
          </div>
        </div>

        {/* Combined selling/cost summary */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 6, padding: '12px 14px', borderRadius: 4,
          background: '#F2F6F8',
        }}>
          <span style={{ fontSize: 13, color: '#586782', fontWeight: 400 }}>{summaryLabel.startsWith('รวม') ? summaryLabel : `รวม ${summaryLabel}`}</span>
          <span style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#586782', fontWeight: 400 }}>
              ราคาทุน <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 500, color: '#586782' }}>{formatCurrency(costTotal)}</span>
            </span>
            <span style={{ fontSize: 12, color: '#586782', fontWeight: 400 }}>
              ราคาขาย <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: '#004081' }}>{formatCurrency(sellingTotal)}</span>
            </span>
          </span>
        </div>

        {errors[pctErrKey] && <div style={{ fontSize: 12, color: '#F3554F' }}>{errors[pctErrKey]}</div>}
      </div>
    )
  }

  /* ── Quotation card wrapper ── */
  // No stroked border, but the header still needs to read as *attached* to
  // its own content rather than a chip floating on the panel — solved with
  // fill, not stroke: header top-rounded only, body gets a soft #F8F9FA
  // tint with bottom rounding, so the two form one visual unit through
  // color alone (matches RequestDetailPage's identical quotationBlock fix).
  const quotationCard = (quotationNo: string, label: string, headerGradient: string, body: React.ReactNode) => (
    <div>
      {quotationHeader(quotationNo, label, headerGradient)}
      <div style={{ background: '#F8F9FA', borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
        {body}
      </div>
    </div>
  )

  // Was one consolidated Alert at the top of the whole form, bundling all 3
  // sections' rejection reasons together — meant scrolling back up to it
  // while editing each section separately. Now each comment renders right
  // where its own section starts, matching RequestDetailPage's own
  // sectionComment left-border-accent convention (no fill, not a competing
  // box) instead of inventing a different style for the editable form.
  const rejectionQuote = (comment?: string) => {
    if (!isResubmit || !comment) return null
    return (
      <div style={{ marginBottom: 14, paddingLeft: 10, borderLeft: '2px solid #F3554F', fontSize: 12, color: '#7F1D1D', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 400 }}>ครั้งก่อนถูกปฏิเสธว่า:</span> <span style={{ fontStyle: 'italic' }}>"{comment}"</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760, margin: '0 auto' }}>

      {/* One white panel for the whole form, matching WorkX's own assembled
          form (Exzy_WorkX "Edit My work", 1190:5406) — a single continuous
          white surface, not a borderless page bg with each field floating
          loose on it. <Section> divides *inside* this one surface (title +
          thin rule); the surface itself is what was missing when the
          per-section <Card> boxes were first removed. 32px gap, not 20 —
          without a Card border to mark each section's boundary, the gap
          itself has to carry more of that signal. */}
      <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', gap: 32, background: '#fff', border: '1px solid #D0D6DF', borderRadius: 4, padding: 32 }}>

      {/* ─── 1. ข้อมูลคำขอ ─── */}
      <div id="section-info">
      <Section title="1. ข้อมูลคำขอ">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <FormGroup label="Proposal No." required error={errors.proposalNo}>
            <Input value={String(fd.proposalNo || '')} onChange={e => update({ proposalNo: e.target.value })} placeholder="PRO-2026-001" error={errors.proposalNo} />
          </FormGroup>

          <div>
            {/* Matches FormGroup's label exactly — same field-label role as
                "Proposal No." right above it, just not wrapped in
                <FormGroup> since the control below is a button group, not a
                single input. */}
            <div style={{ fontSize: 12, fontWeight: 400, color: '#586782', marginBottom: 8 }}>
              ประเภทการขาย <span style={{ color: '#F3554F', fontWeight: 700, fontSize: 14, marginLeft: 3 }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SALE_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => update({ saleType: t.value })} style={{ ...segBtn(saleType === t.value), flex: isMobile ? '1 1 calc(50% - 4px)' : '1' }}>
                  <RadioDot active={saleType === t.value} />
                  {t.label}
                </button>
              ))}
            </div>
            {errors.saleType && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 4 }}>{errors.saleType}</div>}
          </div>
        </div>
      </Section>
      </div>

      {/* ─── 2. ข้อมูลลูกค้า ─── */}
      <div id="section-customer">
      <Section title="2. ข้อมูลลูกค้า">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {rejectionQuote(initialRequest?.approvalResult?.customerComment)}
          <div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#586782', marginBottom: 8 }}>
              ประเภทลูกค้า <span style={{ color: '#F3554F', fontWeight: 700, fontSize: 14, marginLeft: 3 }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CUSTOMER_TYPES.map(type => (
                <button key={type} type="button"
                  onClick={() => { update({ customerType: type }); setExistingDropdownOpen(false); setResellerDropdownOpen(false) }}
                  style={{ ...segBtn(customerType === type), flex: isMobile ? '1 1 calc(50% - 4px)' : '1' }}>
                  <RadioDot active={customerType === type} />
                  {CUSTOMER_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            {errors.customerType && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 4 }}>{errors.customerType}</div>}
          </div>

          {customerType === 'new' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              <FormGroup label="ชื่อบริษัท" required error={errors['new.companyName']} style={{ gridColumn: 'span 2' } as React.CSSProperties}>
                <Input value={nc.companyName ?? ''} onChange={e => update({ newCustomer: { ...nc, companyName: e.target.value } })} placeholder="บริษัท..." error={errors['new.companyName']} />
              </FormGroup>
              <FormGroup label="ชื่อผู้ติดต่อ">
                <Input value={nc.contactPerson ?? ''} onChange={e => update({ newCustomer: { ...nc, contactPerson: e.target.value } })} placeholder="ชื่อ-นามสกุล" />
              </FormGroup>
              <FormGroup label="เบอร์ผู้ติดต่อ">
                <Input value={nc.contactPhone ?? ''} onChange={e => update({ newCustomer: { ...nc, contactPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
              </FormGroup>
            </div>
          )}

          {customerType === 'existing' && (
            <div>
              <FormGroup label="ชื่อบริษัท" required error={errors.existingCompanyName}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <Input value={String(ec.companyName ?? '')}
                      onChange={e => onExistingType(e.target.value)}
                      onFocus={() => openExistingDropdown()} onClick={() => openExistingDropdown()}
                      onBlur={() => setTimeout(() => setExistingDropdownOpen(false), 150)}
                      placeholder="เลือกลูกค้าจากรายการ หรือพิมพ์เพื่อกรอง"
                      error={errors.existingCompanyName}
                      style={{ paddingRight: ec.companyName ? 32 : undefined }}
                    />
                    {!!ec.companyName && (
                      <button onClick={() => update({ existingCustomerId: '', existingCustomer: { companyName: '', defaultCreditTerm: 0 } })}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#586782', padding: 2, display: 'flex' }}>
                        <XMarkIcon size={16} />
                      </button>
                    )}
                  </div>
                  {comboDropdown(existingResults, existingDropdownOpen, selectExisting)}
                </div>
              </FormGroup>
              {!!fd.existingCustomerId && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#586782' }}>Default credit: Net {numVal(ec.defaultCreditTerm)} วัน</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginTop: 12 }}>
                <FormGroup label="ชื่อผู้ติดต่อ">
                  <Input value={String(ec.contactPerson ?? '')} onChange={e => update({ existingCustomer: { ...ec, contactPerson: e.target.value } })} placeholder="ชื่อ-นามสกุล" />
                </FormGroup>
                <FormGroup label="เบอร์ผู้ติดต่อ">
                  <Input value={String(ec.contactPhone ?? '')} onChange={e => update({ existingCustomer: { ...ec, contactPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
                </FormGroup>
              </div>
            </div>
          )}

          {customerType === 'reseller' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 400, color: '#586782', marginBottom: 10 }}>Reseller</div>
                <FormGroup error={errors['res.resellerCompanyName']}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <Input value={rs.resellerCompanyName ?? ''}
                        onChange={e => onResellerType(e.target.value)}
                        onFocus={() => openResellerDropdown()} onClick={() => openResellerDropdown()}
                        onBlur={() => setTimeout(() => setResellerDropdownOpen(false), 150)}
                        placeholder="เลือก Reseller จากรายการ หรือพิมพ์เพื่อกรอง"
                        error={errors['res.resellerCompanyName']}
                        style={{ paddingRight: rs.resellerCompanyName ? 32 : undefined }}
                      />
                      {rs.resellerCompanyName && (
                        <button onClick={() => update({ reseller: { ...rs, resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' } })}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#586782', padding: 2, display: 'flex' }}>
                          <XMarkIcon size={16} />
                        </button>
                      )}
                    </div>
                    {comboDropdown(resellerResults, resellerDropdownOpen, selectReseller)}
                  </div>
                </FormGroup>
                {rs.resellerId && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#586782' }}>Default credit: Net {numVal(rs.defaultCreditTerm)} วัน</div>
                )}
              </div>
              <FormGroup label="บริษัทลูกค้าปลายทาง (End Customer)" required error={errors['res.endCustomerCompanyName']}>
                <Input value={rs.endCustomerCompanyName ?? ''} onChange={e => update({ reseller: { ...rs, endCustomerCompanyName: e.target.value } })} placeholder="ใส่ชื่อบริษัทปลายทาง" error={errors['res.endCustomerCompanyName']} />
              </FormGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                <FormGroup label="ชื่อผู้ติดต่อ">
                  <Input value={rs.contactPerson ?? ''} onChange={e => update({ reseller: { ...rs, contactPerson: e.target.value } })} placeholder="ชื่อ-นามสกุล" />
                </FormGroup>
                <FormGroup label="เบอร์ผู้ติดต่อ">
                  <Input value={rs.contactPhone ?? ''} onChange={e => update({ reseller: { ...rs, contactPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
                </FormGroup>
              </div>
            </div>
          )}
        </div>
      </Section>
      </div>

      {/* ─── Quotation card(s) — one merged block for lump sum, two otherwise ─── */}
      <div id="section-quotation">
      {isLumpSum ? (
        quotationCard(hwQuotationNo, 'รวมทุกรายการ', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', (
          <>
            <div style={{ padding: '18px 16px 0' }}>
              {rejectionQuote(initialRequest?.approvalResult?.hardwareComment)}
              {priceTable([
                { label: 'Hardware', spKey: 'hardwareSellingPrice', costKey: 'hardwareCost' },
                { label: 'Software', spKey: 'softwareSellingPrice', costKey: 'softwareCost' },
                { label: 'Installation', spKey: 'installationSellingPrice', costKey: 'installationCost' },
              ])}
            </div>
            {renderPaymentBlock('hw', totalSelling, totalCost, 'รวมทุกรายการ')}
          </>
        ))
      ) : (
        <>
          {quotationCard(hwQuotationNo, 'Hardware', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', (
            <>
              <div style={{ padding: '18px 16px 0' }}>
                {rejectionQuote(initialRequest?.approvalResult?.hardwareComment)}
                {priceTable([{ label: 'Hardware', spKey: 'hardwareSellingPrice', costKey: 'hardwareCost' }])}
              </div>
              {renderPaymentBlock('hw', hwSelling, hwCost, 'Hardware')}
            </>
          ))}

          {quotationCard(swQuotationNo, 'Software & Installation', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', (
            <>
              <div style={{ padding: '18px 16px 0' }}>
                {rejectionQuote(initialRequest?.approvalResult?.swComment)}
                {priceTable([
                  { label: 'Software', spKey: 'softwareSellingPrice', costKey: 'softwareCost' },
                  { label: 'Installation', spKey: 'installationSellingPrice', costKey: 'installationCost' },
                ])}
              </div>
              {renderPaymentBlock('sw', serviceSelling, serviceCost, 'Software & Installation')}
            </>
          ))}
        </>
      )}
      </div>

      {/* ─── สรุปรวมทั้งหมด ─── */}
      <div id="section-summary">
      <Section title="สรุปรวมทั้งหมด">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 400, color: '#004081', fontSize: 12.5 }}>รายการ</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 400, color: '#004081', fontSize: 12.5 }}>ราคาทุน</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 400, color: '#004081', fontSize: 12.5 }}>ราคาขาย</th>
            </tr>
          </thead>
          <tbody>
            {isLumpSum ? (
              <tr style={{ borderTop: '1px solid #F2F6F8' }}>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#586782' }}>{hwQuotationNo}</span>
                  <span style={{ color: '#586782', marginLeft: 8 }}>รวมทุกรายการ</span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(totalCost, '#586782', undefined, 400)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(totalSelling, '#004081', undefined, 500)}</td>
              </tr>
            ) : (
              <>
                <tr style={{ borderTop: '1px solid #F2F6F8' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#586782' }}>{hwQuotationNo}</span>
                    <span style={{ color: '#586782', marginLeft: 8 }}>Hardware</span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(hwCost, '#586782', undefined, 400)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(hwSelling, '#004081', undefined, 500)}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #F2F6F8' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#586782' }}>{swQuotationNo}</span>
                    <span style={{ color: '#586782', marginLeft: 8 }}>Software &amp; Installation</span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(serviceCost, '#586782', undefined, 400)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(serviceSelling, '#004081', undefined, 500)}</td>
                </tr>
              </>
            )}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid #D0D6DF', background: '#F8F9FA' }}>
              <td style={{ padding: '14px', fontWeight: 600, fontSize: 14, color: '#586782' }}>รวมทั้งหมด</td>
              <td style={{ padding: '14px', textAlign: 'right' }}>{summaryAmount(totalCost, '#586782', undefined, 500)}</td>
              <td style={{ padding: '14px', textAlign: 'right' }}>{summaryAmount(totalSelling, '#004081', 16, 700)}</td>
            </tr>
          </tfoot>
        </table>
      </Section>
      </div>

      {/* ─── Footer ─── */}
      <div style={{ paddingTop: 20, borderTop: '1px solid #D0D6DF' }}>
        {submitError && <div style={{ marginBottom: 12, fontSize: 12, color: '#F3554F' }}>{submitError}</div>}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 16,
        }}>
          <Checkbox
            checked={confirmed}
            onChange={setConfirmed}
            label={<span style={{ fontSize: 13, color: '#586782', fontWeight: 400, lineHeight: 1.5 }}>ตรวจสอบแล้ว ข้อมูลถูกต้องครบถ้วน</span>}
          />
          <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            {!isPendingEdit && (
              <Button variant="ghost" icon={<FaFloppyDisk size={15} />} onClick={handleDraft} loading={draftLoading} disabled={submitLoading}
                style={isMobile ? { width: '100%', justifyContent: 'center' } : {}}>
                บันทึกแบบร่าง
              </Button>
            )}
            <Button onClick={handleSubmit} loading={submitLoading} disabled={draftLoading || !confirmed}
              style={isMobile ? { width: '100%', justifyContent: 'center' } : {}}>
              {isPendingEdit ? 'บันทึกการแก้ไข' : isResubmit ? 'ส่งคำขออนุมัติอีกครั้ง' : 'ส่งคำขออนุมัติ'}
            </Button>
          </div>
        </div>
      </div>

      </div>

      {isResubmit && (
        <Modal
          open={noChangeConfirmOpen}
          onClose={() => setNoChangeConfirmOpen(false)}
          title="ยืนยันการส่งคำขอ"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setNoChangeConfirmOpen(false)} disabled={submitLoading}>กลับไปแก้ไข</Button>
              <Button onClick={() => { setNoChangeConfirmOpen(false); doSubmit() }} loading={submitLoading}>ยืนยันส่งคำขอ</Button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 13, color: '#586782', lineHeight: 1.65 }}>
            คำขอนี้ยังไม่มีการแก้ไขข้อมูลใดๆ จากครั้งก่อนที่ถูกปฏิเสธ ต้องการส่งคำขออนุมัติอีกครั้งโดยไม่แก้ไขข้อมูลใช่หรือไม่?
          </p>
        </Modal>
      )}
    </div>
  )
}

function getDefaults(user: CurrentUser): Record<string, unknown> {
  return {
    salesName: user.name, salesEmail: user.email, salesId: user.id,
    proposalNo: '',
    saleType: 'hardware',
    customerType: '',
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '', endCustomerCompanyName: '' },
    hardwareSellingPrice: '', hardwareCost: '',
    softwareSellingPrice: '', softwareCost: '',
    installationSellingPrice: '', installationCost: '',
  }
}

function flattenRequest(req: Request): Record<string, unknown> {
  const hw   = req.quotationItems.filter(i => i.type === 'hardware')
  const sw   = req.quotationItems.find(i => i.type === 'software')
  const inst = req.quotationItems.find(i => i.type === 'installation')

  const d: Record<string, unknown> = {
    salesName: req.salesName, salesEmail: req.salesEmail, salesId: req.salesId,
    proposalNo: req.proposalNo,
    saleType: req.saleType, customerType: req.customerInfo.type,
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '', endCustomerCompanyName: '' },
    hardwareSellingPrice: hw.reduce((s, i) => s + i.sellingPrice, 0),
    hardwareCost:         hw.reduce((s, i) => s + i.cost, 0),
    softwareSellingPrice: sw?.sellingPrice ?? '',
    softwareCost:         sw?.cost ?? '',
    installationSellingPrice: inst?.sellingPrice ?? '',
    installationCost:         inst?.cost ?? '',
  }

  const ci = req.customerInfo
  if (ci.type === 'new') {
    d.newCustomer = { companyName: ci.data.companyName, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  } else if (ci.type === 'existing') {
    d.existingCustomerId = ci.data.customerId
    d.existingCustomer   = { companyName: ci.data.companyName, defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  } else if (ci.type === 'reseller') {
    d.reseller = { resellerId: ci.data.resellerId, resellerCompanyName: ci.data.resellerCompanyName, defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '', endCustomerCompanyName: ci.data.endCustomerCompanyName }
  }

  return d
}
