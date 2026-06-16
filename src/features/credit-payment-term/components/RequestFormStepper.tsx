import { useState, useCallback } from 'react'
import type { Request } from '../types/request'
import type { CurrentUser } from '../types/user'
import { RequestInformationStep } from './RequestInformationStep'
import { CustomerInformationStep } from './CustomerInformationStep'
import { QuotationInformationStep } from './QuotationInformationStep'
import { PaymentCreditTermStep } from './PaymentCreditTermStep'
import { SummarySubmitStep } from './SummarySubmitStep'
import { StickyRequestSummary } from './StickyRequestSummary'
import { Check } from 'lucide-react'

export interface FormState {
  step1: Record<string, unknown>
  step2: Record<string, unknown>
  step3: Record<string, unknown>
  step4: Record<string, unknown>
}

const STEPS = [
  'ข้อมูลคำขอ',
  'ข้อมูลลูกค้า',
  'ใบเสนอราคา',
  'Payment & Credit Term',
  'สรุปและส่ง',
]

interface Props {
  initialRequest?: Request
  currentUser: CurrentUser
  onSaveDraft: (data: Record<string, unknown>) => Promise<void>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onResubmit?: (data: Record<string, unknown>) => Promise<void>
  isResubmit?: boolean
}

export function RequestFormStepper({
  initialRequest,
  currentUser,
  onSaveDraft,
  onSubmit,
  onResubmit,
  isResubmit = false,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, unknown>>(
    initialRequest ? flattenRequest(initialRequest) : getDefaults(currentUser),
  )

  const updateFormData = useCallback((patch: Record<string, unknown>) => {
    setFormData(prev => ({ ...prev, ...patch }))
  }, [])

  function next() { setCurrentStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function back() { setCurrentStep(s => Math.max(s - 1, 0)) }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Main form area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Stepper */}
        <div style={{ display: 'flex', marginBottom: 24, background: '#fff', border: '1px solid #D0D6DF', borderRadius: 14, padding: '16px 20px', gap: 4 }}>
          {STEPS.map((label, idx) => {
            const done = idx < currentStep
            const active = idx === currentStep
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : undefined }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      background: done ? '#66C5C5' : active ? '#004081' : '#F2F6F8',
                      border: `2px solid ${done ? '#66C5C5' : active ? '#004081' : '#D0D6DF'}`,
                      color: done || active ? '#fff' : '#929EB4',
                      cursor: done ? 'pointer' : 'default',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                    onClick={() => done && setCurrentStep(idx)}
                  >
                    {done ? <Check size={12} /> : idx + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#004081' : done ? '#66C5C5' : '#929EB4', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? '#66C5C5' : '#D0D6DF', margin: '0 8px', marginBottom: 18, transition: 'background 0.2s' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        {currentStep === 0 && (
          <RequestInformationStep data={formData} onChange={updateFormData} onNext={next} />
        )}
        {currentStep === 1 && (
          <CustomerInformationStep data={formData} onChange={updateFormData} onNext={next} onBack={back} />
        )}
        {currentStep === 2 && (
          <QuotationInformationStep data={formData} onChange={updateFormData} onNext={next} onBack={back} />
        )}
        {currentStep === 3 && (
          <PaymentCreditTermStep data={formData} onChange={updateFormData} onNext={next} onBack={back} />
        )}
        {currentStep === 4 && (
          <SummarySubmitStep
            data={formData}
            currentUser={currentUser}
            onBack={back}
            onSaveDraft={() => onSaveDraft(formData)}
            onSubmit={() => (isResubmit && onResubmit ? onResubmit(formData) : onSubmit(formData))}
            isResubmit={isResubmit}
            initialRequest={initialRequest}
          />
        )}
      </div>

      {/* Sticky summary */}
      <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 24 }}>
        <StickyRequestSummary data={formData} currentStep={currentStep} />
      </div>
    </div>
  )
}

