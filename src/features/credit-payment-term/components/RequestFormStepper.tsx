import { useState, useEffect } from 'react'
import type { Request } from '../types/request'
import type { CurrentUser } from '../types/user'
import type { Customer, CustomerType } from '../types/customer'
import { CUSTOMER_TYPE_LABELS } from '../types/customer'
import { type SaleType, type PaymentCondition } from '../types/request'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { FormGroup, Input, Select } from '../../../components/ui/FormField'
import { Alert } from '../../../components/ui/Alert'
import { formatCurrency, calcInstallmentAmount, calcTotalInstallmentPercent } from '../utils/calculations'
import { searchCustomers } from '../services/customerService'
import { FaFloppyDisk, FaPaperPlane, FaXmark } from 'react-icons/fa6'

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
  { value: 'hardware', label: 'Quotation เดียว' },
  { value: 'hardware_software_installation', label: 'แยก Quotation' },
]
const CUSTOMER_TYPES: CustomerType[] = ['new', 'existing', 'reseller']
const CREDIT_TERM_PRESETS = [7, 15, 30, 60, 90, 120]
const CREDIT_TERM_HINTS: Record<number, string> = { 7: '1 สัปดาห์', 15: '15 วัน', 30: '1 เดือน', 60: '2 เดือน', 90: '3 เดือน', 120: '4 เดือน' }
const INSTALLMENT_PERCENT_PRESETS = [10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100]
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

function formatThousands(v: unknown): string {
  if (v === '' || v === undefined || v === null) return ''
  const n = Number(v)
  return Number.isNaN(n) ? '' : n.toLocaleString('en-US')
}

/* ── Radio selection card styles ── */
function segBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: active ? '1.5px solid #66C5C5' : '1.5px solid #D0D6DF',
    background: active
      ? 'linear-gradient(135deg, #EBF9F9 0%, #E8F2FC 100%)'
      : '#fff',
    color: active ? '#004081' : '#586782',
    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
    boxShadow: active ? '0 1px 5px rgba(102,197,197,0.2)' : 'none',
    textAlign: 'left',
  }
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
      border: active ? '2px solid #66C5C5' : '2px solid #C7CEDA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'border-color 0.15s',
    }}>
      {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#004081' }} />}
    </span>
  )
}

