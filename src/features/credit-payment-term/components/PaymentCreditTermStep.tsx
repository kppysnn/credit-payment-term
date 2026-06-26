import { useState, useEffect } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { FormGroup, Input, Select, Textarea } from '../../../components/ui/FormField'
import { Alert } from '../../../components/ui/Alert'
import { PAYMENT_CONDITION_LABELS, type PaymentCondition } from '../types/request'
import { calcInstallmentAmount, calcTotalInstallmentPercent, formatCurrency } from '../utils/calculations'
import { formatCreditTerm } from '../utils/formatters'
import { ChevronIcon } from '../../../components/icons/FigmaIcons'

interface InstallmentRow {
  installmentPercent: number | ''
  creditTermDays: number | ''
  paymentCondition: PaymentCondition | ''
  creditTermReason: string
  remark: string
}

interface Props {
  data: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  onNext: () => void
  onBack: () => void
}

function numVal(v: unknown): number { return Number(v) || 0 }

export function PaymentCreditTermStep({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const installmentCount = numVal(data.installmentCount) || 1
  const installments = (data.installments as InstallmentRow[]) ?? []
  const customerType = String(data.customerType || '')

  const totalSelling =
    (data.hardwareItems as Array<{ sellingPrice: number | '' }>)?.reduce((s, i) => s + numVal(i.sellingPrice), 0) +
    numVal(data.softwareSellingPrice) +
    numVal(data.installationSellingPrice)

  /* Sync rows when count changes */
  useEffect(() => {
    const current = [...installments]
    while (current.length < installmentCount) {
      current.push({ installmentPercent: '', creditTermDays: '', paymentCondition: '', creditTermReason: '', remark: '' })
    }
    onChange({ installments: current.slice(0, installmentCount) })
  }, [installmentCount])

  function updateRow(i: number, field: keyof InstallmentRow, value: unknown) {
    const updated = [...installments]
    if (!updated[i]) updated[i] = { installmentPercent: '', creditTermDays: '', paymentCondition: '', creditTermReason: '', remark: '' }
    updated[i] = { ...updated[i], [field]: value }
    onChange({ installments: updated })
  }

  const totalPercent = calcTotalInstallmentPercent(installments)
  const maxCreditTerm = installments.reduce((m, i) => Math.max(m, numVal(i.creditTermDays)), 0)
  const newCustomerWithCreditTerm = customerType === 'new' && maxCreditTerm > 0

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!String(data.paymentTermReason || '').trim()) e.paymentTermReason = 'กรุณาระบุเหตุผล'
    installments.slice(0, installmentCount).forEach((row, i) => {
      if (!row.installmentPercent) e[`inst${i}.pct`] = 'กรุณาระบุ%'
      if (row.creditTermDays === '' || row.creditTermDays === undefined) e[`inst${i}.days`] = 'กรุณาระบุวัน'
      if (!row.paymentCondition) e[`inst${i}.cond`] = 'กรุณาเลือก'
      if (!row.creditTermReason.trim()) e[`inst${i}.reason`] = 'กรุณาระบุเหตุผล'
    })
    if (Math.abs(totalPercent - 100) > 0.01) e.totalPct = 'ผลรวม % ต้องเท่ากับ 100%'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <Card title="Step 4 — Payment & Credit Term">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Count + reason */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0 20px' }}>
          <FormGroup label="จำนวนงวด" required>
            <Select
              value={installmentCount}
              onChange={e => onChange({ installmentCount: Number(e.target.value) })}
            >
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} งวด</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="เหตุผลการขอเงื่อนไขการชำระ (Payment Term Reason)" required error={errors.paymentTermReason}>
            <Textarea
              value={String(data.paymentTermReason || '')}
              onChange={e => onChange({ paymentTermReason: e.target.value })}
              rows={2}
              placeholder="อธิบายเหตุผลในการขอเงื่อนไขการชำระ..."
              error={errors.paymentTermReason}
            />
          </FormGroup>
        </div>

        <FormGroup label="เหตุผล Credit Term โดยรวม (ถ้ามี)">
          <Textarea
            value={String(data.overallCreditTermReason || '')}
            onChange={e => onChange({ overallCreditTermReason: e.target.value })}
            rows={2}
          />
        </FormGroup>

        {/* Warnings */}
        {newCustomerWithCreditTerm && (
          <Alert type="error" title="ลูกค้าใหม่มี Credit Term มากกว่า 0 วัน">
            กรุณาตรวจสอบความถูกต้องและระบุเหตุผลในแต่ละงวดให้ชัดเจน
          </Alert>
        )}
        {Math.abs(totalPercent - 100) > 0.01 && totalPercent > 0 && (
          <Alert type="warning">ผลรวมเปอร์เซ็นต์ = {totalPercent.toFixed(1)}% (ต้องเท่ากับ 100%)</Alert>
        )}

        {/* Payment Schedule Table */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#004081', marginBottom: 12 }}>
            ตาราง Payment Schedule ({installmentCount} งวด)
          </div>

          {installments.slice(0, installmentCount).map((row, i) => {
            const amount = calcInstallmentAmount(totalSelling, numVal(row.installmentPercent))
            return (
              <div
                key={i}
                style={{
                  background: '#F2F6F8',
                  border: `1px solid ${errors[`inst${i}.pct`] || errors[`inst${i}.days`] ? '#FCA5A5' : '#D0D6DF'}`,
                  borderRadius: 6,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#004081', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#004081' }}>งวดที่ {i + 1}</div>
                  {totalSelling > 0 && numVal(row.installmentPercent) > 0 && (
                    <div style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: '#82C566' }}>
                      {formatCurrency(amount)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '10px 12px' }}>
                  <FormGroup label="% งวด" required error={errors[`inst${i}.pct`]}>
                    <Input
                      type="number"
                      min="1" max="100"
                      value={row.installmentPercent}
                      onChange={e => updateRow(i, 'installmentPercent', e.target.value ? Number(e.target.value) : '')}
                      error={errors[`inst${i}.pct`]}
                    />
                  </FormGroup>
                  <FormGroup label="Credit Term (วัน)" required error={errors[`inst${i}.days`]}>
                    <Input
                      type="number"
                      min="0"
                      value={row.creditTermDays}
                      onChange={e => updateRow(i, 'creditTermDays', e.target.value !== '' ? Number(e.target.value) : '')}
                      placeholder="ระบุจำนวนวัน"
                      error={errors[`inst${i}.days`]}
                    />
                    {row.creditTermDays !== '' && (
                      <span style={{ fontSize: 11, color: '#586782', marginTop: 2 }}>{formatCreditTerm(numVal(row.creditTermDays))}</span>
                    )}
                  </FormGroup>
                  <FormGroup label="เงื่อนไขการชำระ" required error={errors[`inst${i}.cond`]}>
                    <Select
                      value={row.paymentCondition}
                      onChange={e => updateRow(i, 'paymentCondition', e.target.value)}
                      error={errors[`inst${i}.cond`]}
                    >
                      <option value="">— เลือก —</option>
                      {(Object.entries(PAYMENT_CONDITION_LABELS) as [PaymentCondition, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup label="หมายเหตุ">
                    <Input value={row.remark} onChange={e => updateRow(i, 'remark', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="เหตุผล Credit Term" required error={errors[`inst${i}.reason`]} style={{ gridColumn: 'span 4' } as React.CSSProperties}>
                    <Input
                      value={row.creditTermReason}
                      onChange={e => updateRow(i, 'creditTermReason', e.target.value)}
                      placeholder="เหตุผลเฉพาะสำหรับงวดนี้..."
                      error={errors[`inst${i}.reason`]}
                    />
                  </FormGroup>
                </div>
              </div>
            )
          })}

          {/* Total row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '12px 16px', background: '#F2F6F8', borderRadius: 6, fontSize: 14 }}>
            <div>
              <span style={{ color: '#586782' }}>รวม %: </span>
              <span style={{ fontWeight: 700, color: Math.abs(totalPercent - 100) < 0.01 ? '#82C566' : '#F3554F' }}>
                {totalPercent.toFixed(1)}%
              </span>
            </div>
            <div>
              <span style={{ color: '#586782' }}>Max Credit Term: </span>
              <span style={{ fontWeight: 700 }}>{formatCreditTerm(maxCreditTerm)}</span>
            </div>
            <div>
              <span style={{ color: '#586782' }}>Total: </span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalSelling)}</span>
            </div>
          </div>
          {errors.totalPct && <div style={{ color: '#F3554F', fontSize: 12, marginTop: 6 }}>{errors.totalPct}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="secondary" icon={<ChevronIcon direction="left" size={15} />} onClick={onBack}>ย้อนกลับ</Button>
          <Button icon={<ChevronIcon direction="right" size={15} />} onClick={() => validate() && onNext()}>ถัดไป — สรุปและส่ง</Button>
        </div>
      </div>
    </Card>
  )
}
