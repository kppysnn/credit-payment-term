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

  const saleType = String(data.saleType || '') as SaleType
  const showSw = saleType === 'hardware_software_installation'
  const hw = (data.hardwareItems as Array<{ name: string; sellingPrice: number | ''; cost: number | '' }>) ?? []
  const hwSelling = hw.reduce((s, i) => s + numVal(i.sellingPrice), 0)
  const hwCost    = hw.reduce((s, i) => s + numVal(i.cost), 0)
  const swSelling = numVal(data.softwareSellingPrice)
  const swCost    = numVal(data.softwareCost)
  const instSelling = numVal(data.installationSellingPrice)
  const instCost    = numVal(data.installationCost)
  const totalSelling = hwSelling + swSelling + instSelling
  const totalCost    = hwCost + swCost + instCost
  const gp = totalSelling - totalCost
  const margin = calcMarginPercent(totalSelling, gp)

  const installments = (data.installments as Array<{ installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: PaymentCondition | '' }>) ?? []
  const installmentCount = numVal(data.installmentCount) || 1
  const totalPct = calcTotalInstallmentPercent(installments.slice(0, installmentCount))
  const maxCreditTerm = installments.slice(0, installmentCount).reduce((m, i) => Math.max(m, numVal(i.creditTermDays)), 0)
  const pctNotComplete = Math.abs(totalPct - 100) > 0.01

  const customerType = String(data.customerType || '') as CustomerType
  let customerName = '—'
  if (customerType === 'new') customerName = String((data.newCustomer as Record<string, unknown>)?.companyName ?? '—')
  else if (customerType === 'existing') customerName = String((data.existingCustomer as Record<string, unknown>)?.companyName ?? '—')
  else if (customerType === 'reseller') {
    const rs = data.reseller as Record<string, unknown>
    customerName = `${rs?.resellerCompanyName ?? '—'} → ${rs?.endCustomerCompanyName ?? '—'}`
  }

  const proposalNo = String(data.proposalNo || '')
  const q1No = proposalNo ? `${proposalNo}-1` : 'Q1'
  const q2No = proposalNo ? `${proposalNo}-2` : 'Q2'

  const warnings: string[] = []
  if (gp < 0) warnings.push('Gross Profit ติดลบ')
  if (pctNotComplete) warnings.push(`ผลรวมงวด ${totalPct.toFixed(0)}% ≠ 100%`)

  async function handleDraft() {
    setDraftLoading(true); setError('')
    try { await onSaveDraft() } catch (e: unknown) { setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด') }
    finally { setDraftLoading(false) }
  }

  async function handleSubmit() {
    if (!confirmed) { setError('กรุณายืนยันข้อมูล'); return }
    if (pctNotComplete) { setError('ผลรวม % งวดต้องเท่ากับ 100%'); return }
    setSubmitLoading(true); setError('')
    try { await onSubmit() } catch (e: unknown) { setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด') }
    finally { setSubmitLoading(false) }
  }

  const th = (label: string, style?: React.CSSProperties) => (
    <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F2F6F8', ...style }}>{label}</th>
  )
  const td = (children: React.ReactNode, style?: React.CSSProperties) => (
    <td style={{ padding: '9px 12px', verticalAlign: 'middle', borderBottom: '1px solid #D0D6DF', fontSize: 13, ...style }}>{children}</td>
  )
  const mono = (v: string, danger?: boolean) => (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: danger ? '#F3554F' : '#001122' }}>{v}</span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isResubmit && initialRequest?.approvalResult && (
        <Alert type="error" title="เหตุผลที่ถูก Reject ครั้งก่อน">
          <div style={{ marginTop: 4 }}>{initialRequest.approvalResult.decisionComment}</div>
          {initialRequest.approvalResult.suggestion && <div style={{ marginTop: 4, color: '#586782' }}>{initialRequest.approvalResult.suggestion}</div>}
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert type="warning" title="ข้อควรระวัง">
          <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
            {warnings.map(w => <li key={w}>{w}</li>)}
          </ul>
        </Alert>
      )}

      {/* Info */}
      <Card title="ข้อมูลคำขอ">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 14 }}>
          {[
            ['Proposal No.', proposalNo || '—', true],
            ['ชื่อโปรเจกต์', String(data.projectName || '—'), false],
            ['ประเภทการขาย', SALE_TYPE_LABELS[saleType] ?? saleType, false],
            ['ประเภทลูกค้า', CUSTOMER_TYPE_LABELS[customerType] ?? '—', false],
            ['ลูกค้า', customerName, false],
            ['Sales', currentUser.name, false],
          ].map(([k, v, mono_]) => (
            <div key={k as string}>
              <div style={{ fontSize: 11, color: '#586782', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k as string}</div>
              <div style={{ fontFamily: mono_ ? 'JetBrains Mono, monospace' : undefined, color: '#001122' }}>{v as string}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Q1 */}
      <Card title={`Quotation No. ${q1No}`} noPad>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
              {th('ชื่อสินค้า', { width: '50%' })}
              {th('ราคาขาย', { textAlign: 'right' as const })}
              {th('ราคาทุน', { textAlign: 'right' as const })}
              {th('GP', { textAlign: 'right' as const })}
            </tr>
          </thead>
          <tbody>
            {hw.map((item, i) => (
              <tr key={i}>
                {td(item.name || '—')}
                {td(mono(formatCurrency(numVal(item.sellingPrice))), { textAlign: 'right' as const })}
                {td(mono(formatCurrency(numVal(item.cost))), { textAlign: 'right' as const })}
                {td(mono(formatCurrency(numVal(item.sellingPrice) - numVal(item.cost)), (numVal(item.sellingPrice) - numVal(item.cost)) < 0), { textAlign: 'right' as const })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#FAFBFC', borderTop: '2px solid #D0D6DF' }}>
              <td style={{ padding: '9px 12px', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>รวม Q1</td>
              <td style={{ padding: '9px 12px', textAlign: 'right' }}>{mono(formatCurrency(hwSelling))}</td>
              <td style={{ padding: '9px 12px', textAlign: 'right' }}>{mono(formatCurrency(hwCost))}</td>
              <td style={{ padding: '9px 12px', textAlign: 'right' }}>{mono(formatCurrency(hwSelling - hwCost), (hwSelling - hwCost) < 0)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Q2 */}
      {showSw && (
        <Card title={`Quotation No. ${q2No}`} noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
                {th('รายการ', { width: '40%' })}
                {th('ราคาขาย', { textAlign: 'right' as const })}
                {th('ราคาทุน', { textAlign: 'right' as const })}
                {th('GP', { textAlign: 'right' as const })}
              </tr>
            </thead>
            <tbody>
              {swSelling > 0 && <tr><td style={{ padding: '9px 12px', borderBottom: '1px solid #D0D6DF' }}>Software</td><td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '1px solid #D0D6DF' }}>{mono(formatCurrency(swSelling))}</td><td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '1px solid #D0D6DF' }}>{mono(formatCurrency(swCost))}</td><td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '1px solid #D0D6DF' }}>{mono(formatCurrency(swSelling - swCost), (swSelling - swCost) < 0)}</td></tr>}
              {instSelling > 0 && <tr><td style={{ padding: '9px 12px', borderBottom: '1px solid #D0D6DF' }}>Installation</td><td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '1px solid #D0D6DF' }}>{mono(formatCurrency(instSelling))}</td><td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '1px solid #D0D6DF' }}>{mono(formatCurrency(instCost))}</td><td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: '1px solid #D0D6DF' }}>{mono(formatCurrency(instSelling - instCost), (instSelling - instCost) < 0)}</td></tr>}
            </tbody>
            <tfoot>
              <tr style={{ background: '#FAFBFC', borderTop: '2px solid #D0D6DF' }}>
                <td style={{ padding: '9px 12px', fontWeight: 700, color: '#586782', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>รวม Q2</td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>{mono(formatCurrency(swSelling + instSelling))}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>{mono(formatCurrency(swCost + instCost))}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>{mono(formatCurrency((swSelling + instSelling) - (swCost + instCost)), ((swSelling + instSelling) - (swCost + instCost)) < 0)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {/* Grand Total */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, padding: '14px 20px', background: '#FAFBFC', border: '1px solid #D0D6DF', borderRadius: 10 }}>
        {[
          { label: 'ราคาขายรวม', value: formatCurrency(totalSelling), color: '#001122' },
          { label: 'ต้นทุนรวม', value: formatCurrency(totalCost), color: '#586782' },
          { label: 'Gross Profit', value: formatCurrency(gp), color: gp < 0 ? '#F3554F' : '#004081' },
          { label: 'Margin %', value: `${margin.toFixed(1)}%`, color: margin < 0 ? '#F3554F' : '#586782' },
        ].map(f => (
          <div key={f.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#929EB4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: f.color, fontFamily: 'JetBrains Mono, monospace' }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* Payment */}
      <Card title="งวดชำระ" noPad>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #D0D6DF' }}>
              {th('#', { width: 36 })}
              {th('% งวด')}
              {th('จำนวนเงิน')}
              {th('Credit Term')}
              {th('เงื่อนไข')}
            </tr>
          </thead>
          <tbody>
            {installments.slice(0, installmentCount).map((row, i) => (
              <tr key={i}>
                {td(<span style={{ fontWeight: 700, color: '#004081' }}>{i + 1}</span>)}
                {td(`${numVal(row.installmentPercent)}%`)}
                {td(mono(formatCurrency(calcInstallmentAmount(totalSelling, numVal(row.installmentPercent)))))}
                {td(formatCreditTerm(numVal(row.creditTermDays)))}
                {td(PAYMENT_CONDITION_LABELS[row.paymentCondition as PaymentCondition] || '—')}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#FAFBFC', borderTop: '2px solid #D0D6DF' }}>
              <td style={{ padding: '9px 12px' }} />
              <td style={{ padding: '9px 12px', fontWeight: 700, color: pctNotComplete ? '#F3554F' : '#66C5C5' }}>{totalPct.toFixed(0)}%{pctNotComplete ? ' ⚠' : ' ✓'}</td>
              <td style={{ padding: '9px 12px' }}>{mono(formatCurrency(totalSelling))}</td>
              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#001122' }}>Max: {formatCreditTerm(maxCreditTerm)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Confirm */}
      <Card>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setError('') }}
            style={{ marginTop: 2, accentColor: '#004081', width: 16, height: 16 }} />
          <span style={{ fontSize: 14, lineHeight: 1.5, color: '#001122' }}>
            ข้าพเจ้ายืนยันว่าข้อมูลที่กรอกถูกต้อง และพร้อมสำหรับการพิจารณาอนุมัติ
          </span>
        </label>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: '#F3554F' }}>{error}</div>}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={onBack} disabled={draftLoading || submitLoading}>ย้อนกลับ</Button>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" icon={<Save size={15} />} onClick={handleDraft} loading={draftLoading} disabled={submitLoading}>บันทึกแบบร่าง</Button>
          <Button icon={<Send size={15} />} onClick={handleSubmit} loading={submitLoading} disabled={draftLoading}>
            {isResubmit ? 'ส่งขออนุมัติอีกครั้ง' : 'ส่งขออนุมัติ'}
          </Button>
        </div>
      </div>
    </div>
  )
}