function getDefaults(user: CurrentUser): Record<string, unknown> {
  return {
    salesName: user.name,
    salesEmail: user.email,
    salesId: user.id,
    proposalNo: '',
    quotationNo: '',
    projectName: '',
    saleType: '',
    requestPurpose: '',
    remark: '',
    customerType: '',
    newCustomer: { companyName: '', taxId: '', contactPerson: '', contactEmail: '', contactPhone: '', remark: '', creditTermReason: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', taxId: '', defaultCreditTerm: '', contactPerson: '', contactEmail: '', contactPhone: '' },
    reseller: { resellerCompanyName: '', resellerContactPerson: '', resellerEmail: '', resellerPhone: '', endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerEmail: '', endCustomerPhone: '', billingTo: '', creditTermAppliesTo: '' },
    hardwareItems: [{ name: '', description: '', sellingPrice: '', cost: '', remark: '' }],
    softwareName: '',
    softwareDescription: '',
    softwareSellingPrice: '',
    softwareCost: '',
    softwareRemark: '',
    installationDescription: '',
    installationSellingPrice: '',
    installationCost: '',
    installationRemark: '',
    installmentCount: 1,
    paymentTermReason: '',
    overallCreditTermReason: '',
    installments: [{ installmentPercent: 100, creditTermDays: 0, paymentCondition: '', creditTermReason: '', remark: '' }],
  }
}

function flattenRequest(req: Request): Record<string, unknown> {
  const d: Record<string, unknown> = {
    salesName: req.salesName,
    salesEmail: req.salesEmail,
    salesId: req.salesId,
    proposalNo: req.proposalNo,
    quotationNo: req.quotationNo ?? '',
    projectName: req.projectName,
    saleType: req.saleType,
    requestPurpose: req.requestPurpose,
    remark: req.remark ?? '',
    customerType: req.customerInfo.type,
    installmentCount: req.installmentCount,
    paymentTermReason: req.paymentTermReason,
    overallCreditTermReason: req.creditTermReason ?? '',
    installments: req.installments.map(i => ({
      installmentPercent: i.installmentPercent,
      creditTermDays: i.creditTermDays,
      paymentCondition: i.paymentCondition,
      creditTermReason: i.creditTermReason,
      remark: i.remark ?? '',
    })),
    newCustomer: { companyName: '', taxId: '', contactPerson: '', contactEmail: '', contactPhone: '', remark: '', creditTermReason: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', taxId: '', defaultCreditTerm: '', contactPerson: '', contactEmail: '', contactPhone: '' },
    reseller: { resellerCompanyName: '', resellerContactPerson: '', resellerEmail: '', resellerPhone: '', endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerEmail: '', endCustomerPhone: '', billingTo: '', creditTermAppliesTo: '' },
  }

  const ci = req.customerInfo
  if (ci.type === 'new') d.newCustomer = ci.data
  else if (ci.type === 'existing') { d.existingCustomerId = ci.data.customerId; d.existingCustomer = ci.data }
  else if (ci.type === 'reseller') d.reseller = ci.data

  const hw = req.quotationItems.filter(i => i.type === 'hardware')
  const sw = req.quotationItems.find(i => i.type === 'software')
  const inst = req.quotationItems.find(i => i.type === 'installation')
  d.hardwareItems = hw.map(h => ({ name: h.name, description: h.description ?? '', sellingPrice: h.sellingPrice, cost: h.cost, remark: h.remark ?? '' }))
  if (sw) { d.softwareName = sw.name; d.softwareDescription = sw.description ?? ''; d.softwareSellingPrice = sw.sellingPrice; d.softwareCost = sw.cost; d.softwareRemark = sw.remark ?? '' }
  if (inst) { d.installationDescription = inst.description ?? ''; d.installationSellingPrice = inst.sellingPrice; d.installationCost = inst.cost; d.installationRemark = inst.remark ?? '' }

  return d
}
