import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../../app/UserContext'
import { getRequestById, saveDraft, resubmitRequest, submitRequest, updatePendingRequest } from '../services/creditTermService'
import type { Request, QuotationItem, PaymentInstallment, SaleType } from '../types/request'
import type { RequestCustomerInfo } from '../types/customer'
import { RequestFormStepper } from '../components/RequestFormStepper'
import { calcGrossProfit, calcMarginPercent, calcInstallmentAmount } from '../utils/calculations'
import { generateId } from '../data/mockRequests'
import { canEditRequest } from '../utils/permissions'
import { Alert } from '../../../components/ui/Alert'
import { BackButton } from '../../../components/ui/BackButton'

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

  const isLumpSum = saleType === 'lump_sum'

  // HW installments (lump sum reuses this slot as the single combined plan,
  // sized on totalSelling instead of hwSp — see RequestFormStepper's isLumpSum branch)
  const hwCreditTermDays = numVal(data.hwCreditTermDays)
  // UNIFORM_MODE (default, true unless the form explicitly turned it off) —
  // applies the one shared value to every row; CUSTOM_MODE reads each row's
  // own creditTermDays instead.
  const hwCreditTermUniform = data.hwCreditTermUniform !== false
  const hwInstallmentCount = numVal(data.hwInstallmentCount) || 1
  const rawHwInst = (data.hwInstallments as Array<{ installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: string }>) ?? []
  const hwBase = isLumpSum ? totalSelling : (hwSp > 0 ? hwSp : totalSelling)
  const installments: PaymentInstallment[] = rawHwInst.slice(0, hwInstallmentCount).map((row, i) => ({
    installmentNo: i + 1,
    installmentPercent: numVal(row.installmentPercent),
    installmentAmount: calcInstallmentAmount(hwBase, numVal(row.installmentPercent)),
    creditTermDays: hwCreditTermUniform ? hwCreditTermDays : numVal(row.creditTermDays),
    paymentCondition: (row.paymentCondition || 'on_delivery') as PaymentInstallment['paymentCondition'],
  }))

  // SW installments — lump sum merges everything into the single `installments`
  // plan above, so this block (and swInstallmentCount/swInstallments) stays
  // undefined for that sale type.
  let swInstallments: PaymentInstallment[] | undefined
  let swInstallmentCount: number | undefined
  if (!isLumpSum && (swSp > 0 || instSp > 0)) {
    const swCreditTermDays = numVal(data.swCreditTermDays)
    const swCreditTermUniform = data.swCreditTermUniform !== false
    const swCount = numVal(data.swInstallmentCount) || 1
    swInstallmentCount = swCount
    const rawSwInst = (data.swInstallments as Array<{ installmentPercent: number | ''; creditTermDays: number | ''; paymentCondition: string }>) ?? []
    const swTotal = numVal(data.softwareSellingPrice) + numVal(data.installationSellingPrice)
    swInstallments = rawSwInst.slice(0, swCount).map((row, i) => ({
      installmentNo: i + 1,
      installmentPercent: numVal(row.installmentPercent),
      installmentAmount: calcInstallmentAmount(swTotal, numVal(row.installmentPercent)),
      creditTermDays: swCreditTermUniform ? swCreditTermDays : numVal(row.creditTermDays),
      paymentCondition: (row.paymentCondition || 'on_delivery') as PaymentInstallment['paymentCondition'],
    }))
  }

  const allInstallments = [...installments, ...(swInstallments ?? [])]
  const maxCreditTerm = allInstallments.reduce((m, i) => Math.max(m, i.creditTermDays), 0)

  return {
    proposalNo: String(data.proposalNo || ''),
    saleType,
    customerInfo,
    quotationItems: items,
    solutions: (data.solutions as string[] | undefined) ?? [],
    swSolutions: (data.swSolutions as string[] | undefined) ?? [],
    installmentCount: hwInstallmentCount,
    installments,
    swInstallmentCount,
    swInstallments,
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

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#586782' }}>กำลังโหลด...</div>
  if (!req) return <div style={{ padding: 48, textAlign: 'center', color: '#586782' }}>ไม่พบคำขอ</div>
  if (!canEditRequest(currentUser, req)) return (
    <Alert type="error">คุณไม่มีสิทธิ์แก้ไขคำขอนี้</Alert>
  )

  const isResubmit = req.status === 'rejected'
  const isPendingEdit = req.status === 'pending'

  async function handleSaveDraft(data: Record<string, unknown>) {
    if (!id) return
    const patch = buildPatch(data, currentUser)
    await saveDraft(id, patch, currentUser)
    navigate(`/requests/${id}`, { replace: true, state: { toast: 'บันทึกแบบร่างเรียบร้อยแล้ว' } })
  }

  async function handleSubmit(data: Record<string, unknown>) {
    if (!id) return
    const patch = buildPatch(data, currentUser)
    let toastMsg = 'ส่งคำขออนุมัติเรียบร้อยแล้ว'
    if (isResubmit) {
      await resubmitRequest(id, patch, currentUser)
    } else if (isPendingEdit) {
      await updatePendingRequest(id, patch, currentUser)
      toastMsg = 'บันทึกการแก้ไขเรียบร้อยแล้ว'
    } else {
      await saveDraft(id, patch, currentUser)
      await submitRequest(id, currentUser)
    }
    navigate(`/requests/${id}`, { replace: true, state: { toast: toastMsg } })
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <BackButton to={`/requests/${id}`} label="กลับไปหน้ารายละเอียดคำขอ" />
      </div>
      <div style={{ maxWidth: 760, margin: '0 auto 0' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 500, color: '#586782' }}>
          {isResubmit ? 'แก้ไขและส่งขออนุมัติอีกครั้ง' : isPendingEdit ? 'แก้ไขคำขอที่รออนุมัติ' : 'แก้ไขคำขอ'} — {req.requestNo}
        </h1>
      </div>
      <RequestFormStepper
        initialRequest={req}
        currentUser={currentUser}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onResubmit={handleSubmit}
        isResubmit={isResubmit}
        isPendingEdit={isPendingEdit}
      />
    </div>
  )
}
