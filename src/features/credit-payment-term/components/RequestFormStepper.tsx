import { useState, useEffect } from 'react'
import type { Request } from '../types/request'
import type { CurrentUser } from '../types/user'
import type { Customer, CustomerType } from '../types/customer'
import { CUSTOMER_TYPE_LABELS } from '../types/customer'
import { PAYMENT_CONDITION_LABELS, type SaleType, type PaymentCondition } from '../types/request'
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
  { value: 'hardware', label: 'Hardware Only', sub: 'Q1 เท่านั้น' },
  { value: 'hardware_software_installation', label: 'Hardware + SW & Installation', sub: 'Q1 + Q2' },
]
const CUSTOMER_TYPES: CustomerType[] = ['new', 'existing', 'reseller']

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

  const fd = formData
  const saleType = String(fd.saleType || '') as SaleType
  const showSw = saleType === 'hardware_software_installation'
  const customerType = String(fd.customerType || '') as CustomerType | ''
  const nc = (fd.newCustomer as Record<string, string>) ?? {}
  const ec = (fd.existingCustomer as Record<string, unknown>) ?? {}
  const rs = (fd.reseller as Record<string, string>) ?? {}
  const installmentCount = numVal(fd.installmentCount) || 1
  const installments = (fd.installments as InstRow[]) ?? []

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
  const hwSelling  = numVal(fd.hardwareSellingPrice)
  const hwCost     = numVal(fd.hardwareCost)
  const swSelling  = numVal(fd.softwareSellingPrice)
  const swCost     = numVal(fd.softwareCost)
  const instSelling = numVal(fd.installationSellingPrice)
  const instCost    = numVal(fd.installationCost)
  const totalSelling = hwSelling + (showSw ? swSelling + instSelling : 0)
  const totalCost    = hwCost   + (showSw ? swCost   + instCost   : 0)

  const totalPct = calcTotalInstallmentPercent(installments.slice(0, installmentCount))
  const maxCreditTerm = installments.slice(0, installmentCount).reduce((m, i) => Math.max(m, numVal(i.creditTermDays)), 0)
  const pctOk = Math.abs(totalPct - 100) < 0.01

  function update(patch: Record<string, unknown>) {
    setFormData(prev => ({ ...prev, ...patch }))
  }

  /* ── Existing-customer combobox ── */
  async function onExistingType(q: string) {
    update({ existingCustomer: { ...ec, companyName: q }, existingCustomerId: '' })
    if (q.length > 0) {
      const res = await searchCustomers(q)
      setExistingResults(res)
      setExistingDropdownOpen(res.length > 0)
    } else {
      setExistingResults([])
      setExistingDropdownOpen(false)
    }
  }
  function selectExisting(c: Customer) {
    update({
      existingCustomerId: c.id,
      existingCustomer: { companyName: c.companyName, taxId: c.taxId ?? '', defaultCreditTerm: c.defaultCreditTerm ?? 0, contactPerson: c.contactPerson ?? '', contactPhone: c.contactPhone ?? '' },
    })
    setExistingDropdownOpen(false)
    setExistingResults([])
  }

  /* ── Reseller combobox ── */
  async function onResellerType(q: string) {
    update({ reseller: { ...rs, resellerCompanyName: q, resellerId: '' } })
    if (q.length > 0) {
      const res = await searchCustomers(q)
      setResellerResults(res)
      setResellerDropdownOpen(res.length > 0)
    } else {
      setResellerResults([])
      setResellerDropdownOpen(false)
    }
  }
  function selectReseller(c: Customer) {
    update({ reseller: { ...rs, resellerId: c.id, resellerCompanyName: c.companyName } })
    setResellerDropdownOpen(false)
    setResellerResults([])
  }

  function updateInst(i: number, field: keyof InstRow, value: unknown) {
    const updated = [...installments]
    if (!updated[i]) updated[i] = { installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' }
    updated[i] = { ...updated[i], [field]: value }
    update({ installments: updated })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!String(fd.proposalNo || '').trim()) e.proposalNo = 'กรุณาระบุ'
    if (!String(fd.projectName || '').trim()) e.projectName = 'กรุณาระบุ'
    if (!saleType) e.saleType = 'กรุณาเลือก'
    if (!customerType) e.customerType = 'กรุณาเลือก'
    if (customerType === 'new' && !nc?.companyName?.trim()) e['new.companyName'] = 'กรุณาระบุชื่อบริษัท'
    if (customerType === 'existing' && !String(ec.companyName || '').trim()) e.existingCompanyName = 'กรุณาระบุหรือค้นหาบริษัท'
    if (customerType === 'reseller') {
      if (!rs?.resellerCompanyName?.trim()) e['res.resellerCompanyName'] = 'กรุณาระบุหรือค้นหา Reseller'
      if (!rs?.endCustomerCompanyName?.trim()) e['res.endCustomerCompanyName'] = 'กรุณาระบุลูกค้าปลายทาง'
    }
    if (numVal(fd.hardwareSellingPrice) <= 0) e.hwSell = 'กรุณาระบุราคาขาย Hardware'
    installments.slice(0, installmentCount).forEach((row, i) => {
      if (!row.installmentPercent) e[`inst${i}.pct`] = 'ระบุ%'
      if (!row.paymentCondition) e[`inst${i}.cond`] = 'เลือก'
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
  const radioCard = (active: boolean, color = '#004081') => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    border: `2px solid ${active ? color : '#D0D6DF'}`,
    borderRadius: 10, cursor: 'pointer',
    background: active ? `${color}12` : '#fff',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  const comboDropdown = (
    results: Customer[],
    visible: boolean,
    onSelect: (c: Customer) => void,
  ) => visible && results.length > 0 && (
    <div style={{ position: 'absolute', zIndex: 30, width: '100%', top: '100%', background: '#fff', border: '1px solid #D0D6DF', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,64,129,0.12)', overflow: 'hidden', marginTop: 2 }}>
      {results.map(c => (
        <button key={c.id}
          onMouseDown={e => { e.preventDefault(); onSelect(c) }}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #F2F6F8', fontSize: 13 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F2F6F8' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <div style={{ fontWeight: 600, color: '#001122' }}>{c.companyName}</div>
          <div style={{ color: '#929EB4', fontSize: 12, marginTop: 2 }}>Net {c.defaultCreditTerm ?? 0} วัน · {c.contactPerson}</div>
        </button>
      ))}
    </div>
  )

  const priceRow = (label: string, spKey: string, costKey: string) => (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '0 16px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F2F6F8' }}>
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
          onChange={e => update({ [costKey]: e.target.value ? Number(e.target.value) : '' })}
          style={{ textAlign: 'right' }}
        />
      </FormGroup>
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

      {/* ─── Section 1: ข้อมูลคำขอ ─── */}
      <Card title="ข้อมูลคำขอ">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
            <FormGroup label="Proposal No." required error={errors.proposalNo}>
              <Input value={String(fd.proposalNo || '')} onChange={e => update({ proposalNo: e.target.value })} placeholder="PRO-2026-001" error={errors.proposalNo} />
            </FormGroup>
            <FormGroup label="ชื่อโปรเจกต์" required error={errors.projectName}>
              <Input value={String(fd.projectName || '')} onChange={e => update({ projectName: e.target.value })} placeholder="ชื่อโปรเจกต์หรืองานที่ขาย" error={errors.projectName} />
            </FormGroup>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#586782', marginBottom: 8 }}>ประเภทการขาย <span style={{ color: '#F3554F' }}>*</span></div>
            <div style={{ display: 'flex', gap: 10 }}>
              {SALE_TYPES.map(t => (
                <label key={t.value} style={{ flex: 1, ...radioCard(saleType === t.value) }}>
                  <input type="radio" name="saleType" value={t.value} checked={saleType === t.value}
                    onChange={() => update({ saleType: t.value })} style={{ accentColor: '#004081', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: saleType === t.value ? '#004081' : '#001122' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#929EB4', marginTop: 1 }}>{t.sub}</div>
                  </div>
                </label>
              ))}
            </div>
            {errors.saleType && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 5 }}>{errors.saleType}</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FAFBFC', border: '1px solid #D0D6DF', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: '#929EB4', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sales</span>
            <span style={{ fontWeight: 600, color: '#001122', marginLeft: 4 }}>{String(fd.salesName || '')}</span>
            <span style={{ color: '#929EB4' }}>·</span>
            <span style={{ color: '#586782' }}>{String(fd.salesEmail || '')}</span>
          </div>
        </div>
      </Card>

      {/* ─── Section 2: ข้อมูลลูกค้า ─── */}
      <Card title="ข้อมูลลูกค้า">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Customer type selector */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#586782', marginBottom: 8 }}>ประเภทลูกค้า <span style={{ color: '#F3554F' }}>*</span></div>
            <div style={{ display: 'flex', gap: 10 }}>
              {CUSTOMER_TYPES.map(type => (
                <label key={type} style={{ flex: 1, ...radioCard(customerType === type, '#66C5C5') }}>
                  <input type="radio" name="customerType" value={type} checked={customerType === type}
                    onChange={() => { update({ customerType: type }); setExistingDropdownOpen(false); setResellerDropdownOpen(false) }}
                    style={{ accentColor: '#66C5C5', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: customerType === type ? '#004081' : '#001122' }}>
                    {CUSTOMER_TYPE_LABELS[type]}
                  </span>
                </label>
              ))}
            </div>
            {errors.customerType && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 5 }}>{errors.customerType}</div>}
          </div>

          {/* ลูกค้าใหม่ */}
          {customerType === 'new' && (
            <div style={{ background: '#FAFBFC', border: '1px solid #D0D6DF', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>ข้อมูลลูกค้าใหม่</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                <FormGroup label="ชื่อบริษัท" required error={errors['new.companyName']} style={{ gridColumn: 'span 2' } as React.CSSProperties}>
                  <Input value={nc.companyName ?? ''} onChange={e => update({ newCustomer: { ...nc, companyName: e.target.value } })} placeholder="บริษัท..." error={errors['new.companyName']} />
                </FormGroup>
                <FormGroup label="ผู้ติดต่อ">
                  <Input value={nc.contactPerson ?? ''} onChange={e => update({ newCustomer: { ...nc, contactPerson: e.target.value } })} />
                </FormGroup>
                <FormGroup label="เบอร์โทร">
                  <Input value={nc.contactPhone ?? ''} onChange={e => update({ newCustomer: { ...nc, contactPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
                </FormGroup>
              </div>
            </div>
          )}

          {/* ลูกค้าเก่า — combobox */}
          {customerType === 'existing' && (
            <div style={{ background: '#FAFBFC', border: '1px solid #D0D6DF', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>เลือกลูกค้าเก่า</div>
              <FormGroup label="ชื่อบริษัท" required error={errors.existingCompanyName}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <Input
                      value={String(ec.companyName ?? '')}
                      onChange={e => onExistingType(e.target.value)}
                      onFocus={async () => {
                        const q = String(ec.companyName ?? '')
                        if (q) { const r = await searchCustomers(q); setExistingResults(r); setExistingDropdownOpen(r.length > 0) }
                      }}
                      onBlur={() => setTimeout(() => setExistingDropdownOpen(false), 150)}
                      placeholder="พิมพ์เพื่อค้นหา หรือกรอกชื่อบริษัทโดยตรง"
                      error={errors.existingCompanyName}
                      style={{ paddingRight: ec.companyName ? 32 : undefined }}
                    />
                    {ec.companyName && (
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
              {fd.existingCustomerId && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(102,197,197,0.08)', border: '1px solid rgba(102,197,197,0.3)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: '#66C5C5', fontWeight: 700 }}>✓ เชื่อมกับฐานข้อมูล</span>
                  <span style={{ fontSize: 12, color: '#586782' }}>Default credit: Net {numVal(ec.defaultCreditTerm)} วัน</span>
                </div>
              )}
            </div>
          )}

          {/* Reseller — combobox */}
          {customerType === 'reseller' && (
            <div style={{ background: '#FAFBFC', border: '1px solid #D0D6DF', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Reseller combobox */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Reseller</div>
                <FormGroup error={errors['res.resellerCompanyName']}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <Input
                        value={rs.resellerCompanyName ?? ''}
                        onChange={e => onResellerType(e.target.value)}
                        onFocus={async () => {
                          const q = rs.resellerCompanyName ?? ''
                          if (q) { const r = await searchCustomers(q); setResellerResults(r); setResellerDropdownOpen(r.length > 0) }
                        }}
                        onBlur={() => setTimeout(() => setResellerDropdownOpen(false), 150)}
                        placeholder="พิมพ์เพื่อค้นหา หรือกรอกชื่อ Reseller โดยตรง"
                        error={errors['res.resellerCompanyName']}
                        style={{ paddingRight: rs.resellerCompanyName ? 32 : undefined }}
                      />
                      {rs.resellerCompanyName && (
                        <button
                          onClick={() => update({ reseller: { ...rs, resellerId: '', resellerCompanyName: '' } })}
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
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(102,197,197,0.08)', border: '1px solid rgba(102,197,197,0.3)', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: '#66C5C5', fontWeight: 700 }}>✓ เชื่อมกับฐานข้อมูล</span>
                  </div>
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
                    <Input value={rs.endCustomerContactPerson ?? ''} onChange={e => update({ reseller: { ...rs, endCustomerContactPerson: e.target.value } })} />
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

      {/* ─── Section 3: ราคา ─── */}
      <Card title="ราคาขายและต้นทุน">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Hardware */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Hardware</div>
          </div>
          {priceRow('Hardware', 'hardwareSellingPrice', 'hardwareCost')}

          {/* Software & Installation */}
          {showSw && (
            <>
              <div style={{ marginTop: 20, marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Software & Installation</div>
              </div>
              {priceRow('Software', 'softwareSellingPrice', 'softwareCost')}
              {priceRow('Installation', 'installationSellingPrice', 'installationCost')}
            </>
          )}

          {/* Total */}
          {totalSelling > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 16, paddingTop: 12, borderTop: '2px solid #D0D6DF' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#929EB4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>ราคาขายรวม</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#004081', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(totalSelling)}</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ─── Section 4: งวดชำระ ─── */}
      <Card title="งวดชำระและ Credit Term">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#001122', whiteSpace: 'nowrap' }}>จำนวนงวด</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => update({ installmentCount: n })} style={{
                  width: 38, height: 38, borderRadius: 8,
                  border: `2px solid ${installmentCount === n ? '#004081' : '#D0D6DF'}`,
                  background: installmentCount === n ? '#004081' : '#fff',
                  color: installmentCount === n ? '#fff' : '#586782',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                }}>{n}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {installments.slice(0, installmentCount).map((row, i) => {
              const amount = totalSelling > 0 && numVal(row.installmentPercent) > 0
                ? calcInstallmentAmount(totalSelling, numVal(row.installmentPercent)) : 0
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 80px 1fr 1fr auto', gap: '0 10px', alignItems: 'center', padding: '10px 14px', background: '#FAFBFC', border: `1px solid ${(errors[`inst${i}.pct`] || errors[`inst${i}.cond`]) ? '#F3554F' : '#D0D6DF'}`, borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#004081', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <FormGroup error={errors[`inst${i}.pct`]}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Input type="number" min="1" max="100" value={row.installmentPercent}
                        onChange={e => updateInst(i, 'installmentPercent', e.target.value ? Number(e.target.value) : '')}
                        style={{ textAlign: 'right', width: 56 }} error={errors[`inst${i}.pct`]} />
                      <span style={{ color: '#586782', fontSize: 13, fontWeight: 600 }}>%</span>
                    </div>
                  </FormGroup>
                  <FormGroup>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Input type="number" min="0" value={row.creditTermDays}
                        onChange={e => updateInst(i, 'creditTermDays', e.target.value !== '' ? Number(e.target.value) : 0)}
                        placeholder="0 = COD" style={{ width: 80, textAlign: 'right' }} />
                      <span style={{ color: '#586782', fontSize: 12, whiteSpace: 'nowrap' }}>วัน</span>
                      {numVal(row.creditTermDays) > 0 && (
                        <span style={{ fontSize: 11, color: '#66C5C5', fontWeight: 600 }}>{formatCreditTerm(numVal(row.creditTermDays))}</span>
                      )}
                    </div>
                  </FormGroup>
                  <FormGroup error={errors[`inst${i}.cond`]}>
                    <Select value={row.paymentCondition} onChange={e => updateInst(i, 'paymentCondition', e.target.value)} error={errors[`inst${i}.cond`]}>
                      <option value="">— เงื่อนไข —</option>
                      {(Object.entries(PAYMENT_CONDITION_LABELS) as [PaymentCondition, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </Select>
                  </FormGroup>
                  {amount > 0 && (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#004081', whiteSpace: 'nowrap', paddingLeft: 4 }}>
                      {formatCurrency(amount)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 20, padding: '10px 14px', background: pctOk && installmentCount > 0 ? 'rgba(102,197,197,0.08)' : 'rgba(243,85,79,0.06)', border: `1px solid ${pctOk && installmentCount > 0 ? '#66C5C5' : '#F3554F'}`, borderRadius: 8, fontSize: 13 }}>
            <span>รวม: <strong style={{ color: pctOk ? '#66C5C5' : '#F3554F' }}>{totalPct.toFixed(0)}%</strong>{pctOk ? ' ✓' : ' ⚠'}</span>
            <span style={{ color: '#929EB4' }}>·</span>
            <span>Max Credit Term: <strong>{formatCreditTerm(maxCreditTerm)}</strong></span>
            {totalSelling > 0 && <><span style={{ color: '#929EB4' }}>·</span><span>Total: <strong>{formatCurrency(totalSelling)}</strong></span></>}
          </div>
          {errors.totalPct && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 4 }}>{errors.totalPct}</div>}
        </div>
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
    reseller: { resellerId: '', resellerCompanyName: '', endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerPhone: '' },
    hardwareSellingPrice: '',
    hardwareCost: '',
    softwareSellingPrice: '',
    softwareCost: '',
    installationSellingPrice: '',
    installationCost: '',
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
    installments: req.installments.map(i => ({
      installmentPercent: i.installmentPercent,
      creditTermDays: i.creditTermDays,
      paymentCondition: i.paymentCondition,
    })),
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerPhone: '' },
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
    d.reseller = { resellerId: ci.data.resellerId, resellerCompanyName: ci.data.resellerCompanyName, endCustomerCompanyName: ci.data.endCustomerCompanyName, endCustomerContactPerson: ci.data.endCustomerContactPerson ?? '', endCustomerPhone: ci.data.endCustomerPhone ?? '' }
  }

  return d
}
