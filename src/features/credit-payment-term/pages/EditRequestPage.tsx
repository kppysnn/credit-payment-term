import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequestById, saveDraft, resubmitRequest, submitRequest } from '../services/creditTermService'
import type { Request, QuotationItem, PaymentInstallment, SaleType, PaymentCondition } from '../types/request'
import type { RequestCustomerInfo } from '../types/customer'
import { RequestFormStepper } from '../components/RequestFormStepper'
import { calcGrossProfit, calcMarginPercent, calcInstallmentAmount } from '../utils/calculations'
import { generateId } from '../data/mockRequests'
import { canEditRequest } from '../utils/permissions'
import { Alert } from '../../../components/ui/Alert'

function numVal(v: unknown): number { return Number(v) || 0 }

function buildPatch(data: Record<string, unknown>, _user: { id: string; name: string; email: string }): Partial<Request> {
  const saleType = String(data.saleType || '') as SaleType

  const customerType = String(data.customerType || '') as 'new' | 'existing' | 'reseller'
  let customerInfo: RequestCustomerInfo
  if (customerType === 'new') customerInfo = { type: 'new', data: data.newCustomer as never }
  else if (customerType === 'existing') { const base = (data.existingCustomer ?? {}) as Record<string, unknown>; customerInfo = { type: 'existing', data: { ...base, customerId: String(data.existingCustomerId ?? '') } as never } }
  else customerInfo = { type: 'reseller', data: data.reseller as never }

  const items: QuotationItem[] = []
  const hwSp = numVal(data.hardwareSellingPrice); const hwCost = numVal(data.hardwareCost); const hwGp = calcGrossProfit(hwSp, hwCost)
  if (hwSp > 0) items.push({ itemId: generateId('item'), type: 'hardware', name: 'Hardware', sellingPrice: hwSp, cost: hwCost, grossProfit: hwGp, marginPercent: calcMarginPercent(hwSp, hwGp) })

  const swSp = numVal(data.softwareSellingPrice); const swCost = numVal(data.softwareCost); const swGp = calcGrossProfit(swSp, swCost)
  if (swSp > 0) items.push({ itemId: generateId('item'), type: 'software', name: 'Software', sellingPrice: swSp, cost: swCost, grossProfit: swGp, marginPercent: calcMarginPercent(swSp, swGp) })
  const instSp = numVal(data.installationSellingPrice); const instCost = numVal(data.installationCost); const instGp = calcGrossProfit(instSp, instCost)
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
    installmentNo: i + 1, installmentPercent: numVal(row.installmentPercent),
    installmentAmount: calcInstallmentAmount(totalSelling, numVal(row.installmentPercent)),
    creditTermDays, paymentCondition,
  }))
  const maxCreditTerm = installments.reduce((m, i) => Math.max(m, i.creditTermDays), 0)

  return {
    proposalNo: String(data.proposalNo || ''),
    projectName: String(data.projectName || ''),
    saleType,
    customerInfo, quotationItems: items, installmentCount,
    installments,
    financial: { totalSelling, totalCost, grossProfit, marginPercent, maxCreditTerm },
  }
}

export function EditRequestPage() {
  const { id } = useParams<{ id: string }>()
  const { currentUser } = useCurrentUser()
  const navigate = useNavigate()
  const [req, setReq] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getRequestById(id).then(r => { setReq(r ?? null); setLoading(false) })
  }, [id])

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#A0AEC0' }}>กำลังโหลด...</div>
  if (!req) return <div style={{ padding: 48, textAlign: 'center', color: '#A0AEC0' }}>ไม่พบคำขอ</div>
  if (!canEditRequest(currentUser, req)) return (
    <Alert type="error">คุณไม่มีสิทธิ์แก้ไขคำขอนี้</Alert>
  )

  const isResubmit = req.status === 'rejected'

  async function handleSaveDraft(data: Record<string, unknown>) {
    if (!id) return
    const patch = buildPatch(data, currentUser)
    await saveDraft(id, patch, currentUser)
    navigate(`/requests/${id}`)
  }

  async function handleSubmit(data: Record<string, unknown>) {
    if (!id) return
    if (isResubmit) {
      const patch = buildPatch(data, currentUser)
      await resubmitRequest(id, patch, currentUser)
    } else {
      const patch = buildPatch(data, currentUser)
      await saveDraft(id, patch, currentUser)
      await submitRequest(id, currentUser)
    }
    navigate(`/requests/${id}`)
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700 }}>
        {isResubmit ? 'แก้ไขและส่งขออนุมัติอีกครั้ง' : 'แก้ไขคำขอ'} — {req.requestNo}
      </h1>
      <RequestFormStepper
        initialRequest={req}
        currentUser={currentUser}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onResubmit={handleSubmit}
        isResubmit={isResubmit}
      />
    </div>
  )
}
