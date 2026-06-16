import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Alert } from '../../../components/ui/Alert'
import { formatCurrency, calcMarginPercent, calcTotalInstallmentPercent, calcInstallmentAmount } from '../utils/calculations'
import { formatCreditTerm } from '../utils/formatters'
import { SALE_TYPE_LABELS, PAYMENT_CONDITION_LABELS, type SaleType, type PaymentCondition } from '../types/request'
import { CUSTOMER_TYPE_LABELS, type CustomerType } from '../types/customer'
import type { CurrentUser } from '../types/user'
import type { Request } from '../types/request'
import { ArrowLeft, Save, Send } from 'lucide-react'

interface Props {
  data: Record<string, unknown>
  currentUser: CurrentUser
  onBack: () => void
  onSaveDraft: () => Promise<void>
  onSubmit: () => Promise<void>
  isResubmit?: boolean
  initialRequest?: Request
}

function numVal(v: unknown): number { return Number(v) || 0 }

export function SummarySubmitStep({ data, currentUser, onBack, onSaveDraft, onSubmit, isResubmit, initialRequest }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState('')

  const hw = (data.hardwareItems as Array<{ name: string; sellingPrice: number | ''; cost: number | '' }>) ?? []
  const totalSelling =
    hw.reduce((s, i) => s + numVal(i.sellingPrice), 0) +
    numVal(data.softwareSellingPrice) +
    numVal(data.installationSellingPrice)
  const totalCost =
    hw.reduce((s, i) => s + numVal(i.cost), 0) +
    numVal(data.softwareCost) +
    numVal(data.installationCost)
  const gp = totalSelling - totalCost
  const margin = calcMarginPercent(totalSelling, gp)
  const installments = (data.installments as Array<{ installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: PaymentCondition | ''; creditTermReason: string }>) ?? []
  const totalPct = calcTotalInstallmentPercent(installments)
  const installmentCount = numVal(data.installmentCount) || 1
  const maxCreditTerm = installments.reduce((m, i) => Math.max(m, numVal(i.creditTermDays)), 0)
  const customerType = String(data.customerType || '') as CustomerType
  const newCustomerWithCreditTerm = customerType === 'new' && maxCreditTerm > 0
  const pctNotComplete = Math.abs(totalPct - 100) > 0.01
  const warnings: string[] = []
  if (gp < 0) warnings.push('Gross Profit ติดลบ')
  if (margin < 10 && totalSelling > 0) warnings.push(`Margin ต่ำ (${margin.toFixed(1)}%)`)
  if (newCustomerWithCreditTerm) warnings.push('ลูกค้าใหม่มี Credit Term มากกว่า 0 วัน')
  if (pctNotComplete) warnings.push(`ผลรวมงวด ${totalPct.toFixed(1)}% ≠ 100%`)

  const canSubmit = confirmed && !pctNotComplete

  async function handleDraft() {
    setDraftLoading(true)
    setError('')
    try { await onSaveDraft() } catch (e: unknown) { setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด') }
    finally { setDraftLoading(false) }
  }

  async function handleSubmit() {
    if (!canSubmit) { setError('กรุณายืนยันข้อมูลและตรวจสอบผลรวมงวด'); return }
    setSubmitLoading(true)
    setError('')
    try { await onSubmit() } catch (e: unknown) { setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด') }
    finally { setSubmitLoading(false) }
  }

  const customerName =
    customerType === 'existing' ? String((data.existingCustomer as Record<string, unknown>)?.companyName ?? '') :
    customerType === 'new' ? String((data.newCustomer as Record<string, unknown>)?.companyName ?? '') :
    String((data.reseller as Record<string, unknown>)?.resellerCompanyName ?? '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Rejection history reminder */}
      {isResubmit && initialRequest?.approvalResult && (
        <Alert type="error" title="เหตุผลที่ถูก Reject ครั้งก่อน">
          <div style={{ marginTop: 4 }}><strong>เหตุผล:</strong> {initialRequest.approvalResult.decisionComment}</div>
          {initialRequest.approvalResult.suggestion && (
            <div style={{ marginTop: 4 }}><strong>ข้อเสนอแนะ:</strong> {initialRequest.approvalResult.suggestion}</div>
          )}
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert type="warning" title="ข้อควรระวัง">
          <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
            {warnings.map(w => <li key={w}>{w}</li>)}
          </ul>
        </Alert>
      )}

      {/* 1. Request Summary */}
      <Card title="1. สรุปข้อมูลคำขอ">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 14 }}>
          {[
            ['Proposal No.', String(data.proposalNo || '—'), true],
            ['Quotation No.', String(data.quotationNo || '—'), true],
            ['ชื่อโปรเจกต์', String(data.projectName || '—'), false],
            ['ประเภทการขาย', SALE_TYPE_LABELS[String(data.saleType || '') as SaleType] ?? '—', false],
            ['Sales', `${currentUser.name} (${currentUser.email})`, false],
            ['วัตถุประสงค์', String(data.requestPurpose || '—'), false],
          ].map(([k, v, mono]) => (
            <div key={k as string}>
              <div style={{ fontSize: 11, color: '#718096', fontWeight: 600, marginBottom: 2 }}>{k as string}</div>
              <div style={{ fontFamily: mono ? 'JetBrains Mono, monospace' : undefined }}>{v as string}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Customer */}
      <Card title="2. ข้อมูลลูกค้า">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 14 }}>
          <div><div style={{ fontSize: 11, color: '#718096', fontWeight: 600, marginBottom: 2 }}>ประเภทลูกค้า</div><div>{CUSTOMER_TYPE_LABELS[customerType] ?? '—'}</div></div>
          <div><div style={{ fontSize: 11, color: '#718096', fontWeight: 600, marginBottom: 2 }}>ชื่อบริษัท</div><div>{customerName || '—'}</div></div>
        </div>
      </Card>

      {/* 3. Financial */}
      <Card title="3. สรุปทางการเงิน">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, textAlign: 'center' }}>
          {[
            { label: 'Total Selling', value: formatCurrency(totalSelling), big: true },
            { label: 'Total Cost', value: formatCurrency(totalCost) },
            { label: 'Gross Profit', value: formatCurrency(gp), danger: gp < 0 },
            { label: 'Margin %', value: `${margin.toFixed(2)}%`, danger: margin < 0 },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: f.big ? 20 : 16, fontWeight: 700, color: f.danger ? '#DC2626' : '#1A202C', fontFamily: 'JetBrains Mono, monospace' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Payment Schedule */}
      <Card title="4. Payment Schedule">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F7FAFC' }}>
              {['งวด', '% งวด', 'จำนวนเงิน', 'Credit Term', 'เงื่อนไข', 'เหตุผล'].map(h => (
                <th key={h} style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'left', border: '1px solid #E2E8F0', color: '#4A5568', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {installments.slice(0, installmentCount).map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F7FAFC' }}>
                <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0', fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0' }}>{numVal(row.installmentPercent)}%</td>
                <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0', fontFamily: 'monospace' }}>{formatCurrency(calcInstallmentAmount(totalSelling, numVal(row.installmentPercent)))}</td>
                <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0' }}>{formatCreditTerm(numVal(row.creditTermDays))}</td>
                <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0', fontSize: 12 }}>{PAYMENT_CONDITION_LABELS[row.paymentCondition as PaymentCondition] || '—'}</td>
                <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0', fontSize: 12, color: '#4A5568' }}>{row.creditTermReason || '—'}</td>
              </tr>
            ))}
            <tr style={{ background: '#EBF0F6', fontWeight: 700 }}>
              <td colSpan={2} style={{ padding: '8px 10px', border: '1px solid #E2E8F0' }}>รวม</td>
              <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0', fontFamily: 'monospace' }}>{formatCurrency(totalSelling)}</td>
              <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0' }}>Max: {formatCreditTerm(maxCreditTerm)}</td>
              <td colSpan={2} style={{ padding: '8px 10px', border: '1px solid #E2E8F0', color: pctNotComplete ? '#DC2626' : '#16A34A' }}>
                {totalPct.toFixed(1)}% {pctNotComplete ? '⚠ ≠ 100%' : '✓'}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Confirmation */}
      <Card>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => { setConfirmed(e.target.checked); setError('') }}
            style={{ marginTop: 2, accentColor: '#1E3A5F', width: 16, height: 16 }}
          />
          <span style={{ fontSize: 14, lineHeight: 1.5, color: '#1A202C' }}>
            ข้าพเจ้ายืนยันว่าข้อมูลที่กรอกถูกต้อง และพร้อมสำหรับการพิจารณาอนุมัติ
          </span>
        </label>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: '#DC2626' }}>{error}</div>}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={onBack} disabled={draftLoading || submitLoading}>ย้อนกลับ</Button>
        <div style={{ display: 'flex', gap: 10 }}>
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
