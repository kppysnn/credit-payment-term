import { formatCurrency, calcTotalInstallmentPercent } from '../utils/calculations'
import { formatCreditTerm } from '../utils/formatters'
import { SALE_TYPE_LABELS, type SaleType } from '../types/request'
import { CUSTOMER_TYPE_LABELS, type CustomerType } from '../types/customer'

interface Props {
  data: Record<string, unknown>
  currentStep: number
}

function numVal(v: unknown): number { return Number(v) || 0 }

const STEP_LABELS = ['ข้อมูลคำขอ & ลูกค้า', 'ใบเสนอราคา & งวด', 'สรุปและส่ง']

export function StickyRequestSummary({ data, currentStep }: Props) {
  const hw = (data.hardwareItems as Array<{ sellingPrice: number | '' }>) ?? []
  const hwSelling = hw.reduce((s, i) => s + numVal(i.sellingPrice), 0)
  const legacyHwSelling = numVal(data.hardwareSellingPrice)
  const swSelling = numVal(data.softwareSellingPrice)
  const instSelling = numVal(data.installationSellingPrice)
  const totalSelling = (hwSelling || legacyHwSelling) + swSelling + instSelling

  const installments = (data.installments as Array<{ installmentPercent: number | ''; creditTermDays: number | '' }>) ?? []
  const installmentCount = numVal(data.installmentCount) || 1
  const totalPct = calcTotalInstallmentPercent(installments.slice(0, installmentCount))
  const maxCreditTerm = installments.slice(0, installmentCount).reduce((m, i) => Math.max(m, numVal(i.creditTermDays)), 0)

  const saleType = String(data.saleType || '')
  const saleTypeLabel = saleType ? (SALE_TYPE_LABELS[saleType as SaleType] ?? saleType) : '—'

  const customerType = String(data.customerType || '') as CustomerType | ''
  const customerTypeLabel = customerType ? CUSTOMER_TYPE_LABELS[customerType as CustomerType] : '—'

  let customerName = '—'
  if (customerType === 'new') customerName = String((data.newCustomer as Record<string, unknown>)?.companyName || '—')
  else if (customerType === 'existing') customerName = String((data.existingCustomer as Record<string, unknown>)?.companyName || '—')
  else if (customerType === 'reseller') customerName = String((data.reseller as Record<string, unknown>)?.resellerCompanyName || '—')

  const rows = [
    { label: 'Proposal No.', value: String(data.proposalNo || '—'), show: true, mono: true },
    { label: 'Sale Type', value: saleTypeLabel, show: true },
    { label: 'ลูกค้า', value: `${customerTypeLabel}${customerName !== '—' ? ` — ${customerName}` : ''}`, show: customerType !== '' },
    { label: 'ราคาขาย', value: totalSelling > 0 ? formatCurrency(totalSelling) : '—', show: currentStep >= 1, bold: true },
    { label: 'งวด', value: currentStep >= 1 ? `${installmentCount} งวด` : '—', show: currentStep >= 1 },
    { label: 'รวม %', value: currentStep >= 1 && totalPct > 0 ? `${totalPct.toFixed(0)}%` : '—', show: currentStep >= 1, danger: currentStep >= 1 && totalPct > 0 && Math.abs(totalPct - 100) > 0.01 },
    { label: 'Max Credit', value: currentStep >= 1 && installmentCount > 0 ? formatCreditTerm(maxCreditTerm) : '—', show: currentStep >= 1 },
  ]

  return (
    <div style={{ background: '#fff', border: '4px solid #D0D6DF', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,64,129,0.06)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', background: '#004081', borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          สรุปคำขอ
        </div>
        {data.projectName != null && data.projectName !== '' ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 4, lineHeight: 1.3 }}>
            {String(data.projectName)}
          </div>
        ) : null}
      </div>

      <div style={{ padding: '12px 16px' }}>
        {rows.filter(r => r.show).map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 7, marginBottom: 7, borderBottom: '1px solid #F2F6F8', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#929EB4', flexShrink: 0 }}>{row.label}</span>
            <span style={{
              fontSize: 12, fontWeight: row.bold ? 700 : 500, textAlign: 'right',
              color: row.danger ? '#F3554F' : '#001122',
              fontFamily: row.mono ? 'JetBrains Mono, Noto Sans Thai, monospace' : undefined,
              wordBreak: 'break-all',
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 16px', background: '#FAFBFC', borderTop: '1px solid #D0D6DF' }}>
        <div style={{ fontSize: 11, color: '#929EB4' }}>Step {currentStep + 1} / {STEP_LABELS.length} — {STEP_LABELS[currentStep]}</div>
      </div>
    </div>
  )
}
