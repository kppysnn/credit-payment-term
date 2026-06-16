import { formatCurrency, calcMarginPercent, calcTotalInstallmentPercent } from '../utils/calculations'
import { formatCreditTerm } from '../utils/formatters'
import { SALE_TYPE_LABELS, type SaleType } from '../types/request'

interface Props {
  data: Record<string, unknown>
  currentStep: number
}

function numVal(v: unknown): number { return Number(v) || 0 }

export function StickyRequestSummary({ data, currentStep }: Props) {
  const hw = (data.hardwareItems as Array<{ sellingPrice: number | ''; cost: number | '' }>) ?? []
  const hwSelling = hw.reduce((s, i) => s + numVal(i.sellingPrice), 0)
  const hwCost = hw.reduce((s, i) => s + numVal(i.cost), 0)
  const swSelling = numVal(data.softwareSellingPrice)
  const swCost = numVal(data.softwareCost)
  const instSelling = numVal(data.installationSellingPrice)
  const instCost = numVal(data.installationCost)
  const totalSelling = hwSelling + swSelling + instSelling
  const totalCost = hwCost + swCost + instCost
  const gp = totalSelling - totalCost
  const margin = calcMarginPercent(totalSelling, gp)

  const installments = (data.installments as Array<{ installmentPercent: number | ''; creditTermDays: number | '' }>) ?? []
  const totalPct = calcTotalInstallmentPercent(installments)
  const maxCreditTerm = installments.reduce((m, i) => Math.max(m, numVal(i.creditTermDays)), 0)
  const installmentCount = numVal(data.installmentCount) || 1

  const saleType = String(data.saleType || '')
  const saleTypeLabel = saleType ? SALE_TYPE_LABELS[saleType as SaleType] : '—'

  const rows = [
    { label: 'Sale Type', value: saleTypeLabel, show: currentStep >= 0 },
    { label: 'Total Selling', value: totalSelling > 0 ? formatCurrency(totalSelling) : '—', show: currentStep >= 2, bold: true },
    { label: 'Total Cost', value: totalCost > 0 ? formatCurrency(totalCost) : '—', show: currentStep >= 2 },
    { label: 'Gross Profit', value: totalSelling > 0 ? formatCurrency(gp) : '—', show: currentStep >= 2, danger: gp < 0 },
    { label: 'Margin %', value: totalSelling > 0 ? `${margin.toFixed(2)}%` : '—', show: currentStep >= 2, danger: margin < 0 },
    { label: 'งวดชำระ', value: currentStep >= 3 ? `${installmentCount} งวด` : '—', show: currentStep >= 3 },
    { label: 'รวม %', value: currentStep >= 3 ? `${totalPct.toFixed(1)}%` : '—', show: currentStep >= 3, danger: currentStep >= 3 && Math.abs(totalPct - 100) > 0.01 && totalPct > 0 },
    { label: 'Max Credit Term', value: currentStep >= 3 && installments.length > 0 ? formatCreditTerm(maxCreditTerm) : '—', show: currentStep >= 3 },
  ]

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #D0D6DF',
        borderRadius: 14,
        boxShadow: '0 2px 8px rgba(0,64,129,0.06)',
        overflow: 'hidden',
      }}
    >
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
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #F2F6F8' }}>
            <span style={{ fontSize: 12, color: '#586782' }}>{row.label}</span>
            <span style={{
              fontSize: 13,
              fontWeight: row.bold ? 700 : 500,
              color: row.danger ? '#F3554F' : '#001122',
              fontFamily: row.bold ? 'JetBrains Mono, monospace' : undefined,
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 16px', background: '#FAFBFC', borderTop: '1px solid #D0D6DF' }}>
        <div style={{ fontSize: 11, color: '#929EB4' }}>Step {currentStep + 1} / 5</div>
      </div>
    </div>
  )
}
