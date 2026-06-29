import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { RequestFormStepper } from '../components/RequestFormStepper'
import { createRequest, submitRequest } from '../services/creditTermService'
import type { Request, QuotationItem, PaymentInstallment, SaleType } from '../types/request'
import type { RequestCustomerInfo } from '../types/customer'
import { calcGrossProfit, calcMarginPercent, calcInstallmentAmount } from '../utils/calculations'
import { generateId } from '../data/mockRequests'
import { BackButton } from '../../../components/ui/BackButton'

function numVal(v: unknown): number { return Number(v) || 0 }

function buildRequestFromFormData(data: Record<string, unknown>, user: { id: string; name: string; email: string }): Omit<Request, 'id' | 'requestNo' | 'createdAt' | 'updatedAt' | 'history'> {
  const saleType = String(data.saleType || '') as SaleType

  const customerType = String(data.customerType || '') as 'new' | 'existing' | 'reseller'
  let customerInfo: RequestCustomerInfo
  if (customerType === 'new') {
    customerInfo = { type: 'new', data: data.newCustomer as never }
  } else if (customerType === 'existing') {
    const base = (data.existingCustomer ?? {}) as Record<string, unknown>
    customerInfo = { type: 'existing', data: { ...base, customerId: String(data.existingCustomerId ?? '') } as never }
  } else {
    customerInfo = { type: 'reseller', data: data.reseller as never }
  }

  const items: QuotationItem[] = []
  const hwSp = numVal(data.hardwareSellingPrice)
  const hwCost = numVal(data.hardwareCost)
  const hwGp = calcGrossProfit(hwSp, hwCost)
  if (hwSp > 0) items.push({ itemId: generateId('item'), type: 'hardware', name: 'Hardware', sellingPrice: hwSp, cost: hwCost, grossProfit: hwGp, marginPercent: calcMarginPercent(hwSp, hwGp) })

  const swSp = numVal(data.softwareSellingPrice)
  const swCost = numVal(data.softwareCost)
  const swGp = calcGrossProfit(swSp, swCost)
  if (swSp > 0) items.push({ itemId: generateId('item'), type: 'software', name: 'Software', sellingPrice: swSp, cost: swCost, grossProfit: swGp, marginPercent: calcMarginPercent(swSp, swGp) })

  const instSp = numVal(data.installationSellingPrice)
  const instCost = numVal(data.installationCost)
  const instGp = calcGrossProfit(instSp, instCost)
  if (instSp > 0) items.push({ itemId: generateId('item'), type: 'installation', name: 'Installation', sellingPrice: instSp, cost: instCost, grossProfit: instGp, marginPercent: calcMarginPercent(instSp, instGp) })

  const totalSelling = items.reduce((s, i) => s + i.sellingPrice, 0)
  const totalCost = items.reduce((s, i) => s + i.cost, 0)
  const grossProfit = totalSelling - totalCost
  const marginPercent = calcMarginPercent(totalSelling, grossProfit)

  // HW installments
  const hwCreditTermDays = numVal(data.hwCreditTermDays)
  const hwInstallmentCount = numVal(data.hwInstallmentCount) || 1
  const rawHwInst = (data.hwInstallments as Array<{ installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: string }>) ?? []
  const installments: PaymentInstallment[] = rawHwInst.slice(0, hwInstallmentCount).map((row, i) => ({
    installmentNo: i + 1,
    installmentPercent: numVal(row.installmentPercent),
    installmentAmount: calcInstallmentAmount(hwSp > 0 ? hwSp : totalSelling, numVal(row.installmentPercent)),
    creditTermDays: hwCreditTermDays,
    paymentCondition: (row.paymentCondition || 'on_delivery') as PaymentInstallment['paymentCondition'],
  }))

  // SW installments (whenever there's software/installation value to schedule —
  // the form always shows this block, regardless of saleType)
  let swInstallments: PaymentInstallment[] | undefined
  let swInstallmentCount: number | undefined
  if (swSp > 0 || instSp > 0) {
    const swCreditTermDays = numVal(data.swCreditTermDays)
    const swCount = numVal(data.swInstallmentCount) || 1
    swInstallmentCount = swCount
    const rawSwInst = (data.swInstallments as Array<{ installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: string }>) ?? []
    const swTotal = numVal(data.softwareSellingPrice) + numVal(data.installationSellingPrice)
    swInstallments = rawSwInst.slice(0, swCount).map((row, i) => ({
      installmentNo: i + 1,
      installmentPercent: numVal(row.installmentPercent),
      installmentAmount: calcInstallmentAmount(swTotal, numVal(row.installmentPercent)),
      creditTermDays: swCreditTermDays,
      paymentCondition: (row.paymentCondition || 'on_delivery') as PaymentInstallment['paymentCondition'],
    }))
  }

  const allInstallments = [...installments, ...(swInstallments ?? [])]
  const maxCreditTerm = allInstallments.reduce((m, i) => Math.max(m, i.creditTermDays), 0)

  return {
    version: 1,
    salesEmail: user.email,
    salesName: user.name,
    salesId: user.id,
    proposalNo: String(data.proposalNo || ''),
    saleType,
    customerInfo,
    quotationItems: items,
    installmentCount: hwInstallmentCount,
    installments,
    swInstallmentCount,
    swInstallments,
    financial: { totalSelling, totalCost, grossProfit, marginPercent, maxCreditTerm },
    status: 'draft',
  }
}

export function CreateRequestPage() {
  const { currentUser } = useCurrentUser()
  const navigate = useNavigate()

  async function handleSaveDraft(data: Record<string, unknown>) {
    const payload = buildRequestFromFormData(data, currentUser)
    const req = await createRequest(payload)
    navigate(`/requests/${req.id}`, { replace: true })
  }

  async function handleSubmit(data: Record<string, unknown>) {
    const payload = buildRequestFromFormData(data, currentUser)
    const req = await createRequest(payload)
    await submitRequest(req.id, currentUser)
    navigate(`/requests/${req.id}`, { replace: true })
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <BackButton to="/requests" label="กลับไปหน้ารายการคำขอ" />
      </div>
      <div style={{ maxWidth: 760, margin: '0 auto 0' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 500, color: '#586782' }}>สร้างคำขออนุมัติใหม่</h1>
      </div>
      <RequestFormStepper
        currentUser={currentUser}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
