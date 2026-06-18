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
  1: [
    { label: '100', percents: [100] },
  ],
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

export function RequestFormStepper({
  initialRequest, currentUser, onSaveDraft, onSubmit, onResubmit, isResubmit = false,
}: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>(
    initialRequest ? flattenRequest(initialRequest) : getDefaults(currentUser),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Customer combobox state
  const [existingDropdownOpen, setExistingDropdownOpen] = useState(false)
  const [existingResults, setExistingResults] = useState<Customer[]>([])
  const [resellerDropdownOpen, setResellerDropdownOpen] = useState(false)
  const [resellerResults, setResellerResults] = useState<Customer[]>([])

  // Submit state
  const [confirmed, setConfirmed] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [customPercentRows, setCustomPercentRows] = useState<Record<number, boolean>>({})
  const [customCreditTerm, setCustomCreditTerm] = useState(false)

  const fd = formData
  const saleType = String(fd.saleType || '') as SaleType
  const separateQuotation = saleType === 'hardware_software_installation'
  const customerType = String(fd.customerType || '') as CustomerType | ''
  const nc = (fd.newCustomer as Record<string, string>) ?? {}
  const ec = (fd.existingCustomer as Record<string, unknown>) ?? {}
  const rs = (fd.reseller as Record<string, string>) ?? {}
  const installmentCount = numVal(fd.installmentCount) || 1
  const installments = (fd.installments as InstRow[]) ?? []
  const proposalNo = String(fd.proposalNo || '')
  const hardwareQuotationNo = proposalNo ? `${proposalNo}-1` : 'Quotation-1'
  const serviceQuotationNo = proposalNo ? `${proposalNo}-${separateQuotation ? '2' : '1'}` : `Quotation-${separateQuotation ? '2' : '1'}`

  /* Sync installment rows when count changes */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const current = [...installments]
    while (current.length < installmentCount) {
      current.push({ installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' })
    }
    update({ installments: current.slice(0, installmentCount) })
  }, [installmentCount])

  /* Totals */
  const hwSelling   = numVal(fd.hardwareSellingPrice)
  const hwCost      = numVal(fd.hardwareCost)
  const swSelling   = numVal(fd.softwareSellingPrice)
  const swCost      = numVal(fd.softwareCost)
  const instSelling = numVal(fd.installationSellingPrice)
  const instCost    = numVal(fd.installationCost)
  const serviceSelling = swSelling + instSelling
  const serviceCost = swCost + instCost
  const totalSelling = hwSelling + serviceSelling
  const totalCost = hwCost + serviceCost

  const totalPct = calcTotalInstallmentPercent(installments.slice(0, installmentCount))
  const pctOk = Math.abs(totalPct - 100) < 0.01
  const creditTermDays = numVal(fd.creditTermDays)
  const creditTermIsCustom = customCreditTerm || (fd.creditTermDays !== '' && !CREDIT_TERM_PRESETS.includes(creditTermDays))
  const creditTermPresetValue = fd.creditTermDays === '' ? '' : (CREDIT_TERM_PRESETS.includes(creditTermDays) ? String(creditTermDays) : 'custom')

  function update(patch: Record<string, unknown>) {
    setFormData(prev => ({ ...prev, ...patch }))
  }

  /* ── Existing-customer combobox ── */
  async function openExistingDropdown(query = '') {
    const res = await searchCustomers(query)
    setExistingResults(res)
    setExistingDropdownOpen(true)
  }
  async function onExistingType(q: string) {
    update({ existingCustomer: { ...ec, companyName: q }, existingCustomerId: '' })
    const res = await searchCustomers(q)
    setExistingResults(res)
    setExistingDropdownOpen(true)
  }
  function selectExisting(c: Customer) {
    update({
      existingCustomerId: c.id,
      existingCustomer: { companyName: c.companyName, taxId: c.taxId ?? '', defaultCreditTerm: c.defaultCreditTerm ?? 0, contactPerson: c.contactPerson ?? '', contactPhone: c.contactPhone ?? '' },
      creditTermDays: c.defaultCreditTerm ?? 0,
    })
    setCustomCreditTerm(false)
    setExistingDropdownOpen(false)
    setExistingResults([])
  }

  /* ── Reseller combobox ── */
  async function openResellerDropdown(query = '') {
    const res = await searchCustomers(query)
    setResellerResults(res)
    setResellerDropdownOpen(true)
  }
  async function onResellerType(q: string) {
    update({ reseller: { ...rs, resellerCompanyName: q, resellerId: '' } })
    const res = await searchCustomers(q)
    setResellerResults(res)
    setResellerDropdownOpen(true)
  }
  function selectReseller(c: Customer) {
    update({
      reseller: { ...rs, resellerId: c.id, resellerCompanyName: c.companyName, defaultCreditTerm: c.defaultCreditTerm ?? 0 },
      creditTermDays: c.defaultCreditTerm ?? 0,
    })
    setCustomCreditTerm(false)
    setResellerDropdownOpen(false)
    setResellerResults([])
  }

  function updateInst(i: number, field: keyof InstRow, value: unknown) {
    const updated = [...installments]
    if (!updated[i]) updated[i] = { installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' }
    updated[i] = { ...updated[i], [field]: value }
    update({ installments: updated })
  }

  function applyInstallmentPreset(percents: number[]) {
    const updated = percents.map((percent, idx) => ({
      ...(installments[idx] || { creditTermDays: 0, paymentCondition: 'on_delivery' as PaymentCondition }),
      installmentPercent: percent,
    }))
    setCustomPercentRows({})
    update({ installmentCount: percents.length, installments: updated })
  }

  function applyCustomInstallments() {
    const updated = Array.from({ length: installmentCount }, (_, idx) => ({
      ...(installments[idx] || { creditTermDays: 0, paymentCondition: 'on_delivery' as PaymentCondition }),
      installmentPercent: '' as '',
    }))
    setCustomPercentRows(Object.fromEntries(Array.from({ length: installmentCount }, (_, idx) => [idx, true])))
    update({ installments: updated })
  }

  function changeInstallmentCount(next: number) {
    const clamped = Math.max(1, Math.min(4, next))
    setCustomPercentRows(prev => Object.fromEntries(Object.entries(prev).filter(([idx]) => Number(idx) < clamped)))
    update({ installmentCount: clamped })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!String(fd.proposalNo || '').trim()) e.proposalNo = 'กรุณาระบุ'
    if (!saleType) e.saleType = 'กรุณาเลือก'
    if (!customerType) e.customerType = 'กรุณาเลือก'
    if (customerType === 'new' && !nc?.companyName?.trim()) e['new.companyName'] = 'กรุณาระบุชื่อบริษัท'
    if (customerType === 'existing' && !String(ec.companyName || '').trim()) e.existingCompanyName = 'กรุณาระบุหรือค้นหาบริษัท'
    if (customerType === 'reseller') {
      if (!rs?.resellerCompanyName?.trim()) e['res.resellerCompanyName'] = 'กรุณาระบุหรือค้นหา Reseller'
      if (!rs?.endCustomerCompanyName?.trim()) e['res.endCustomerCompanyName'] = 'กรุณาระบุลูกค้าปลายทาง'
    }
    if (numVal(fd.hardwareSellingPrice) <= 0) e.hwSell = 'กรุณาระบุราคาขาย Hardware'
    if (numVal(fd.creditTermDays) < 0 || fd.creditTermDays === '') e.creditTermDays = 'กรุณาระบุ Credit Term'
    installments.slice(0, installmentCount).forEach((row, i) => {
      if (!row.installmentPercent) e[`inst${i}.pct`] = 'ระบุ%'
    })
    if (!pctOk && installmentCount > 0) e.totalPct = `รวม ${totalPct.toFixed(1)}% ≠ 100%`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleDraft() {
    setDraftLoading(true); setSubmitError('')
    try { await onSaveDraft(formData) } catch (e: unknown) { setSubmitError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด') }
    finally { setDraftLoading(false) }
  }

  async function handleSubmit() {
    if (!validate()) { setSubmitError('กรุณากรอกข้อมูลให้ครบถ้วน'); return }
    if (!confirmed) { setSubmitError('กรุณายืนยันข้อมูลก่อนส่ง'); return }
    setSubmitLoading(true); setSubmitError('')
    try {
      if (isResubmit && onResubmit) await onResubmit(formData)
      else await onSubmit(formData)
    } catch (e: unknown) { setSubmitError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด') }
    finally { setSubmitLoading(false) }
  }

  /* ── Shared styles ── */
  const comboDropdown = (
    results: Customer[],
    visible: boolean,
    onSelect: (c: Customer) => void,
  ) => visible && (
    <div style={{ position: 'relative', zIndex: 1, width: '100%', background: '#fff', border: '1px solid #D0D6DF', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,64,129,0.12)', overflowY: 'auto', maxHeight: 220, marginTop: 6 }}>
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
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: '0 16px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F2F6F8' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#001122' }}>{label}</div>
      <FormGroup label="ราคาขาย (THB)" error={spKey === 'hardwareSellingPrice' ? errors.hwSell : undefined}>
        <Input
          type="number" min="0" step="1000"
          value={String(fd[spKey] ?? '')}
          onChange={e => update({ [spKey]: e.target.value ? Number(e.target.value) : '' })}
          style={{ textAlign: 'right' }}
          error={spKey === 'hardwareSellingPrice' ? errors.hwSell : undefined}
        />
      </FormGroup>
      <FormGroup label="ราคาทุน (THB)">
        <Input
          type="number" min="0" step="1000"
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

  const selectStyle: React.CSSProperties = { width: '100%', height: 38 }
  const summaryAmount = (value: number, color = '#001122') => (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color }}>
      {formatCurrency(value)}
    </span>
  )
  const quotationHeader = (quotationNo: string, groupLabel: string, color: string) => (
    <div style={{ background: color, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 800, color: '#fff' }}>
        {quotationNo}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.78)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {groupLabel}
      </span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {isResubmit && initialRequest?.approvalResult && (
        <Alert type="error" title="เหตุผลที่ถูก Reject ครั้งก่อน">
          <div style={{ marginTop: 4 }}>{initialRequest.approvalResult.decisionComment}</div>
          {initialRequest.approvalResult.suggestion && (
            <div style={{ marginTop: 4, color: '#586782' }}>{initialRequest.approvalResult.suggestion}</div>
          )}
        </Alert>
      )}

      {/* ─── Section 1: ข้อมูลคำขอและลูกค้า ─── */}
      <Card title="ข้อมูลคำขอและลูกค้า">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ข้อมูลคำขอ</div>
            <FormGroup label="Proposal No." required error={errors.proposalNo}>
              <Input value={String(fd.proposalNo || '')} onChange={e => update({ proposalNo: e.target.value })} placeholder="PRO-2026-001" error={errors.proposalNo} />
            </FormGroup>

            <FormGroup label="ประเภทการขาย" required error={errors.saleType}>
              <Select value={saleType} onChange={e => update({ saleType: e.target.value })} error={errors.saleType}>
                <option value="">— เลือกประเภท —</option>
                {SALE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </FormGroup>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, borderLeft: '1px solid #D0D6DF', paddingLeft: 28, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ข้อมูลลูกค้า</div>

            <FormGroup label="ประเภทลูกค้า" required error={errors.customerType}>
              <Select
                value={customerType}
                onChange={e => {
                  update({ customerType: e.target.value })
                  setExistingDropdownOpen(false)
                  setResellerDropdownOpen(false)
                }}
                error={errors.customerType}
              >
                <option value="">— เลือกประเภทลูกค้า —</option>
                {CUSTOMER_TYPES.map(type => <option key={type} value={type}>{CUSTOMER_TYPE_LABELS[type]}</option>)}
              </Select>
            </FormGroup>

            {/* ลูกค้าใหม่ */}
            {customerType === 'new' && (
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>ข้อมูลลูกค้าใหม่</div>
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
              </div>
            )}

            {/* ลูกค้าเก่า — combobox */}
            {customerType === 'existing' && (
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>เลือกลูกค้าเก่า</div>
                <FormGroup label="ชื่อบริษัท" required error={errors.existingCompanyName}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <Input
                        value={String(ec.companyName ?? '')}
                        onChange={e => onExistingType(e.target.value)}
                        onFocus={() => openExistingDropdown()}
                        onClick={() => openExistingDropdown()}
                        onBlur={() => setTimeout(() => setExistingDropdownOpen(false), 150)}
                        placeholder="เลือกลูกค้าจากรายการ หรือพิมพ์เพื่อกรอง"
                        error={errors.existingCompanyName}
                        style={{ paddingRight: ec.companyName ? 32 : undefined }}
                      />
                      {!!ec.companyName && (
                        <button
                          onClick={() => update({ existingCustomerId: '', existingCustomer: { companyName: '', defaultCreditTerm: 0 } })}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#929EB4', padding: 2, display: 'flex' }}
                        >
                          <X size={14} />
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
                  <FormGroup label="ผู้ติดต่อ">
                    <Input value={String(ec.contactPerson ?? '')} onChange={e => update({ existingCustomer: { ...ec, contactPerson: e.target.value } })} placeholder="ชื่อ-นามสกุล" />
                  </FormGroup>
                  <FormGroup label="เบอร์โทร">
                    <Input value={String(ec.contactPhone ?? '')} onChange={e => update({ existingCustomer: { ...ec, contactPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
                  </FormGroup>
                </div>
              </div>
            )}

            {/* Reseller — combobox */}
            {customerType === 'reseller' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 2 }}>
                {/* Reseller combobox */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Reseller</div>
                  <FormGroup error={errors['res.resellerCompanyName']}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'relative' }}>
                        <Input
                          value={rs.resellerCompanyName ?? ''}
                          onChange={e => onResellerType(e.target.value)}
                          onFocus={() => openResellerDropdown()}
                          onClick={() => openResellerDropdown()}
                          onBlur={() => setTimeout(() => setResellerDropdownOpen(false), 150)}
                          placeholder="เลือก Reseller จากรายการ หรือพิมพ์เพื่อกรอง"
                          error={errors['res.resellerCompanyName']}
                          style={{ paddingRight: rs.resellerCompanyName ? 32 : undefined }}
                        />
                        {rs.resellerCompanyName && (
                          <button
                            onClick={() => update({ reseller: { ...rs, resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0 } })}
                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#929EB4', padding: 2, display: 'flex' }}
                          >
                            <X size={14} />
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

                {/* End Customer */}
                <div style={{ borderTop: '1px solid #D0D6DF', paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>ลูกค้าปลายทาง (End Customer)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                    <FormGroup label="ชื่อบริษัทปลายทาง" required error={errors['res.endCustomerCompanyName']} style={{ gridColumn: 'span 2' } as React.CSSProperties}>
                      <Input
                        value={rs.endCustomerCompanyName ?? ''}
                        onChange={e => update({ reseller: { ...rs, endCustomerCompanyName: e.target.value } })}
                        placeholder="ชื่อบริษัทที่ Reseller จะนำสินค้าไปขายต่อ..."
                        error={errors['res.endCustomerCompanyName']}
                      />
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
        </div>
      </Card>

      {/* ─── Section 3: ราคา ─── */}
      <Card title="ราคาขายและต้นทุน / ใบเสนอราคา">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Hardware group */}
          <div style={{ border: '1px solid #D0D6DF', borderRadius: 10, overflow: 'hidden' }}>
            {quotationHeader(hardwareQuotationNo, 'Hardware', '#002B5C')}
            <div style={{ padding: '0 14px' }}>
              {priceRow('Hardware', 'hardwareSellingPrice', 'hardwareCost')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', fontSize: 13, background: '#FAFBFC', borderTop: '1px solid #E2E8F0' }}>
              <span style={{ color: '#586782', fontWeight: 600 }}>รวม Hardware</span>
              {plainAmount(hwSelling)}
            </div>
          </div>

          {/* Software & Installation group */}
          <div style={{ border: '1px solid #D0D6DF', borderRadius: 10, overflow: 'hidden' }}>
            {quotationHeader(serviceQuotationNo, 'Software & Installation', '#3D5580')}
            <div style={{ padding: '0 14px' }}>
              {priceRow('Software', 'softwareSellingPrice', 'softwareCost')}
              {priceRow('Installation', 'installationSellingPrice', 'installationCost')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', fontSize: 13, background: '#FAFBFC', borderTop: '1px solid #E2E8F0' }}>
              <span style={{ color: '#586782', fontWeight: 600 }}>รวม Software &amp; Installation</span>
              {plainAmount(serviceSelling, '#3D5580')}
            </div>
          </div>

        </div>
      </Card>

      {/* ─── Section 4: งวดชำระ ─── */}
      <Card title="งวดชำระและ Credit Term">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18, alignItems: 'start' }}>
            <FormGroup label="Credit Term" required error={errors.creditTermDays}>
              {creditTermIsCustom ? (
                <Input
                  type="number"
                  min="0"
                  value={String(fd.creditTermDays ?? '')}
                  onChange={e => update({ creditTermDays: e.target.value !== '' ? Number(e.target.value) : '' })}
                  placeholder="ระบุเอง"
                  error={errors.creditTermDays}
                />
              ) : (
                <Select
                  value={creditTermPresetValue}
                  onChange={e => {
                    const isCustom = e.target.value === 'custom'
                    setCustomCreditTerm(isCustom)
                    update({ creditTermDays: isCustom || e.target.value === '' ? '' : Number(e.target.value) })
                  }}
                  error={errors.creditTermDays}
                  style={selectStyle}
                >
                  <option value="">— เลือกวัน —</option>
                  {CREDIT_TERM_PRESETS.map(days => <option key={days} value={days}>{days} วัน</option>)}
                  <option value="custom">ระบุเอง</option>
                </Select>
              )}
              {fd.creditTermDays !== '' && fd.creditTermDays !== undefined && (
                <span style={{ fontSize: 11, color: '#66C5C5', marginTop: 2, fontWeight: 600 }}>{formatCreditTerm(creditTermDays)}</span>
              )}
            </FormGroup>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#001122', marginBottom: 5 }}>จำนวนงวด</div>
              <div style={{ display: 'grid', gridTemplateColumns: '38px 92px 38px', alignItems: 'center', border: '1px solid #D0D6DF', borderRadius: 8, overflow: 'hidden', background: '#fff', height: 38, width: 168, boxSizing: 'border-box' }}>
                <button
                  type="button"
                  disabled={installmentCount <= 1}
                  onClick={() => changeInstallmentCount(installmentCount - 1)}
                  style={{ height: 38, border: 'none', borderRight: '1px solid #D0D6DF', background: installmentCount <= 1 ? '#F2F6F8' : '#fff', color: installmentCount <= 1 ? '#C7CEDA' : '#004081', fontSize: 18, fontWeight: 700, cursor: installmentCount <= 1 ? 'default' : 'pointer' }}
                >
                  -
                </button>
                <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#001122' }}>
                  {installmentCount} งวด
                </div>
                <button
                  type="button"
                  disabled={installmentCount >= 4}
                  onClick={() => changeInstallmentCount(installmentCount + 1)}
                  style={{ height: 38, border: 'none', borderLeft: '1px solid #D0D6DF', background: installmentCount >= 4 ? '#F2F6F8' : '#fff', color: installmentCount >= 4 ? '#C7CEDA' : '#004081', fontSize: 18, fontWeight: 700, cursor: installmentCount >= 4 ? 'default' : 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#929EB4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>สัดส่วนงวดที่แนะนำ</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(INSTALLMENT_PRESETS[installmentCount] ?? []).slice(0, 4).map(preset => {
                const active = preset.percents.every((percent, idx) => numVal(installments[idx]?.installmentPercent) === percent)
                return (
                  <button key={preset.label} type="button" onClick={() => applyInstallmentPreset(preset.percents)}
                    style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${active ? '#004081' : '#D0D6DF'}`,
                      background: active ? '#004081' : '#fff',
                      color: active ? '#fff' : '#586782' }}
                  >
                    {preset.label}
                  </button>
                )
              })}
              <button type="button"
                onClick={applyCustomInstallments}
                style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1.5px dashed #586782',
                  background: Object.values(customPercentRows).some(Boolean) ? '#586782' : '#fff',
                  color: Object.values(customPercentRows).some(Boolean) ? '#fff' : '#586782' }}
              >
                ระบุเอง
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${installmentCount}, 1fr)`, gap: 8 }}>
            {installments.slice(0, installmentCount).map((row, i) => {
              const pct = numVal(row.installmentPercent)
              const pctIsCustom = customPercentRows[i] || (row.installmentPercent !== '' && !INSTALLMENT_PERCENT_PRESETS.includes(pct))
              const pctSelectValue = row.installmentPercent === '' ? (customPercentRows[i] ? 'custom' : '') : (INSTALLMENT_PERCENT_PRESETS.includes(pct) ? String(pct) : 'custom')
              const suggestedPct = Math.max(0, Math.min(100, 100 - (totalPct - pct)))
              const totalAmt = totalSelling > 0 && pct > 0 ? calcInstallmentAmount(totalSelling, pct) : 0
              return (
                <div key={i} style={{ background: '#FAFBFC', border: `1px solid ${errors[`inst${i}.pct`] ? '#F3554F' : '#D0D6DF'}`, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#004081', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 11, color: '#929EB4', fontWeight: 600 }}>งวดที่ {i + 1}</span>
                  </div>
                  <FormGroup error={errors[`inst${i}.pct`]}>
                    {pctIsCustom ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Input type="number" min="1" max="100" value={row.installmentPercent}
                          onChange={e => updateInst(i, 'installmentPercent', e.target.value ? Number(e.target.value) : '')}
                          placeholder={`แนะนำ ${suggestedPct}%`}
                          style={{ textAlign: 'right', flex: 1 }} error={errors[`inst${i}.pct`]} />
                        <span style={{ color: '#586782', fontSize: 12, fontWeight: 600 }}>%</span>
                      </div>
                    ) : (
                      <>
                        <Select
                          value={pctSelectValue}
                          onChange={e => {
                            const isCustom = e.target.value === 'custom'
                            setCustomPercentRows(prev => ({ ...prev, [i]: isCustom }))
                            updateInst(i, 'installmentPercent', isCustom || e.target.value === '' ? '' : Number(e.target.value))
                          }}
                          error={errors[`inst${i}.pct`]}
                          style={selectStyle}
                        >
                          <option value="">— เลือก % —</option>
                          {INSTALLMENT_PERCENT_PRESETS.map(percent => <option key={percent} value={percent}>{percent}%</option>)}
                          <option value="custom">ระบุเอง</option>
                        </Select>
                        {row.installmentPercent === '' && suggestedPct > 0 && (
                          <div style={{ marginTop: 4, fontSize: 10, color: '#929EB4', fontWeight: 600 }}>
                            แนะนำ {suggestedPct}%
                          </div>
                        )}
                      </>
                    )}
                  </FormGroup>
                  {totalAmt > 0 && (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#004081', textAlign: 'right', paddingTop: 8, borderTop: '1px solid #E2E8F0', marginTop: 'auto' }}>
                      {formatCurrency(totalAmt)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#586782', fontWeight: 600 }}>รวมสัดส่วนงวด</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pctOk ? '#66C5C5' : '#F3554F' }}>
                {totalPct.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(Math.max(totalPct, 0), 100)}%`, background: pctOk ? '#66C5C5' : '#F3554F', transition: 'width 0.2s' }} />
            </div>
          </div>

          {errors.totalPct && <div style={{ fontSize: 12, color: '#F3554F' }}>{errors.totalPct}</div>}
        </div>
      </Card>

      {/* ─── Section 5: สรุปรวมทั้งหมด ─── */}
      <Card title="สรุปรวมทั้งหมด" noPad>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F2F6F8', borderBottom: '1px solid #D0D6DF' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>รายการ</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาขาย</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาทุน</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: `${hardwareQuotationNo} Hardware`, selling: hwSelling, cost: hwCost },
              { label: `${serviceQuotationNo} Software & Installation`, selling: serviceSelling, cost: serviceCost },
            ].map(row => (
              <tr key={row.label} style={{ borderBottom: '1px solid #F2F6F8' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#001122' }}>{row.label}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{summaryAmount(row.selling, '#004081')}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{summaryAmount(row.cost, '#586782')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #D0D6DF', background: '#FAFBFC' }}>
              <td style={{ padding: '11px 12px', fontWeight: 700, color: '#001122' }}>รวมทั้งหมด</td>
              <td style={{ padding: '11px 12px', textAlign: 'right' }}>{summaryAmount(totalSelling, '#004081')}</td>
              <td style={{ padding: '11px 12px', textAlign: 'right' }}>{summaryAmount(totalCost, '#586782')}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* ─── ยืนยันและส่ง ─── */}
      <div style={{ background: '#fff', border: '1px solid #D0D6DF', borderRadius: 14, padding: '20px 24px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 16 }}>
          <input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setSubmitError('') }}
            style={{ marginTop: 2, accentColor: '#004081', width: 16, height: 16 }} />
          <span style={{ fontSize: 14, lineHeight: 1.5, color: '#001122' }}>
            ข้าพเจ้ายืนยันว่าข้อมูลที่กรอกถูกต้อง และพร้อมสำหรับการพิจารณาอนุมัติ
          </span>
        </label>
        {submitError && <div style={{ marginBottom: 12, fontSize: 12, color: '#F3554F' }}>{submitError}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" icon={<Save size={15} />} onClick={handleDraft} loading={draftLoading} disabled={submitLoading}>
            บันทึกแบบร่าง
          </Button>
          <Button icon={<Send size={15} />} onClick={handleSubmit} loading={submitLoading} disabled={draftLoading}>
            {isResubmit ? 'ส่งขออนุมัติอีกครั้ง' : 'ส่งขออนุมัติ'}
          </Button>
        </div>
      </div>

    </div>
  )
}

function getDefaults(user: CurrentUser): Record<string, unknown> {
  return {
    salesName: user.name,
    salesEmail: user.email,
    salesId: user.id,
    proposalNo: '',
    projectName: '',
    saleType: '',
    customerType: '',
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0, endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerPhone: '' },
    hardwareSellingPrice: '',
    hardwareCost: '',
    softwareSellingPrice: '',
    softwareCost: 0,
    installationSellingPrice: '',
    installationCost: 0,
    creditTermDays: 0,
    paymentCondition: 'on_delivery',
    installmentCount: 1,
    installments: [{ installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' }],
  }
}

function flattenRequest(req: Request): Record<string, unknown> {
  const hw = req.quotationItems.filter(i => i.type === 'hardware')
  const sw = req.quotationItems.find(i => i.type === 'software')
  const inst = req.quotationItems.find(i => i.type === 'installation')

  const d: Record<string, unknown> = {
    salesName: req.salesName,
    salesEmail: req.salesEmail,
    salesId: req.salesId,
    proposalNo: req.proposalNo,
    projectName: req.projectName,
    saleType: req.saleType,
    customerType: req.customerInfo.type,
    installmentCount: req.installmentCount,
    creditTermDays: req.installments[0]?.creditTermDays ?? 0,
    paymentCondition: req.installments[0]?.paymentCondition ?? 'on_delivery',
    installments: req.installments.map(i => ({
      installmentPercent: i.installmentPercent,
      creditTermDays: i.creditTermDays,
      paymentCondition: i.paymentCondition,
    })),
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', defaultCreditTerm: 0, endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerPhone: '' },
    hardwareSellingPrice: hw.reduce((s, i) => s + i.sellingPrice, 0),
    hardwareCost: hw.reduce((s, i) => s + i.cost, 0),
    softwareSellingPrice: sw?.sellingPrice ?? '',
    softwareCost: sw?.cost ?? '',
    installationSellingPrice: inst?.sellingPrice ?? '',
    installationCost: inst?.cost ?? '',
  }

  const ci = req.customerInfo
  if (ci.type === 'new') {
    d.newCustomer = { companyName: ci.data.companyName, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  } else if (ci.type === 'existing') {
    d.existingCustomerId = ci.data.customerId
    d.existingCustomer = { companyName: ci.data.companyName, taxId: ci.data.taxId ?? '', defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  } else if (ci.type === 'reseller') {
    d.reseller = { resellerId: ci.data.resellerId, resellerCompanyName: ci.data.resellerCompanyName, defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, endCustomerCompanyName: ci.data.endCustomerCompanyName, endCustomerContactPerson: ci.data.endCustomerContactPerson ?? '', endCustomerPhone: ci.data.endCustomerPhone ?? '' }
  }

  return d
}
