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
import { formatCreditTerm } from '../utils/formatters'
import { searchCustomers } from '../services/customerService'
import { Save, Send, X } from 'lucide-react'

interface InstRow { installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: PaymentCondition | '' }

interface Props {
  initialRequest?: Request
  currentUser: CurrentUser
  onSaveDraft: (data: Record<string, unknown>) => Promise<void>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onResubmit?: (data: Record<string, unknown>) => Promise<void>
  isResubmit?: boolean
}

const SALE_TYPES = [
  { value: 'hardware', label: 'Quotation เดียว' },
  { value: 'hardware_software_installation', label: 'แยก Quotation' },
]
const CUSTOMER_TYPES: CustomerType[] = ['new', 'existing', 'reseller']
const CREDIT_TERM_PRESETS = [7, 15, 30, 60, 90, 120]
const INSTALLMENT_PERCENT_PRESETS = [10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100]
const INSTALLMENT_PRESETS: Record<number, Array<{ label: string; percents: number[] }>> = {
  1: [{ label: '100', percents: [100] }],
  2: [
    { label: '50 / 50', percents: [50, 50] },
    { label: '30 / 70', percents: [30, 70] },
    { label: '40 / 60', percents: [40, 60] },
    { label: '70 / 30', percents: [70, 30] },
  ],
  3: [
    { label: '30 / 30 / 40', percents: [30, 30, 40] },
    { label: '33 / 33 / 34', percents: [33, 33, 34] },
    { label: '25 / 50 / 25', percents: [25, 50, 25] },
    { label: '20 / 30 / 50', percents: [20, 30, 50] },
  ],
  4: [
    { label: '25 / 25 / 25 / 25', percents: [25, 25, 25, 25] },
    { label: '30 / 30 / 30 / 10', percents: [30, 30, 30, 10] },
    { label: '40 / 20 / 20 / 20', percents: [40, 20, 20, 20] },
    { label: '20 / 20 / 30 / 30', percents: [20, 20, 30, 30] },
  ],
}

function numVal(v: unknown): number { return Number(v) || 0 }

/* ── Pill button styles ── */
function pillBtn(active: boolean): React.CSSProperties {
  return {
    padding: '7px 18px',
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: active ? '1.5px solid #66C5C5' : '1.5px solid #D0D6DF',
    background: '#fff',
    color: active ? '#004081' : '#929EB4',
    transition: 'border-color 0.15s, color 0.15s',
  }
}

