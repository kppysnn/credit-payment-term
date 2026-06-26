import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { FormGroup, Input } from '../../../components/ui/FormField'
import { searchCustomers } from '../services/customerService'
import type { Customer, CustomerType } from '../types/customer'
import { CUSTOMER_TYPE_LABELS } from '../types/customer'
import { FaChevronRight, FaMagnifyingGlass, FaXmark } from 'react-icons/fa6'

interface Props {
  data: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  onNext: () => void
}

const SALE_TYPES = [
  { value: 'hardware', label: 'Hardware', sub: 'Q1 เท่านั้น' },
  { value: 'hardware_software_installation', label: 'Hardware + Software & Installation', sub: 'Q1 + Q2' },
]

const CUSTOMER_TYPES: CustomerType[] = ['new', 'existing', 'reseller']

function numVal(v: unknown): number { return Number(v) || 0 }

export function RequestInformationStep({ data, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)

  const saleType = String(data.saleType || '')
  const customerType = String(data.customerType || '') as CustomerType | ''
  const nc = (data.newCustomer as Record<string, string>) ?? {}
  const ec = (data.existingCustomer as Record<string, unknown>) ?? {}
  const rs = (data.reseller as Record<string, string>) ?? {}
  const existingCustomerId = String(data.existingCustomerId || '')

  function clearSearch() { setSearchQuery(''); setSearchResults([]) }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!String(data.proposalNo || '').trim()) e.proposalNo = 'กรุณาระบุ'
    if (!String(data.projectName || '').trim()) e.projectName = 'กรุณาระบุ'
    if (!saleType) e.saleType = 'กรุณาเลือก'
    if (!customerType) e.customerType = 'กรุณาเลือก'
    if (customerType === 'new' && !nc?.companyName?.trim()) e['new.companyName'] = 'กรุณาระบุชื่อบริษัท'
    if (customerType === 'existing' && !existingCustomerId) e.existingCustomerId = 'กรุณาเลือกลูกค้า'
    if (customerType === 'reseller') {
      if (!rs?.resellerId) e['res.resellerId'] = 'กรุณาเลือก Reseller'
      if (!rs?.endCustomerCompanyName?.trim()) e['res.endCustomerCompanyName'] = 'กรุณาระบุลูกค้าปลายทาง'
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

  function selectExistingCustomer(c: Customer) {
    onChange({
      existingCustomerId: c.id,
      existingCustomer: {
        companyName: c.companyName,
        taxId: c.taxId ?? '',
        defaultCreditTerm: c.defaultCreditTerm ?? 0,
        contactPerson: c.contactPerson ?? '',
        contactPhone: c.contactPhone ?? '',
      },
    })
    clearSearch()
  }

  function selectReseller(c: Customer) {
    onChange({ reseller: { ...rs, resellerId: c.id, resellerCompanyName: c.companyName } })
    clearSearch()
  }

  const radioCard = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    border: `2px solid ${active ? '#004081' : '#D0D6DF'}`,
    borderRadius: 6, cursor: 'pointer',
    background: active ? 'rgba(0,64,129,0.05)' : '#fff',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  const tealCard = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    border: `2px solid ${active ? '#66C5C5' : '#D0D6DF'}`,
    borderRadius: 6, cursor: 'pointer',
    background: active ? 'rgba(102,197,197,0.08)' : '#fff',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  const searchDropdown = (items: Customer[], onSelect: (c: Customer) => void) => items.length > 0 && (
    <div style={{ border: '1px solid #D0D6DF', borderRadius: 6, marginTop: 4, background: '#fff', boxShadow: '0 4px 14px rgba(0,64,129,0.10)', overflow: 'hidden', position: 'absolute', zIndex: 20, width: '100%' }}>
      {items.map(c => (
        <button key={c.id} onClick={() => onSelect(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #F2F6F8', fontSize: 13 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F2F6F8' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <div style={{ fontWeight: 600, color: '#001122' }}>{c.companyName}</div>
          <div style={{ color: '#929EB4', fontSize: 12 }}>Net {c.defaultCreditTerm ?? 0} · {c.contactPerson}</div>
        </button>
      ))}
    </div>
  )

  return (
    <Card title="Step 1 — ข้อมูลคำขอ & ลูกค้า">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Proposal + Project */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
          <FormGroup label="Proposal No." required error={errors.proposalNo}>
            <Input
              value={String(data.proposalNo || '')}
              onChange={e => onChange({ proposalNo: e.target.value })}
              placeholder="PRO-2026-001"
              error={errors.proposalNo}
            />
          </FormGroup>
          <FormGroup label="ชื่อโปรเจกต์" required error={errors.projectName}>
            <Input
              value={String(data.projectName || '')}
              onChange={e => onChange({ projectName: e.target.value })}
              placeholder="ชื่อโปรเจกต์หรืองานที่ขาย"
              error={errors.projectName}
            />
          </FormGroup>
        </div>

        {/* Sale Type */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#586782', marginBottom: 8 }}>
            ประเภทการขาย <span style={{ color: '#F3554F' }}>*</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {SALE_TYPES.map(t => (
              <label key={t.value} style={{ flex: 1, ...radioCard(saleType === t.value) }}>
                <input type="radio" name="saleType" value={t.value} checked={saleType === t.value}
                  onChange={() => onChange({ saleType: t.value })} style={{ accentColor: '#004081', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: saleType === t.value ? '#004081' : '#001122' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#929EB4', marginTop: 1 }}>{t.sub}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.saleType && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 5 }}>{errors.saleType}</div>}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #D0D6DF' }} />

        {/* Customer Type */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#586782', marginBottom: 8 }}>
            ประเภทลูกค้า <span style={{ color: '#F3554F' }}>*</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {CUSTOMER_TYPES.map(type => (
              <label key={type} style={{ flex: 1, ...tealCard(customerType === type) }}>
                <input type="radio" name="customerType" value={type} checked={customerType === type}
                  onChange={() => { onChange({ customerType: type }); clearSearch() }}
                  style={{ accentColor: '#66C5C5', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: customerType === type ? '#004081' : '#001122' }}>
                  {CUSTOMER_TYPE_LABELS[type]}
                </span>
              </label>
            ))}
          </div>
          {errors.customerType && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 5 }}>{errors.customerType}</div>}
        </div>

        {/* New Customer */}
        {customerType === 'new' && (
          <div style={{ background: '#F2F6F8', border: '1px solid #D0D6DF', borderRadius: 6, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>ข้อมูลลูกค้าใหม่</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px' }}>
              <FormGroup label="ชื่อบริษัท" required error={errors['new.companyName']} style={{ gridColumn: 'span 3' } as React.CSSProperties}>
                <Input value={nc.companyName ?? ''} onChange={e => onChange({ newCustomer: { ...nc, companyName: e.target.value } })} placeholder="บริษัท..." error={errors['new.companyName']} />
              </FormGroup>
              <FormGroup label="ผู้ติดต่อ">
                <Input value={nc.contactPerson ?? ''} onChange={e => onChange({ newCustomer: { ...nc, contactPerson: e.target.value } })} />
              </FormGroup>
              <FormGroup label="เบอร์โทร">
                <Input value={nc.contactPhone ?? ''} onChange={e => onChange({ newCustomer: { ...nc, contactPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
              </FormGroup>
            </div>
          </div>
        )}

        {/* Existing Customer */}
        {customerType === 'existing' && (
          <div style={{ background: '#F2F6F8', border: '1px solid #D0D6DF', borderRadius: 6, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>เลือกลูกค้า</div>

            {existingCustomerId ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,64,129,0.05)', borderRadius: 6, border: '1px solid rgba(0,64,129,0.14)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#004081', fontSize: 14 }}>{String(ec.companyName ?? '')}</div>
                  <div style={{ fontSize: 12, color: '#586782', marginTop: 3 }}>Net {numVal(ec.defaultCreditTerm)} · {String(ec.contactPerson ?? '')}</div>
                </div>
                <button onClick={() => onChange({ existingCustomerId: '', existingCustomer: {} })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#929EB4', padding: 4 }}>
                  <FaXmark size={16} />
                </button>
              </div>
            ) : (
              <FormGroup error={errors.existingCustomerId}>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="ค้นหาด้วยชื่อบริษัท..."
                      style={{ flex: 1 }}
                      error={errors.existingCustomerId}
                    />
                    <Button variant="secondary" size="sm" icon={<FaMagnifyingGlass size={15} />} onClick={handleSearch} loading={searching}>ค้นหา</Button>
                  </div>
                  {searchDropdown(searchResults, selectExistingCustomer)}
                </div>
              </FormGroup>
            )}
          </div>
        )}

        {/* Reseller */}
        {customerType === 'reseller' && (
          <div style={{ background: '#F2F6F8', border: '1px solid #D0D6DF', borderRadius: 6, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Reseller</div>

            {rs.resellerId ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,64,129,0.05)', borderRadius: 6, border: '1px solid rgba(0,64,129,0.14)', marginBottom: 14 }}>
                <span style={{ fontWeight: 700, color: '#004081', fontSize: 14 }}>{rs.resellerCompanyName}</span>
                <button onClick={() => { onChange({ reseller: { ...rs, resellerId: '', resellerCompanyName: '' } }); clearSearch() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#929EB4', padding: 4 }}>
                  <FaXmark size={16} />
                </button>
              </div>
            ) : (
              <FormGroup error={errors['res.resellerId']} style={{ marginBottom: 14 } as React.CSSProperties}>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="ค้นหา Reseller..."
                      style={{ flex: 1 }}
                      error={errors['res.resellerId']}
                    />
                    <Button variant="secondary" size="sm" icon={<FaMagnifyingGlass size={15} />} onClick={handleSearch} loading={searching}>ค้นหา</Button>
                  </div>
                  {searchDropdown(searchResults, selectReseller)}
                </div>
              </FormGroup>
            )}

            {rs.resellerId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px' }}>
                <FormGroup label="ลูกค้าปลายทาง" required error={errors['res.endCustomerCompanyName']} style={{ gridColumn: 'span 3' } as React.CSSProperties}>
                  <Input value={rs.endCustomerCompanyName ?? ''} onChange={e => onChange({ reseller: { ...rs, endCustomerCompanyName: e.target.value } })} placeholder="บริษัทปลายทาง..." error={errors['res.endCustomerCompanyName']} />
                </FormGroup>
                <FormGroup label="ผู้ติดต่อ">
                  <Input value={rs.endCustomerContactPerson ?? ''} onChange={e => onChange({ reseller: { ...rs, endCustomerContactPerson: e.target.value } })} />
                </FormGroup>
                <FormGroup label="เบอร์โทร">
                  <Input value={rs.endCustomerPhone ?? ''} onChange={e => onChange({ reseller: { ...rs, endCustomerPhone: e.target.value } })} placeholder="0x-xxxx-xxxx" />
                </FormGroup>
              </div>
            )}
          </div>
        )}

        {/* Sales auto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F2F6F8', border: '1px solid #D0D6DF', borderRadius: 6, fontSize: 13 }}>
          <span style={{ color: '#929EB4', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sales</span>
          <span style={{ fontWeight: 600, color: '#001122', marginLeft: 4 }}>{String(data.salesName || '')}</span>
          <span style={{ color: '#929EB4' }}>·</span>
          <span style={{ color: '#586782' }}>{String(data.salesEmail || '')}</span>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <Button icon={<FaChevronRight size={15} />} onClick={() => validate() && onNext()}>
          ถัดไป — ใบเสนอราคา & งวด
        </Button>
      </div>
    </Card>
  )
}
