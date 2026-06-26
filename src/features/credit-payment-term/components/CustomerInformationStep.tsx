import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { FormGroup, Input, Select, Textarea } from '../../../components/ui/FormField'
import { Alert } from '../../../components/ui/Alert'
import { CUSTOMER_TYPE_LABELS, type CustomerType } from '../types/customer'
import { searchCustomers } from '../services/customerService'
import type { Customer } from '../types/customer'
import { FaChevronRight, FaChevronLeft, FaMagnifyingGlass } from 'react-icons/fa6'

interface Props {
  data: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  onNext: () => void
  onBack: () => void
}

export function CustomerInformationStep({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)

  const customerType = String(data.customerType || '') as CustomerType | ''

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!customerType) { e.customerType = 'กรุณาเลือกประเภทลูกค้า'; setErrors(e); return false }
    if (customerType === 'new') {
      const nc = data.newCustomer as Record<string, string>
      if (!nc?.companyName?.trim()) e['new.companyName'] = 'กรุณาระบุชื่อบริษัท'
    }
    if (customerType === 'existing') {
      if (!String(data.existingCustomerId || '').trim()) e.existingCustomerId = 'กรุณาเลือกลูกค้า'
    }
    if (customerType === 'reseller') {
      const r = data.reseller as Record<string, string>
      if (!r?.resellerCompanyName?.trim()) e['res.resellerCompanyName'] = 'กรุณาระบุชื่อ Reseller'
      if (!r?.endCustomerCompanyName?.trim()) e['res.endCustomerCompanyName'] = 'กรุณาระบุชื่อ End Customer'
      if (!r?.billingTo) e['res.billingTo'] = 'กรุณาเลือก Billing To'
      if (!r?.creditTermAppliesTo) e['res.creditTermAppliesTo'] = 'กรุณาเลือก Credit Term Applies To'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const results = await searchCustomers(searchQuery)
    setSearchResults(results)
    setSearching(false)
  }

  async function selectCustomer(c: Customer) {
    onChange({
      existingCustomerId: c.id,
      existingCustomer: {
        companyName: c.companyName,
        taxId: c.taxId ?? '',
        defaultCreditTerm: c.defaultCreditTerm ?? '',
        contactPerson: c.contactPerson ?? '',
        contactEmail: c.contactEmail ?? '',
        contactPhone: c.contactPhone ?? '',
      },
    })
    setSearchResults([])
    setSearchQuery('')
  }

  const nc = (data.newCustomer as Record<string, string>) ?? {}
  const ec = (data.existingCustomer as Record<string, unknown>) ?? {}
  const rs = (data.reseller as Record<string, string>) ?? {}
  const existingCustomerId = String(data.existingCustomerId || '')

  return (
    <Card title="Step 2 — ข้อมูลลูกค้า">
      <div style={{ marginBottom: 20 }}>
        <FormGroup label="ประเภทลูกค้า (Customer Type)" required error={errors.customerType}>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['new', 'existing', 'reseller'] as CustomerType[]).map(type => (
              <label
                key={type}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  border: `2px solid ${customerType === type ? '#004081' : '#D0D6DF'}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: customerType === type ? '#F2F6F8' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="customerType"
                  value={type}
                  checked={customerType === type}
                  onChange={() => onChange({ customerType: type })}
                  style={{ accentColor: '#004081' }}
                />
                <span style={{ fontWeight: 500, fontSize: 14 }}>{CUSTOMER_TYPE_LABELS[type]}</span>
              </label>
            ))}
          </div>
        </FormGroup>
      </div>

      {/* New Customer */}
      {customerType === 'new' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
          <FormGroup label="ชื่อบริษัท" required error={errors['new.companyName']} style={{ gridColumn: 'span 2' } as React.CSSProperties}>
            <Input value={nc.companyName ?? ''} onChange={e => onChange({ newCustomer: { ...nc, companyName: e.target.value } })} placeholder="บริษัท..." error={errors['new.companyName']} />
          </FormGroup>
          <FormGroup label="Tax ID (เลขที่ผู้เสียภาษี)">
            <Input value={nc.taxId ?? ''} onChange={e => onChange({ newCustomer: { ...nc, taxId: e.target.value } })} placeholder="13 หลัก" />
          </FormGroup>
          <FormGroup label="ผู้ติดต่อ (Contact Person)">
            <Input value={nc.contactPerson ?? ''} onChange={e => onChange({ newCustomer: { ...nc, contactPerson: e.target.value } })} />
          </FormGroup>
          <FormGroup label="อีเมลผู้ติดต่อ">
            <Input type="email" value={nc.contactEmail ?? ''} onChange={e => onChange({ newCustomer: { ...nc, contactEmail: e.target.value } })} />
          </FormGroup>
          <FormGroup label="เบอร์โทรศัพท์">
            <Input value={nc.contactPhone ?? ''} onChange={e => onChange({ newCustomer: { ...nc, contactPhone: e.target.value } })} />
          </FormGroup>
          <FormGroup label="หมายเหตุ" style={{ gridColumn: 'span 2' } as React.CSSProperties}>
            <Textarea value={nc.remark ?? ''} onChange={e => onChange({ newCustomer: { ...nc, remark: e.target.value } })} rows={2} />
          </FormGroup>
          <FormGroup label="เหตุผลการขอ Credit Term สำหรับลูกค้าใหม่" style={{ gridColumn: 'span 2' } as React.CSSProperties}>
            <Alert type="warning">ลูกค้าใหม่ที่ต้องการ Credit Term มากกว่า 0 วัน กรุณาระบุเหตุผลที่ชัดเจน</Alert>
            <Textarea
              style={{ marginTop: 8 }}
              value={nc.creditTermReason ?? ''}
              onChange={e => onChange({ newCustomer: { ...nc, creditTermReason: e.target.value } })}
              rows={3}
              placeholder="ระบุเหตุผลและหลักฐานที่สนับสนุนการให้ credit term แก่ลูกค้าใหม่..."
            />
          </FormGroup>
        </div>
      )}

      {/* Existing Customer */}
      {customerType === 'existing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormGroup label="ค้นหาลูกค้า" required error={errors.existingCustomerId}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ค้นหาด้วยชื่อบริษัทหรือ Tax ID..."
                style={{ flex: 1 }}
              />
              <Button variant="secondary" icon={<FaMagnifyingGlass size={15} />} onClick={handleSearch} loading={searching}>
                ค้นหา
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div style={{ border: '1px solid #D0D6DF', borderRadius: 6, marginTop: 4, background: '#fff', boxShadow: '0 4px 12px rgba(0,64,129,0.07)', overflow: 'hidden' }}>
                {searchResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #F2F6F8', fontSize: 13 }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.companyName}</div>
                    <div style={{ color: '#586782', fontSize: 12 }}>Tax ID: {c.taxId} · Credit Term: Net {c.defaultCreditTerm}</div>
                  </button>
                ))}
              </div>
            )}
          </FormGroup>

          {existingCustomerId && (
            <div style={{ padding: 16, background: '#F2F6F8', borderRadius: 6, border: '1px solid #D0D6DF' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#004081' }}>ข้อมูลลูกค้าที่เลือก</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                <FormGroup label="ชื่อบริษัท"><Input value={String(ec.companyName ?? '')} readOnly style={{ background: '#F2F6F8' }} /></FormGroup>
                <FormGroup label="Tax ID"><Input value={String(ec.taxId ?? '')} readOnly style={{ background: '#F2F6F8' }} /></FormGroup>
                <FormGroup label="Default Credit Term"><Input value={`Net ${ec.defaultCreditTerm ?? 0}`} readOnly style={{ background: '#F2F6F8' }} /></FormGroup>
                <FormGroup label="ผู้ติดต่อ">
                  <Input value={String(ec.contactPerson ?? '')} onChange={e => onChange({ existingCustomer: { ...ec, contactPerson: e.target.value } })} />
                </FormGroup>
                <FormGroup label="อีเมล">
                  <Input value={String(ec.contactEmail ?? '')} onChange={e => onChange({ existingCustomer: { ...ec, contactEmail: e.target.value } })} />
                </FormGroup>
                <FormGroup label="โทรศัพท์">
                  <Input value={String(ec.contactPhone ?? '')} onChange={e => onChange({ existingCustomer: { ...ec, contactPhone: e.target.value } })} />
                </FormGroup>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reseller */}
      {customerType === 'reseller' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#004081', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #D0D6DF' }}>ข้อมูล Reseller</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
              <FormGroup label="ชื่อบริษัท Reseller" required error={errors['res.resellerCompanyName']} style={{ gridColumn: 'span 2' } as React.CSSProperties}>
                <Input value={rs.resellerCompanyName ?? ''} onChange={e => onChange({ reseller: { ...rs, resellerCompanyName: e.target.value } })} error={errors['res.resellerCompanyName']} />
              </FormGroup>
              <FormGroup label="ผู้ติดต่อ Reseller"><Input value={rs.resellerContactPerson ?? ''} onChange={e => onChange({ reseller: { ...rs, resellerContactPerson: e.target.value } })} /></FormGroup>
              <FormGroup label="อีเมล Reseller"><Input value={rs.resellerEmail ?? ''} onChange={e => onChange({ reseller: { ...rs, resellerEmail: e.target.value } })} /></FormGroup>
              <FormGroup label="โทรศัพท์ Reseller"><Input value={rs.resellerPhone ?? ''} onChange={e => onChange({ reseller: { ...rs, resellerPhone: e.target.value } })} /></FormGroup>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#004081', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #D0D6DF' }}>ข้อมูล End Customer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
              <FormGroup label="ชื่อบริษัท End Customer" required error={errors['res.endCustomerCompanyName']} style={{ gridColumn: 'span 2' } as React.CSSProperties}>
                <Input value={rs.endCustomerCompanyName ?? ''} onChange={e => onChange({ reseller: { ...rs, endCustomerCompanyName: e.target.value } })} error={errors['res.endCustomerCompanyName']} />
              </FormGroup>
              <FormGroup label="ผู้ติดต่อ End Customer"><Input value={rs.endCustomerContactPerson ?? ''} onChange={e => onChange({ reseller: { ...rs, endCustomerContactPerson: e.target.value } })} /></FormGroup>
              <FormGroup label="อีเมล End Customer"><Input value={rs.endCustomerEmail ?? ''} onChange={e => onChange({ reseller: { ...rs, endCustomerEmail: e.target.value } })} /></FormGroup>
              <FormGroup label="โทรศัพท์ End Customer"><Input value={rs.endCustomerPhone ?? ''} onChange={e => onChange({ reseller: { ...rs, endCustomerPhone: e.target.value } })} /></FormGroup>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
            <FormGroup label="Billing To" required error={errors['res.billingTo']}>
              <Select value={rs.billingTo ?? ''} onChange={e => onChange({ reseller: { ...rs, billingTo: e.target.value } })} error={errors['res.billingTo']}>
                <option value="">— เลือก —</option>
                <option value="reseller">Reseller</option>
                <option value="end_customer">End Customer</option>
              </Select>
            </FormGroup>
            <FormGroup label="Credit Term Applies To" required error={errors['res.creditTermAppliesTo']}>
              <Select value={rs.creditTermAppliesTo ?? ''} onChange={e => onChange({ reseller: { ...rs, creditTermAppliesTo: e.target.value } })} error={errors['res.creditTermAppliesTo']}>
                <option value="">— เลือก —</option>
                <option value="reseller">Reseller</option>
                <option value="end_customer">End Customer</option>
              </Select>
            </FormGroup>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="secondary" icon={<FaChevronLeft size={15} />} onClick={onBack}>ย้อนกลับ</Button>
        <Button icon={<FaChevronRight size={15} />} onClick={() => validate() && onNext()}>ถัดไป — ใบเสนอราคา</Button>
      </div>
    </Card>
  )
}