export function RequestFormStepper({
  initialRequest, currentUser, onSaveDraft, onSubmit, onResubmit, isResubmit = false, isPendingEdit = false,
}: Props) {
  const req = initialRequest

  const [formData, setFormData] = useState<Record<string, unknown>>(
    req ? flattenRequest(req) : getDefaults(currentUser),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)

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
    })) ?? [{ installmentPercent: 100, creditTermDays: 0, paymentCondition: 'on_delivery' }]
  )
  const [hwCustomCreditTerm, setHwCustomCreditTerm] = useState(false)
  const [hwCustomPercentRows, setHwCustomPercentRows] = useState<Record<number, boolean>>({})

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
    })) ?? [{ installmentPercent: 100, creditTermDays: 0, paymentCondition: 'on_delivery' }]
  )
  const [swCustomCreditTerm, setSwCustomCreditTerm] = useState(false)
  const [swCustomPercentRows, setSwCustomPercentRows] = useState<Record<number, boolean>>({})

  const fd = formData
  const saleType = String(fd.saleType || '') as SaleType
  const separateQuotation = saleType === 'hardware_software_installation'
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
    while (current.length < hwInstallmentCount) current.push({ installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' })
    setHwInstallments(current.slice(0, hwInstallmentCount))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwInstallmentCount])

  useEffect(() => {
    const current = [...swInstallments]
    while (current.length < swInstallmentCount) current.push({ installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' })
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
    return { ...formData, hwCreditTermDays, hwInstallmentCount, hwInstallments, swCreditTermDays, swInstallmentCount, swInstallments }
  }

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
    if (hwSelling <= 0) e.hwSell = 'กรุณาระบุราคาขาย Hardware'
    if (hwCreditTermDays === '' || numVal(hwCreditTermDays) < 0) e.hwCreditTermDays = 'กรุณาระบุ Credit Term'
    const hwTotalPct = calcTotalInstallmentPercent(hwInstallments.slice(0, hwInstallmentCount))
    hwInstallments.slice(0, hwInstallmentCount).forEach((row, i) => { if (!row.installmentPercent) e[`hwInst${i}.pct`] = 'ระบุ%' })
    if (Math.abs(hwTotalPct - 100) >= 0.01 && hwInstallmentCount > 0) e.hwTotalPct = `รวม ${hwTotalPct.toFixed(1)}% ≠ 100%`

    if (swCreditTermDays === '' || numVal(swCreditTermDays) < 0) e.swCreditTermDays = 'กรุณาระบุ Credit Term'
    const swTotalPct = calcTotalInstallmentPercent(swInstallments.slice(0, swInstallmentCount))
    swInstallments.slice(0, swInstallmentCount).forEach((row, i) => { if (!row.installmentPercent) e[`swInst${i}.pct`] = 'ระบุ%' })
    if (Math.abs(swTotalPct - 100) >= 0.01 && swInstallmentCount > 0) e.swTotalPct = `รวม ${swTotalPct.toFixed(1)}% ≠ 100%`

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleDraft() {
    setDraftLoading(true); setSubmitError('')
    try { await onSaveDraft(collectData()) } catch (err: unknown) { setSubmitError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด') }
    finally { setDraftLoading(false) }
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
    setSubmitLoading(true); setSubmitError('')
    try {
      if (isResubmit && onResubmit) await onResubmit(collectData())
      else await onSubmit(collectData())
    } catch (err: unknown) { setSubmitError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด') }
    finally { setSubmitLoading(false) }
  }

  /* ── Shared helpers ── */
  const selectStyle: React.CSSProperties = { width: '100%', height: 38 }

  const comboDropdown = (results: Customer[], visible: boolean, onSelect: (c: Customer) => void) =>
    visible && (
      <div style={{ position: 'relative', zIndex: 1, width: '100%', background: '#fff', border: '1px solid #D0D6DF', borderRadius: 4, boxShadow: '0 4px 14px rgba(0,64,129,0.10)', overflowY: 'auto', maxHeight: 220, marginTop: 6 }}>
        {results.length > 0 ? results.map(c => (
          <button key={c.id}
            onMouseDown={e => { e.preventDefault(); onSelect(c) }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #F2F6F8', fontSize: 13 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F2F6F8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
          >
            <div style={{ fontWeight: 600, color: '#001122' }}>{c.companyName}</div>
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
          <th style={{ padding: '0 16px 4px 0', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#586782' }}>ราคาทุน (THB)</th>
          <th style={{ padding: '0 0 4px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#586782' }}>ราคาขาย (THB)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, spKey, costKey }) => {
          const sellError = spKey === 'hardwareSellingPrice' ? errors.hwSell : undefined
          return (
            <tr key={spKey}>
              <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 600, color: '#001122' }}>{label}</td>
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

  const summaryAmount = (value: number, color = '#001122', size?: number, weight: number = 700) => (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: weight, color, fontSize: size }}>
      {formatCurrency(value)}
    </span>
  )

  const quotationHeader = (quotationNo: string, groupLabel: string, gradient: string) => (
    <div style={{ background: gradient, padding: '12px 14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 12px' }}>
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
    const customPctRows    = prefix === 'hw' ? hwCustomPercentRows    : swCustomPercentRows
    const setCustomPctRows = prefix === 'hw' ? setHwCustomPercentRows : setSwCustomPercentRows

    const creditTermIsCustom = isCustomCT || (ctDays !== '' && !CREDIT_TERM_PRESETS.includes(numVal(ctDays)))
    const totalPct = calcTotalInstallmentPercent(insts.slice(0, instCount))
    const pctOk    = Math.abs(totalPct - 100) < 0.01
    const ctErrKey  = prefix === 'hw' ? 'hwCreditTermDays' : 'swCreditTermDays'
    const pctErrKey = prefix === 'hw' ? 'hwTotalPct'       : 'swTotalPct'

    function updateInstRow(i: number, field: keyof InstRow, value: unknown) {
      const updated = [...insts]
      if (!updated[i]) updated[i] = { installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' }
      updated[i] = { ...updated[i], [field]: value }
      setInsts(updated)
    }

    function applyPreset(percents: number[]) {
      const updated = percents.map((percent, idx) => ({
        ...(insts[idx] || { creditTermDays: 0, paymentCondition: 'on_delivery' as PaymentCondition }),
        installmentPercent: percent,
      }))
      setCustomPctRows({}); setInstCount(percents.length); setInsts(updated)
    }

    function applyCustom() {
      const updated = Array.from({ length: instCount }, (_, idx) => ({
        ...(insts[idx] || { creditTermDays: 0, paymentCondition: 'on_delivery' as PaymentCondition }),
        installmentPercent: '' as '',
      }))
      setCustomPctRows(Object.fromEntries(Array.from({ length: instCount }, (_, idx) => [idx, true])))
      setInsts(updated)
    }

    function changeCount(next: number) {
      const clamped = Math.max(1, Math.min(4, next))
      const preset = INSTALLMENT_PRESETS[clamped]?.[0]?.percents ?? []
      if (preset.length) { applyPreset(preset); return }
      setCustomPctRows(prev => Object.fromEntries(Object.entries(prev).filter(([idx]) => Number(idx) < clamped)))
      setInstCount(clamped)
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px 20px' }}>

        {/* Credit Term + Count */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <FormGroup label="Credit Term" required error={errors[ctErrKey]} style={{ width: 200 }}>
            {creditTermIsCustom ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Input
                  type="number" min="0" autoFocus
                  value={ctDays}
                  onChange={e => setCtDays(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="พิมพ์จำนวนวัน"
                  error={errors[ctErrKey]}
                  style={{ flex: 1 }}
                />
                <span style={{ color: '#586782', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>วัน</span>
                <button type="button" onClick={() => { setIsCustomCT(false); setCtDays('') }}
                  style={{ width: 28, height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, background: 'transparent', color: '#586782', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F2F6F8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  aria-label="เลือกจากรายการแทน">
                  <FaXmark size={16} />
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

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#586782', marginBottom: 5 }}>จำนวนงวด</div>
            <div style={{ display: 'flex', border: '1px solid #D0D6DF', borderRadius: 4, overflow: 'hidden', height: 38 }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => changeCount(n)}
                  style={{
                    width: 44, height: 38, border: 'none',
                    borderRight: n < 4 ? '1px solid #D0D6DF' : 'none',
                    background: instCount === n ? 'linear-gradient(135deg, #EBF9F9 0%, #E8F2FC 100%)' : '#fff',
                    color: instCount === n ? '#004081' : '#586782',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preset buttons */}
        <div>
          <div style={{ fontSize: 11, color: '#586782', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>สัดส่วน</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(INSTALLMENT_PRESETS[instCount] ?? []).slice(0, 4).map(preset => {
              const active = preset.percents.every((p, idx) => numVal(insts[idx]?.installmentPercent) === p)
              return (
                <button key={preset.label} type="button" onClick={() => applyPreset(preset.percents)}
                  style={{ padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: active ? '1.5px solid #66C5C5' : '1.5px solid #D0D6DF',
                    background: '#fff', color: active ? '#004081' : '#586782' }}>
                  {preset.label}
                </button>
              )
            })}
            <button type="button" onClick={applyCustom}
              style={{ padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: Object.values(customPctRows).some(Boolean) ? '1.5px solid #66C5C5' : '1.5px dashed #C7CEDA',
                background: '#fff', color: Object.values(customPctRows).some(Boolean) ? '#004081' : '#586782' }}>
              ระบุเอง
            </button>
          </div>
        </div>

        {/* Installment cards */}
        <div>
          <div style={{ fontSize: 11, color: '#586782', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>รายละเอียดงวด</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${instCount}, minmax(0, 1fr))`, gap: 8 }}>
            {insts.slice(0, instCount).map((row, i) => {
              const hasAnyFilled = insts.slice(0, instCount).some(r => r.installmentPercent !== '')
              const pct = numVal(row.installmentPercent)
              const pctIsCustom = customPctRows[i] || (row.installmentPercent !== '' && !INSTALLMENT_PERCENT_PRESETS.includes(pct))
              const pctSelectValue = row.installmentPercent === '' ? (customPctRows[i] ? 'custom' : '') : (INSTALLMENT_PERCENT_PRESETS.includes(pct) ? String(pct) : 'custom')
              const suggestedPct = Math.max(0, Math.min(100, 100 - (totalPct - pct)))
              const totalAmt = sellingTotal > 0 && pct > 0 ? calcInstallmentAmount(sellingTotal, pct) : 0
              const pctErrRowKey = `${prefix}Inst${i}.pct`
              return (
                <div key={i} style={{
                  background: errors[pctErrRowKey] ? '#FEF2F2' : '#F2F6F8',
                  borderRadius: 4,
                  padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  ...(errors[pctErrRowKey] ? { outline: '1.5px solid #F3554F' } : {}),
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#004081', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 11, color: '#586782', fontWeight: 600 }}>งวดที่ {i + 1}</span>
                  </div>
                  <FormGroup error={errors[pctErrRowKey]}>
                    {pctIsCustom ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Input type="number" min="1" max="100" value={row.installmentPercent}
                            onChange={e => updateInstRow(i, 'installmentPercent', e.target.value ? Number(e.target.value) : '')}
                            placeholder="0"
                            style={{ textAlign: 'right', flex: 1 }} error={errors[pctErrRowKey]} />
                          <span style={{ color: '#586782', fontSize: 12, fontWeight: 600 }}>%</span>
                        </div>
                        {row.installmentPercent === '' && hasAnyFilled && suggestedPct > 0 && (
                          <div style={{ fontSize: 10, color: '#586782', fontWeight: 600 }}>แนะนำ {suggestedPct}%</div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Select value={pctSelectValue}
                          onChange={e => {
                            const isCustom = e.target.value === 'custom'
                            setCustomPctRows(prev => ({ ...prev, [i]: isCustom }))
                            updateInstRow(i, 'installmentPercent', isCustom || e.target.value === '' ? '' : Number(e.target.value))
                          }}
                          error={errors[pctErrRowKey]} style={selectStyle}>
                          <option value="">— เลือก % —</option>
                          {INSTALLMENT_PERCENT_PRESETS.map(p => <option key={p} value={p}>{p}%</option>)}
                          <option value="custom">ระบุเอง</option>
                        </Select>
                        {row.installmentPercent === '' && hasAnyFilled && suggestedPct > 0 && (
                          <div style={{ marginTop: 3, fontSize: 10, color: '#586782', fontWeight: 600 }}>แนะนำ {suggestedPct}%</div>
                        )}
                      </>
                    )}
                  </FormGroup>
                  {totalAmt > 0 && (
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: '#004081', textAlign: 'right', marginTop: 'auto' }}>
                      {formatCurrency(totalAmt)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>รวมสัดส่วนงวด</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pctOk ? '#001122' : '#F3554F' }}>{totalPct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 6, background: '#D0D6DF', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(Math.max(totalPct, 0), 100)}%`, background: pctOk ? '#66C5C5' : '#F3554F', transition: 'width 0.2s' }} />
          </div>
        </div>

        {/* Combined selling/cost summary */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 6, padding: '12px 14px', borderRadius: 4,
          background: '#F2F6F8',
        }}>
          <span style={{ fontSize: 13, color: '#586782', fontWeight: 700 }}>รวม {summaryLabel}</span>
          <span style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>
              ราคาทุน <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: '#586782' }}>{formatCurrency(costTotal)}</span>
            </span>
            <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>
              ราคาขาย <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: '#004081' }}>{formatCurrency(sellingTotal)}</span>
            </span>
          </span>
        </div>

        {errors[pctErrKey] && <div style={{ fontSize: 12, color: '#F3554F' }}>{errors[pctErrKey]}</div>}
      </div>
    )
  }

  /* ── Quotation card wrapper ── */
  const quotationCard = (quotationNo: string, label: string, headerGradient: string, body: React.ReactNode) => (
    <div style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #D0D6DF', background: '#FFFFFF' }}>
      {quotationHeader(quotationNo, label, headerGradient)}
      {body}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760, margin: '0 auto' }}>

      {isResubmit && initialRequest?.approvalResult && (
        <Alert type="error" title="เหตุผลที่ถูก Reject ครั้งก่อน">
          {initialRequest.approvalResult.customerComment && (
            <div style={{ marginTop: 4 }}><strong>ลูกค้า:</strong> {initialRequest.approvalResult.customerComment}</div>
          )}
          {initialRequest.approvalResult.hardwareComment && (
            <div style={{ marginTop: 4 }}><strong>Hardware:</strong> {initialRequest.approvalResult.hardwareComment}</div>
          )}
          {initialRequest.approvalResult.swComment && (
            <div style={{ marginTop: 4 }}><strong>Software &amp; Installation:</strong> {initialRequest.approvalResult.swComment}</div>
          )}
        </Alert>
      )}

      {/* ─── 1. ข้อมูลคำขอ ─── */}
      <Card title="1. ข้อมูลคำขอ">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <FormGroup label="Proposal No." required error={errors.proposalNo}>
            <Input value={String(fd.proposalNo || '')} onChange={e => update({ proposalNo: e.target.value })} placeholder="PRO-2026-001" error={errors.proposalNo} />
          </FormGroup>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#586782', marginBottom: 8 }}>
              ประเภทการขาย <span style={{ color: '#F3554F' }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {SALE_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => update({ saleType: t.value })} style={segBtn(saleType === t.value)}>
                  <RadioDot active={saleType === t.value} />
                  {t.label}
                </button>
              ))}
            </div>
            {errors.saleType && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 4 }}>{errors.saleType}</div>}
          </div>
        </div>
      </Card>

      {/* ─── 2. ข้อมูลลูกค้า ─── */}
      <Card title="2. ข้อมูลลูกค้า">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#586782', marginBottom: 8 }}>
              ประเภทลูกค้า <span style={{ color: '#F3554F' }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {CUSTOMER_TYPES.map(type => (
                <button key={type} type="button"
                  onClick={() => { update({ customerType: type }); setExistingDropdownOpen(false); setResellerDropdownOpen(false) }}
                  style={segBtn(customerType === type)}>
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
                        <FaXmark size={16} />
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
                <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Reseller</div>
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
                          <FaXmark size={16} />
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
      </Card>

      {/* ─── Quotation cards (always 2 blocks) ─── */}
      {quotationCard(hwQuotationNo, 'Hardware', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', (
        <>
          <div style={{ padding: '18px 16px 0' }}>
            {priceTable([{ label: 'Hardware', spKey: 'hardwareSellingPrice', costKey: 'hardwareCost' }])}
          </div>
          {renderPaymentBlock('hw', hwSelling, hwCost, 'Hardware')}
        </>
      ))}

      {quotationCard(swQuotationNo, 'Software & Installation', 'linear-gradient(135deg, #66C5C5 0%, #004081 100%)', (
        <>
          <div style={{ padding: '18px 16px 0' }}>
            {priceTable([
              { label: 'Software', spKey: 'softwareSellingPrice', costKey: 'softwareCost' },
              { label: 'Installation', spKey: 'installationSellingPrice', costKey: 'installationCost' },
            ])}
          </div>
          {renderPaymentBlock('sw', serviceSelling, serviceCost, 'Software & Installation')}
        </>
      ))}

      {/* ─── สรุปรวมทั้งหมด ─── */}
      <Card title="สรุปรวมทั้งหมด" noPad>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F2F2F2', borderBottom: '1px solid #D0D6DF' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#004081', fontSize: 12.5 }}>รายการ</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#004081', fontSize: 12.5 }}>ราคาทุน</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#004081', fontSize: 12.5 }}>ราคาขาย</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #F2F6F8' }}>
              <td style={{ padding: '12px 14px' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#001122' }}>{hwQuotationNo}</span>
                <span style={{ color: '#586782', fontWeight: 500, marginLeft: 8 }}>Hardware</span>
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(hwCost, '#586782', undefined, 500)}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(hwSelling, '#004081', undefined, 600)}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 14px' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#001122' }}>{swQuotationNo}</span>
                <span style={{ color: '#586782', fontWeight: 500, marginLeft: 8 }}>Software &amp; Installation</span>
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(serviceCost, '#586782', undefined, 500)}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(serviceSelling, '#004081', undefined, 600)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1.5px solid #D0D6DF', background: '#F8F9FA' }}>
              <td style={{ padding: '14px', fontWeight: 700, fontSize: 14, color: '#001122' }}>รวมทั้งหมด</td>
              <td style={{ padding: '14px', textAlign: 'right' }}>{summaryAmount(totalCost, '#586782')}</td>
              <td style={{ padding: '14px', textAlign: 'right' }}>{summaryAmount(totalSelling, '#004081', 16)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* ─── Footer ─── */}
      <div style={{ background: '#fff', borderRadius: 4, padding: '20px 24px', border: '1px solid #D0D6DF' }}>
        {submitError && <div style={{ marginBottom: 12, fontSize: 12, color: '#F3554F' }}>{submitError}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#004081', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: '#586782', fontWeight: 500, lineHeight: 1.5 }}>
              ตรวจสอบแล้ว ข้อมูลถูกต้องครบถ้วน
            </span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {!isPendingEdit && (
              <Button variant="ghost" icon={<FaFloppyDisk size={15} />} onClick={handleDraft} loading={draftLoading} disabled={submitLoading}>
                บันทึกแบบร่าง
              </Button>
            )}
            <Button icon={<FaPaperPlane size={15} />} onClick={handleSubmit} loading={submitLoading} disabled={draftLoading || !confirmed}>
              {isPendingEdit ? 'บันทึกการแก้ไข' : isResubmit ? 'ส่งขออนุมัติอีกครั้ง' : 'ส่งขออนุมัติ'}
            </Button>
          </div>
        </div>
      </div>

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
