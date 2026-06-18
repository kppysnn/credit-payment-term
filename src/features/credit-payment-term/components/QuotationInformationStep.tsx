import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { FormGroup, Input, Select } from '../../../components/ui/FormField'
import { formatCurrency, calcGrossProfit, calcInstallmentAmount, calcTotalInstallmentPercent } from '../utils/calculations'
import { formatCreditTerm } from '../utils/formatters'
import { PAYMENT_CONDITION_LABELS, type PaymentCondition } from '../types/request'
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react'
import type { SaleType } from '../types/request'

interface HwItem { name: string; sellingPrice: number | ''; cost: number | '' }
interface InstRow { installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: PaymentCondition | '' }

interface Props {
  data: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  onNext: () => void
  onBack: () => void
}

function numVal(v: unknown): number { return Number(v) || 0 }

const TH = (children: React.ReactNode, style?: React.CSSProperties) => (
  <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F2F6F8', whiteSpace: 'nowrap', ...style }}>{children}</th>
)

const TD = (children: React.ReactNode, style?: React.CSSProperties) => (
  <td style={{ padding: '8px 10px', verticalAlign: 'middle', ...style }}>{children}</td>
)

export function QuotationInformationStep({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const saleType = String(data.saleType || '') as SaleType
  const showSw = saleType === 'hardware_software_installation'
  const proposalNo = String(data.proposalNo || '')
  const q1No = proposalNo ? `${proposalNo}-1` : 'Q1'
  const q2No = proposalNo ? `${proposalNo}-2` : 'Q2'

  const hwItems = (data.hardwareItems as HwItem[]) ?? [{ name: '', sellingPrice: '', cost: '' }]
  const installmentCount = numVal(data.installmentCount) || 1
  const installments = (data.installments as InstRow[]) ?? []

  /* Sync installment rows when count changes */
  useEffect(() => {
    const current = [...installments]
    while (current.length < installmentCount) {
      current.push({ installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' })
    }
    onChange({ installments: current.slice(0, installmentCount) })
  }, [installmentCount])

  /* Totals */
  const hwSelling = hwItems.reduce((s, i) => s + numVal(i.sellingPrice), 0)
  const hwCost    = hwItems.reduce((s, i) => s + numVal(i.cost), 0)
  const swSelling = numVal(data.softwareSellingPrice)
  const swCost    = numVal(data.softwareCost)
  const instSelling = numVal(data.installationSellingPrice)
  const instCost    = numVal(data.installationCost)
  const q2Selling = swSelling + instSelling
  const q2Cost    = swCost + instCost
  const totalSelling = hwSelling + q2Selling
  const totalCost    = hwCost + q2Cost
  const totalGP      = totalSelling - totalCost

  const totalPct = calcTotalInstallmentPercent(installments.slice(0, installmentCount))
  const maxCreditTerm = installments.slice(0, installmentCount).reduce((m, i) => Math.max(m, numVal(i.creditTermDays)), 0)
  const pctOk = Math.abs(totalPct - 100) < 0.01

  function updateHw(i: number, field: keyof HwItem, value: unknown) {
    const updated = [...hwItems]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ hardwareItems: updated })
  }
  function addHw() { onChange({ hardwareItems: [...hwItems, { name: '', sellingPrice: '', cost: '' }] }) }
  function removeHw(i: number) { if (hwItems.length > 1) onChange({ hardwareItems: hwItems.filter((_, idx) => idx !== i) }) }

  function updateInst(i: number, field: keyof InstRow, value: unknown) {
    const updated = [...installments]
    if (!updated[i]) updated[i] = { installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' }
    updated[i] = { ...updated[i], [field]: value }
    onChange({ installments: updated })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    hwItems.forEach((item, i) => {
      if (!item.name.trim()) e[`hw${i}.name`] = 'ระบุชื่อ'
      if (numVal(item.sellingPrice) <= 0) e[`hw${i}.sell`] = 'ระบุราคา'
    })
    installments.slice(0, installmentCount).forEach((row, i) => {
      if (!row.installmentPercent) e[`inst${i}.pct`] = 'ระบุ%'
      if (!row.paymentCondition) e[`inst${i}.cond`] = 'เลือก'
    })
    if (!pctOk && installmentCount > 0) e.totalPct = `รวม ${totalPct.toFixed(1)}% ≠ 100%`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const sectionHeader = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: '#D0D6DF' }} />
    </div>
  )

  const qBadge = (no: string) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(0,64,129,0.07)', borderRadius: 6, border: '1px solid rgba(0,64,129,0.14)', marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quotation No.</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#004081', fontFamily: 'JetBrains Mono, monospace' }}>{no}</span>
    </div>
  )

  return (
    <Card title="Step 2 — ใบเสนอราคา & งวดชำระ">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Q1 — Hardware */}
        <div>
          {qBadge(q1No)}
          <div style={{ border: '1px solid #D0D6DF', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
                  {TH('ชื่อสินค้า / Hardware', { width: '45%' })}
                  {TH('ราคาขาย (THB)', { textAlign: 'right' as const, width: '22%' })}
                  {TH('ราคาทุน (THB)', { textAlign: 'right' as const, width: '22%' })}
                  {TH('GP', { textAlign: 'right' as const, width: '11%' })}
                  <th style={{ width: 36, background: '#F2F6F8' }} />
                </tr>
              </thead>
              <tbody>
                {hwItems.map((item, i) => {
                  const gp = calcGrossProfit(numVal(item.sellingPrice), numVal(item.cost))
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #F2F6F8' }}>
                      {TD(
                        <Input value={item.name} onChange={e => updateHw(i, 'name', e.target.value)}
                          placeholder="ชื่อสินค้า รุ่น ยี่ห้อ" error={errors[`hw${i}.name`]}
                          style={{ border: errors[`hw${i}.name`] ? '1.5px solid #F3554F' : undefined }} />,
                      )}
                      {TD(
                        <Input type="number" value={item.sellingPrice} min="0" step="1000"
                          onChange={e => updateHw(i, 'sellingPrice', e.target.value ? Number(e.target.value) : '')}
                          error={errors[`hw${i}.sell`]}
                          style={{ textAlign: 'right', border: errors[`hw${i}.sell`] ? '1.5px solid #F3554F' : undefined }} />,
                        { textAlign: 'right' as const },
                      )}
                      {TD(
                        <Input type="number" value={item.cost} min="0" step="1000"
                          onChange={e => updateHw(i, 'cost', e.target.value ? Number(e.target.value) : '')}
                          style={{ textAlign: 'right' }} />,
                        { textAlign: 'right' as const },
                      )}
                      {TD(
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: gp < 0 ? '#F3554F' : '#001122', fontWeight: 600 }}>
                          {numVal(item.sellingPrice) > 0 ? formatCurrency(gp) : '—'}
                        </span>,
                        { textAlign: 'right' as const },
                      )}
                      <td style={{ padding: '8px 6px', textAlign: 'center' as const, verticalAlign: 'middle' }}>
                        <button onClick={() => removeHw(i)} disabled={hwItems.length <= 1}
                          style={{ background: 'none', border: 'none', cursor: hwItems.length > 1 ? 'pointer' : 'default', color: hwItems.length > 1 ? '#F3554F' : '#D0D6DF', padding: 3 }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#FAFBFC', borderTop: '2px solid #D0D6DF' }}>
                  <td style={{ padding: '8px 10px' }}>
                    <Button variant="ghost" size="sm" icon={<Plus size={12} />} onClick={addHw}>เพิ่มรายการ</Button>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#001122' }}>
                    {hwSelling > 0 ? formatCurrency(hwSelling) : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#586782' }}>
                    {hwCost > 0 ? formatCurrency(hwCost) : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: (hwSelling - hwCost) < 0 ? '#F3554F' : '#001122' }}>
                    {hwSelling > 0 ? formatCurrency(hwSelling - hwCost) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Q2 — Software & Installation */}
        {showSw && (
          <div>
            {qBadge(q2No)}
            <div style={{ border: '1px solid #D0D6DF', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
                    {TH('รายการ', { width: '35%' })}
                    {TH('ราคาขาย (THB)', { textAlign: 'right' as const, width: '27%' })}
                    {TH('ราคาทุน (THB)', { textAlign: 'right' as const, width: '27%' })}
                    {TH('GP', { textAlign: 'right' as const, width: '11%' })}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #F2F6F8' }}>
                    {TD(<span style={{ fontWeight: 600, color: '#001122' }}>Software</span>)}
                    {TD(
                      <Input type="number" value={String(data.softwareSellingPrice ?? '')} min="0" step="1000"
                        onChange={e => onChange({ softwareSellingPrice: e.target.value ? Number(e.target.value) : '' })}
                        style={{ textAlign: 'right' }} />,
                      { textAlign: 'right' as const },
                    )}
                    {TD(
                      <Input type="number" value={String(data.softwareCost ?? '')} min="0" step="1000"
                        onChange={e => onChange({ softwareCost: e.target.value ? Number(e.target.value) : '' })}
                        style={{ textAlign: 'right' }} />,
                      { textAlign: 'right' as const },
                    )}
                    {TD(
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: (swSelling - swCost) < 0 ? '#F3554F' : '#001122', fontWeight: 600 }}>
                        {swSelling > 0 ? formatCurrency(swSelling - swCost) : '—'}
                      </span>,
                      { textAlign: 'right' as const },
                    )}
                  </tr>
                  <tr>
                    {TD(<span style={{ fontWeight: 600, color: '#001122' }}>Installation</span>)}
                    {TD(
                      <Input type="number" value={String(data.installationSellingPrice ?? '')} min="0" step="1000"
                        onChange={e => onChange({ installationSellingPrice: e.target.value ? Number(e.target.value) : '' })}
                        style={{ textAlign: 'right' }} />,
                      { textAlign: 'right' as const },
                    )}
                    {TD(
                      <Input type="number" value={String(data.installationCost ?? '')} min="0" step="1000"
                        onChange={e => onChange({ installationCost: e.target.value ? Number(e.target.value) : '' })}
                        style={{ textAlign: 'right' }} />,
                      { textAlign: 'right' as const },
                    )}
                    {TD(
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: (instSelling - instCost) < 0 ? '#F3554F' : '#001122', fontWeight: 600 }}>
                        {instSelling > 0 ? formatCurrency(instSelling - instCost) : '—'}
                      </span>,
                      { textAlign: 'right' as const },
                    )}
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: '#FAFBFC', borderTop: '2px solid #D0D6DF' }}>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#586782', textTransform: 'uppercase', letterSpacing: '0.05em' }}>รวม Q2</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#001122' }}>
                      {q2Selling > 0 ? formatCurrency(q2Selling) : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#586782' }}>
                      {q2Cost > 0 ? formatCurrency(q2Cost) : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: (q2Selling - q2Cost) < 0 ? '#F3554F' : '#001122' }}>
                      {q2Selling > 0 ? formatCurrency(q2Selling - q2Cost) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Grand Total */}
        {totalSelling > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#D0D6DF', borderRadius: 10, overflow: 'hidden', border: '1px solid #D0D6DF' }}>
            {[
              { label: 'ราคาขายรวม', value: formatCurrency(totalSelling), color: '#001122' },
              { label: 'ต้นทุนรวม', value: formatCurrency(totalCost), color: '#586782' },
              { label: 'Gross Profit', value: formatCurrency(totalGP), color: totalGP < 0 ? '#F3554F' : '#004081' },
            ].map(f => (
              <div key={f.label} style={{ background: '#FAFBFC', padding: '14px 20px', textAlign: 'center' as const }}>
                <div style={{ fontSize: 11, color: '#929EB4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{f.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: f.color, fontFamily: 'JetBrains Mono, monospace' }}>{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #D0D6DF' }} />

        {/* Payment Schedule */}
        <div>
          {sectionHeader('งวดชำระ')}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#001122', whiteSpace: 'nowrap' }}>จำนวนงวด</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => onChange({ installmentCount: n })} style={{
                  width: 38, height: 38, borderRadius: 8, border: `2px solid ${installmentCount === n ? '#004081' : '#D0D6DF'}`,
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Input type="number" min="0" value={row.creditTermDays}
                          onChange={e => updateInst(i, 'creditTermDays', e.target.value !== '' ? Number(e.target.value) : 0)}
                          placeholder="วัน" style={{ width: 80, textAlign: 'right' }} />
                        <span style={{ color: '#586782', fontSize: 12, whiteSpace: 'nowrap' }}>วัน</span>
                        {numVal(row.creditTermDays) > 0 && (
                          <span style={{ fontSize: 11, color: '#66C5C5', fontWeight: 600 }}>{formatCreditTerm(numVal(row.creditTermDays))}</span>
                        )}
                      </div>
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

          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 20, padding: '10px 14px', background: pctOk && installmentCount > 0 ? 'rgba(102,197,197,0.08)' : 'rgba(243,85,79,0.06)', border: `1px solid ${pctOk && installmentCount > 0 ? '#66C5C5' : '#F3554F'}`, borderRadius: 8, marginTop: 10, fontSize: 13 }}>
            <span>รวม: <strong style={{ color: pctOk ? '#66C5C5' : '#F3554F' }}>{totalPct.toFixed(0)}%</strong>{pctOk ? ' ✓' : ' ⚠'}</span>
            <span style={{ color: '#929EB4' }}>·</span>
            <span>Max Credit Term: <strong>{formatCreditTerm(maxCreditTerm)}</strong></span>
            {totalSelling > 0 && <><span style={{ color: '#929EB4' }}>·</span><span>Total: <strong>{formatCurrency(totalSelling)}</strong></span></>}
          </div>
          {errors.totalPct && <div style={{ fontSize: 12, color: '#F3554F', marginTop: 5 }}>{errors.totalPct}</div>}
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={onBack}>ย้อนกลับ</Button>
        <Button icon={<ArrowRight size={15} />} onClick={() => validate() && onNext()}>ถัดไป — สรุปและส่ง</Button>
      </div>
    </Card>
  )
}