export function RequestFormStepper({
  initialRequest, currentUser, onSaveDraft, onSubmit, onResubmit, isResubmit = false,
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
  const [hwCreditTermDays, setHwCreditTermDays] = useState<number | ''>(
    req?.installments[0]?.creditTermDays ?? 0
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
  const [hwCreditTermDropdownOpen, setHwCreditTermDropdownOpen] = useState(false)
  const [hwCustomPercentRows, setHwCustomPercentRows] = useState<Record<number, boolean>>({})

  // ── SW payment state ──
  const [swCreditTermDays, setSwCreditTermDays] = useState<number | ''>(
    req?.swInstallments?.[0]?.creditTermDays ?? 0
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
  const [swCreditTermDropdownOpen, setSwCreditTermDropdownOpen] = useState(false)
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
    update({ existingCustomerId: c.id, existingCustomer: { companyName: c.companyName, taxId: c.taxId ?? '', defaultCreditTerm: c.defaultCreditTerm ?? 0, contactPerson: c.contactPerson ?? '', contactPhone: c.contactPhone ?? '' } })
    setHwCreditTermDays(c.defaultCreditTerm ?? 0); setHwCustomCreditTerm(false)
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
    update({ reseller: { ...rs, resellerId: c.id, resellerCompanyName: c.companyName, defaultCreditTerm: c.defaultCreditTerm ?? 0 } })
    setHwCreditTermDays(c.defaultCreditTerm ?? 0); setHwCustomCreditTerm(false)
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
    if (!validate()) { setSubmitError('กรุณากรอกข้อมูลให้ครบถ้วน'); return }
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
      <div style={{ position: 'relative', zIndex: 1, width: '100%', background: '#fff', border: '1px solid #D0D6DF', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,64,129,0.10)', overflowY: 'auto', maxHeight: 220, marginTop: 6 }}>
        {results.length > 0 ? results.map(c => (
          <button key={c.id}
            onMouseDown={e => { e.preventDefault(); onSelect(c) }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #F2F6F8', fontSize: 13 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F2F6F8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
          >
            <div style={{ fontWeight: 600, color: '#001122' }}>{c.companyName}</div>
            <div style={{ color: '#929EB4', fontSize: 12, marginTop: 2 }}>Net {c.defaultCreditTerm ?? 0} วัน · {c.contactPerson}</div>
          </button>
        )) : (
          <div style={{ padding: '10px 14px', color: '#929EB4', fontSize: 13 }}>ไม่พบข้อมูลลูกค้า</div>
        )}
      </div>
    )

  const priceRow = (label: string, spKey: string, costKey: string) => (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: '0 16px', alignItems: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#001122' }}>{label}</div>
      <FormGroup label="ราคาขาย (THB)" error={spKey === 'hardwareSellingPrice' ? errors.hwSell : undefined}>
        <Input type="number" min="0" step="1000"
          value={String(fd[spKey] ?? '')}
          onChange={e => update({ [spKey]: e.target.value ? Number(e.target.value) : '' })}
          style={{ textAlign: 'right' }}
          error={spKey === 'hardwareSellingPrice' ? errors.hwSell : undefined}
        />
      </FormGroup>
      <FormGroup label="ราคาทุน (THB)">
        <Input type="number" min="0" step="1000"
          value={String(fd[costKey] ?? '')}
          onChange={e => update({ [costKey]: e.target.value ? Number(e.target.value) : 0 })}
          style={{ textAlign: 'right' }}
        />
      </FormGroup>
    </div>
  )

  const plainAmount = (value: number, color = '#004081') => (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color }}>
      {value > 0 ? formatCurrency(value) : '—'}
    </span>
  )

  const summaryAmount = (value: number, color = '#001122') => (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color }}>
      {formatCurrency(value)}
    </span>
  )

  const quotationHeader = (quotationNo: string, groupLabel: string, color: string) => (
    <div style={{ background: color, padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 800, color: '#fff' }}>
        {quotationNo}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {groupLabel}
      </span>
    </div>
  )

  /* ── Payment block (closure over component state) ── */
  function renderPaymentBlock(prefix: 'hw' | 'sw', sellingTotal: number) {
    const ctDays       = prefix === 'hw' ? hwCreditTermDays       : swCreditTermDays
    const setCtDays    = prefix === 'hw' ? setHwCreditTermDays    : setSwCreditTermDays
    const instCount    = prefix === 'hw' ? hwInstallmentCount      : swInstallmentCount
    const setInstCount = prefix === 'hw' ? setHwInstallmentCount   : setSwInstallmentCount
    const insts        = prefix === 'hw' ? hwInstallments          : swInstallments
    const setInsts     = prefix === 'hw' ? setHwInstallments       : setSwInstallments
    const isCustomCT   = prefix === 'hw' ? hwCustomCreditTerm      : swCustomCreditTerm
    const setIsCustomCT= prefix === 'hw' ? setHwCustomCreditTerm   : setSwCustomCreditTerm
    const ctDropOpen   = prefix === 'hw' ? hwCreditTermDropdownOpen : swCreditTermDropdownOpen
    const setCtDropOpen= prefix === 'hw' ? setHwCreditTermDropdownOpen : setSwCreditTermDropdownOpen
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
          <FormGroup label="Credit Term" required error={errors[ctErrKey]} style={{ width: 168 }}>
            <div style={{ position: 'relative', width: 168 }}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCtDropOpen(false) }}
            >
              <Input
                type="text" inputMode="numeric"
                value={String(ctDays ?? '')}
                onFocus={() => setCtDropOpen(true)}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '')
                  const d = v === '' ? '' : Number(v)
                  setIsCustomCT(d === '' || !CREDIT_TERM_PRESETS.includes(numVal(d)))
                  setCtDays(d)
                }}
                placeholder={creditTermIsCustom ? 'ระบุเอง' : 'เลือกวัน'}
                error={errors[ctErrKey]}
                style={{ paddingRight: 38 }}
              />
              <button type="button" onClick={() => setCtDropOpen(o => !o)}
                style={{ position: 'absolute', top: 1, right: 1, width: 36, height: 36, border: 'none', borderLeft: '1px solid #E2E8F0', borderRadius: '0 7px 7px 0', background: '#fff', color: '#4A5568', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                aria-label="เลือก Credit Term">˅</button>
              {ctDropOpen && (
                <div style={{ position: 'absolute', zIndex: 5, top: 42, left: 0, width: 168, maxHeight: 220, overflowY: 'auto', background: '#fff', border: '1px solid #D0D6DF', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,64,129,0.14)' }}>
                  {CREDIT_TERM_PRESETS.map(days => (
                    <button key={days} type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setIsCustomCT(false); setCtDays(days); setCtDropOpen(false) }}
                      style={{ display: 'block', width: '100%', padding: '9px 12px', border: 'none', borderBottom: '1px solid #F2F6F8', background: numVal(ctDays) === days ? '#EEF8F8' : '#fff', color: '#1A202C', textAlign: 'left', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {days} วัน
                    </button>
                  ))}
                  <button type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setIsCustomCT(true); setCtDays(''); setCtDropOpen(false) }}
                    style={{ display: 'block', width: '100%', padding: '9px 12px', border: 'none', background: creditTermIsCustom ? '#EEF8F8' : '#fff', color: '#1A202C', textAlign: 'left', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ระบุเอง
                  </button>
                </div>
              )}
            </div>
            {ctDays !== '' && ctDays !== undefined && (
              <span style={{ fontSize: 11, color: '#66C5C5', marginTop: 2, fontWeight: 600 }}>{formatCreditTerm(numVal(ctDays))}</span>
            )}
          </FormGroup>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#586782', marginBottom: 5 }}>จำนวนงวด</div>
            <div style={{ display: 'grid', gridTemplateColumns: '38px 88px 38px', alignItems: 'center', border: '1px solid #D0D6DF', borderRadius: 8, overflow: 'hidden', background: '#fff', height: 38, width: 164, boxSizing: 'border-box' }}>
              <button type="button" disabled={instCount <= 1} onClick={() => changeCount(instCount - 1)}
                style={{ height: 38, border: 'none', borderRight: '1px solid #D0D6DF', background: instCount <= 1 ? '#F8F9FA' : '#fff', color: instCount <= 1 ? '#C7CEDA' : '#004081', fontSize: 18, fontWeight: 700, cursor: instCount <= 1 ? 'default' : 'pointer' }}>−</button>
              <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#001122' }}>{instCount} งวด</div>
              <button type="button" disabled={instCount >= 4} onClick={() => changeCount(instCount + 1)}
                style={{ height: 38, border: 'none', borderLeft: '1px solid #D0D6DF', background: instCount >= 4 ? '#F8F9FA' : '#fff', color: instCount >= 4 ? '#C7CEDA' : '#004081', fontSize: 18, fontWeight: 700, cursor: instCount >= 4 ? 'default' : 'pointer' }}>+</button>
            </div>
          </div>
        </div>

        {/* Preset buttons */}
        <div>
          <div style={{ fontSize: 11, color: '#929EB4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>สัดส่วนที่แนะนำ</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(INSTALLMENT_PRESETS[instCount] ?? []).slice(0, 4).map(preset => {
              const active = preset.percents.every((p, idx) => numVal(insts[idx]?.installmentPercent) === p)
              return (
                <button key={preset.label} type="button" onClick={() => applyPreset(preset.percents)}
                  style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: active ? '1.5px solid #66C5C5' : '1.5px solid #D0D6DF',
                    background: '#fff', color: active ? '#004081' : '#929EB4' }}>
                  {preset.label}
                </button>
              )
            })}
            <button type="button" onClick={applyCustom}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: Object.values(customPctRows).some(Boolean) ? '1.5px solid #66C5C5' : '1.5px dashed #C7CEDA',
                background: '#fff', color: Object.values(customPctRows).some(Boolean) ? '#004081' : '#929EB4' }}>
              ระบุเอง
            </button>
          </div>
        </div>

        {/* Installment cards */}
        <div>
          <div style={{ fontSize: 11, color: '#929EB4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>รายละเอียดงวด</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${instCount}, minmax(0, 1fr))`, gap: 8 }}>
            {insts.slice(0, instCount).map((row, i) => {
              const pct = numVal(row.installmentPercent)
              const pctIsCustom = customPctRows[i] || (row.installmentPercent !== '' && !INSTALLMENT_PERCENT_PRESETS.includes(pct))
              const pctSelectValue = row.installmentPercent === '' ? (customPctRows[i] ? 'custom' : '') : (INSTALLMENT_PERCENT_PRESETS.includes(pct) ? String(pct) : 'custom')
              const suggestedPct = Math.max(0, Math.min(100, 100 - (totalPct - pct)))
              const totalAmt = sellingTotal > 0 && pct > 0 ? calcInstallmentAmount(sellingTotal, pct) : 0
              const pctErrRowKey = `${prefix}Inst${i}.pct`
              return (
                <div key={i} style={{
                  background: errors[pctErrRowKey] ? '#FEF2F2' : '#F2F6F8',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  ...(errors[pctErrRowKey] ? { outline: '1.5px solid #F3554F' } : {}),
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#004081', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 11, color: '#929EB4', fontWeight: 600 }}>งวดที่ {i + 1}</span>
                  </div>
                  <FormGroup error={errors[pctErrRowKey]}>
                    {pctIsCustom ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Input type="number" min="1" max="100" value={row.installmentPercent}
                          onChange={e => updateInstRow(i, 'installmentPercent', e.target.value ? Number(e.target.value) : '')}
                          placeholder={`แนะนำ ${suggestedPct}%`}
                          style={{ textAlign: 'right', flex: 1 }} error={errors[pctErrRowKey]} />
                        <span style={{ color: '#586782', fontSize: 12, fontWeight: 600 }}>%</span>
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
                        {row.installmentPercent === '' && suggestedPct > 0 && (
                          <div style={{ marginTop: 3, fontSize: 10, color: '#929EB4', fontWeight: 600 }}>แนะนำ {suggestedPct}%</div>
                        )}
                      </>
                    )}
                  </FormGroup>
                  {totalAmt > 0 && (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#004081', textAlign: 'right', marginTop: 'auto' }}>
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
            <span style={{ fontSize: 12, fontWeight: 700, color: pctOk ? '#66C5C5' : '#F3554F' }}>{totalPct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 6, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(Math.max(totalPct, 0), 100)}%`, background: pctOk ? '#66C5C5' : '#F3554F', transition: 'width 0.2s' }} />
          </div>
        </div>

        {errors[pctErrKey] && <div style={{ fontSize: 12, color: '#F3554F' }}>{errors[pctErrKey]}</div>}
      </div>
    )
  }

  /* ── Quotation card wrapper ── */
  const quotationCard = (quotationNo: string, label: string, headerColor: string, body: React.ReactNode) => (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 10px rgba(0,64,129,0.07)' }}>
      {quotationHeader(quotationNo, label, headerColor)}
      {body}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720, margin: '0 auto' }}>

      {isResubmit && initialRequest?.approvalResult && (
        <Alert type="error" title="เหตุผลที่ถูก Reject ครั้งก่อน">
          <div style={{ marginTop: 4 }}>{initialRequest.approvalResult.decisionComment}</div>
          {initialRequest.approvalResult.suggestion && (
            <div style={{ marginTop: 4, color: '#586782' }}>{initialRequest.approvalResult.suggestion}</div>
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
                <button key={t.value} type="button" onClick={() => update({ saleType: t.value })} style={pillBtn(saleType === t.value)}>
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
                  style={pillBtn(customerType === type)}>
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
              <FormGroup label="ผู้ติดต่อ">
                <Input value={nc.contactPerson ?? ''} onChange={e => update({ newCustomer: { ...nc, contactPerson: e.target.value } })} placeholder="ชื่อ-นามสกุล" />
              </FormGroup>
              <FormGroup label="เบอร์โทร">
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
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#929EB4', padding: 2, display: 'flex' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {comboDropdown(existingResults, existingDropdownOpen, selectExisting)}
                </div>
              </FormGroup>
              {!!fd.existingCustomerId && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#929EB4' }}>Default credit: Net {numVal(ec.defaultCreditTerm)} วัน</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginTop: 12 }}>
                <FormGroup label="ผู้ติดต่อ">
                  <Input value={String(ec.contactPerson ?? '')} onChange={e => update({ existingCustomer: { ...ec, contactPerson: e.target.value } })} placeholder="ชื่อ-นามสกุล" />
                </FormGroup>
                <FormGroup label="เบอร์โทร">
                  <Input value={String(ec.contactPhone ?? '')} onChange={e => update({ existingCustomer: { ...ec, contactPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
                </FormGroup>
              </div>
            </div>
          )}

          {customerType === 'reseller' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#929EB4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Reseller</div>
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
                        <button onClick={() => update({ reseller: { ...rs, resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0 } })}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#929EB4', padding: 2, display: 'flex' }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {comboDropdown(resellerResults, resellerDropdownOpen, selectReseller)}
                  </div>
                </FormGroup>
                {rs.resellerId && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#929EB4' }}>Default credit: Net {numVal(rs.defaultCreditTerm)} วัน</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#929EB4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>ลูกค้าปลายทาง (End Customer)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                  <FormGroup label="ชื่อบริษัทปลายทาง" required error={errors['res.endCustomerCompanyName']} style={{ gridColumn: 'span 2' } as React.CSSProperties}>
                    <Input value={rs.endCustomerCompanyName ?? ''} onChange={e => update({ reseller: { ...rs, endCustomerCompanyName: e.target.value } })} placeholder="ใส่ชื่อบริษัทปลายทาง" error={errors['res.endCustomerCompanyName']} />
                  </FormGroup>
                  <FormGroup label="ผู้ติดต่อปลายทาง">
                    <Input value={rs.endCustomerContactPerson ?? ''} onChange={e => update({ reseller: { ...rs, endCustomerContactPerson: e.target.value } })} placeholder="ชื่อ-นามสกุล" />
                  </FormGroup>
                  <FormGroup label="เบอร์โทร">
                    <Input value={rs.endCustomerPhone ?? ''} onChange={e => update({ reseller: { ...rs, endCustomerPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
                  </FormGroup>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ─── Quotation cards (always 2 blocks) ─── */}
      {quotationCard(hwQuotationNo, 'Hardware', '#002B5C', (
        <>
          <div style={{ padding: '4px 16px 0' }}>
            {priceRow('Hardware', 'hardwareSellingPrice', 'hardwareCost')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 13, background: '#F8F9FA' }}>
            <span style={{ color: '#586782', fontWeight: 600 }}>รวม Hardware</span>
            {plainAmount(hwSelling)}
          </div>
          {renderPaymentBlock('hw', hwSelling)}
        </>
      ))}

      {quotationCard(swQuotationNo, 'Software & Installation', '#3D5580', (
        <>
          <div style={{ padding: '4px 16px 0' }}>
            {priceRow('Software', 'softwareSellingPrice', 'softwareCost')}
            {priceRow('Installation', 'installationSellingPrice', 'installationCost')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 13, background: '#F8F9FA' }}>
            <span style={{ color: '#586782', fontWeight: 600 }}>รวม Software &amp; Installation</span>
            {plainAmount(serviceSelling, '#3D5580')}
          </div>
          {renderPaymentBlock('sw', serviceSelling)}
        </>
      ))}

      {/* ─── สรุปรวมทั้งหมด ─── */}
      <Card title="สรุปรวมทั้งหมด" noPad>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#929EB4', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>รายการ</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#929EB4', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาขาย</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#929EB4', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาทุน</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '11px 14px', fontWeight: 500, color: '#505050' }}>{hwQuotationNo} — Hardware</td>
              <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(hwSelling, '#004081')}</td>
              <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(hwCost, '#929EB4')}</td>
            </tr>
            <tr>
              <td style={{ padding: '11px 14px', fontWeight: 500, color: '#505050' }}>{swQuotationNo} — Software &amp; Installation</td>
              <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(serviceSelling, '#004081')}</td>
              <td style={{ padding: '11px 14px', textAlign: 'right' }}>{summaryAmount(serviceCost, '#929EB4')}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1.5px solid #D0D6DF', background: '#F8F9FA' }}>
              <td style={{ padding: '12px 14px', fontWeight: 700, color: '#001122' }}>รวมทั้งหมด</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(totalSelling, '#004081')}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>{summaryAmount(totalCost, '#929EB4')}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* ─── Footer ─── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,64,129,0.07)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: '#004081', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: '#586782', fontWeight: 500, lineHeight: 1.5 }}>
            ข้าพเจ้าขอยืนยันว่าข้อมูลข้างต้นถูกต้องและครบถ้วน
          </span>
        </label>
        {submitError && <div style={{ marginBottom: 12, fontSize: 12, color: '#F3554F' }}>{submitError}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" icon={<Save size={15} />} onClick={handleDraft} loading={draftLoading} disabled={submitLoading}>
            บันทึกแบบร่าง
          </Button>
          <Button icon={<Send size={15} />} onClick={handleSubmit} loading={submitLoading} disabled={draftLoading || !confirmed}>
            {isResubmit ? 'ส่งขออนุมัติอีกครั้ง' : 'ส่งขออนุมัติ'}
          </Button>
        </div>
      </div>

    </div>
  )
}

function getDefaults(user: CurrentUser): Record<string, unknown> {
  return {
    salesName: user.name, salesEmail: user.email, salesId: user.id,
    proposalNo: '', projectName: '',
    saleType: 'hardware',
    customerType: '',
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0, endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerPhone: '' },
    hardwareSellingPrice: '', hardwareCost: '',
    softwareSellingPrice: '', softwareCost: 0,
    installationSellingPrice: '', installationCost: 0,
  }
}

function flattenRequest(req: Request): Record<string, unknown> {
  const hw   = req.quotationItems.filter(i => i.type === 'hardware')
  const sw   = req.quotationItems.find(i => i.type === 'software')
  const inst = req.quotationItems.find(i => i.type === 'installation')

  const d: Record<string, unknown> = {
    salesName: req.salesName, salesEmail: req.salesEmail, salesId: req.salesId,
    proposalNo: req.proposalNo, projectName: req.projectName,
    saleType: req.saleType, customerType: req.customerInfo.type,
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0, endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerPhone: '' },
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
    d.existingCustomer   = { companyName: ci.data.companyName, taxId: ci.data.taxId ?? '', defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  } else if (ci.type === 'reseller') {
    d.reseller = { resellerId: ci.data.resellerId, resellerCompanyName: ci.data.resellerCompanyName, defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, endCustomerCompanyName: ci.data.endCustomerCompanyName, endCustomerContactPerson: ci.data.endCustomerContactPerson ?? '', endCustomerPhone: ci.data.endCustomerPhone ?? '' }
  }

  return d
}
