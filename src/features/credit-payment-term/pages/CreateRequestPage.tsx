import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { RequestFormStepper } from '../components/RequestFormStepper'
import { createRequest, submitRequest } from '../services/creditTermService'
import type { Request, QuotationItem, PaymentInstallment, SaleType, PaymentCondition } from '../types/request'
import type { RequestCustomerInfo } from '../types/customer'
import { calcGrossProfit, calcMarginPercent, calcInstallmentAmount } from '../utils/calculations'
import { generateId } from '../data/mockRequests'

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

  const installmentCount = numVal(data.installmentCount) || 1
  const rawInst = (data.installments as Array<{ installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: string }>) ?? []
  const creditTermDays = numVal(data.creditTermDays)
  const paymentCondition = String(data.paymentCondition || 'on_delivery') as PaymentCondition
  const installments: PaymentInstallment[] = rawInst.slice(0, installmentCount).map((row, i) => ({
    installmentNo: i + 1,
    installmentPercent: numVal(row.installmentPercent),
    installmentAmount: calcInstallmentAmount(totalSelling, numVal(row.installmentPercent)),
    creditTermDays,
    paymentCondition,
  }))

  const maxCreditTerm = installments.reduce((m, i) => Math.max(m, i.creditTermDays), 0)

  return {
    version: 1,
    salesEmail: user.email,
    salesName: user.name,
    salesId: user.id,
    proposalNo: String(data.proposalNo || ''),
    projectName: String(data.projectName || data.proposalNo || ''),
    saleType,
    customerInfo,
    quotationItems: items,
    installmentCount,
    installments,
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
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700 }}>สร้างคำขออนุมัติใหม่</h1>
      <RequestFormStepper
        currentUser={currentUser}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
