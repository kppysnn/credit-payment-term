import { useState, useCallback } from 'react'
import type { Request } from '../types/request'
import type { CurrentUser } from '../types/user'
import { RequestInformationStep } from './RequestInformationStep'
import { QuotationInformationStep } from './QuotationInformationStep'
import { SummarySubmitStep } from './SummarySubmitStep'
import { StickyRequestSummary } from './StickyRequestSummary'
import { Check } from 'lucide-react'

const STEPS = ['ข้อมูลคำขอ & ลูกค้า', 'ใบเสนอราคา & งวด', 'สรุปและส่ง']

interface Props {
  initialRequest?: Request
  currentUser: CurrentUser
  onSaveDraft: (data: Record<string, unknown>) => Promise<void>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onResubmit?: (data: Record<string, unknown>) => Promise<void>
  isResubmit?: boolean
}

export function RequestFormStepper({ initialRequest, currentUser, onSaveDraft, onSubmit, onResubmit, isResubmit = false }: Props) {
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
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Stepper */}
        <div style={{ display: 'flex', marginBottom: 24, background: '#fff', border: '1px solid #D0D6DF', borderRadius: 14, padding: '16px 24px', gap: 4 }}>
          {STEPS.map((label, idx) => {
            const done = idx < currentStep
            const active = idx === currentStep
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : undefined }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, cursor: done ? 'pointer' : 'default', flexShrink: 0, transition: 'all 0.15s',
                      background: done ? '#66C5C5' : active ? '#004081' : '#F2F6F8',
                      border: `2px solid ${done ? '#66C5C5' : active ? '#004081' : '#D0D6DF'}`,
                      color: done || active ? '#fff' : '#929EB4',
                    }}
                    onClick={() => done && setCurrentStep(idx)}
                  >
                    {done ? <Check size={13} /> : idx + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#004081' : done ? '#66C5C5' : '#929EB4', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? '#66C5C5' : '#D0D6DF', margin: '0 10px', marginBottom: 20, transition: 'background 0.2s' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        {currentStep === 0 && <RequestInformationStep data={formData} onChange={updateFormData} onNext={next} />}
        {currentStep === 1 && <QuotationInformationStep data={formData} onChange={updateFormData} onNext={next} onBack={back} />}
        {currentStep === 2 && (
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
    projectName: '',
    saleType: '',
    customerType: '',
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', taxId: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerPhone: '' },
    hardwareItems: [{ name: '', sellingPrice: '', cost: '' }],
    softwareSellingPrice: '',
    softwareCost: '',
    installationSellingPrice: '',
    installationCost: '',
    installmentCount: 1,
    installments: [{ installmentPercent: '', creditTermDays: 0, paymentCondition: 'on_delivery' }],
  }
}

function flattenRequest(req: Request): Record<string, unknown> {
  const d: Record<string, unknown> = {
    salesName: req.salesName,
    salesEmail: req.salesEmail,
    salesId: req.salesId,
    proposalNo: req.proposalNo,
    projectName: req.projectName,
    saleType: req.saleType,
    customerType: req.customerInfo.type,
    installmentCount: req.installmentCount,
    installments: req.installments.map(i => ({
      installmentPercent: i.installmentPercent,
      creditTermDays: i.creditTermDays,
      paymentCondition: i.paymentCondition,
    })),
    newCustomer: { companyName: '', contactPerson: '', contactPhone: '' },
    existingCustomerId: '',
    existingCustomer: { companyName: '', taxId: '', defaultCreditTerm: 0, contactPerson: '', contactPhone: '' },
    reseller: { resellerId: '', resellerCompanyName: '', endCustomerCompanyName: '', endCustomerContactPerson: '', endCustomerPhone: '' },
    softwareSellingPrice: '',
    softwareCost: '',
    installationSellingPrice: '',
    installationCost: '',
  }

  const ci = req.customerInfo
  if (ci.type === 'new') {
    d.newCustomer = { companyName: ci.data.companyName, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  } else if (ci.type === 'existing') {
    d.existingCustomerId = ci.data.customerId
    d.existingCustomer = { companyName: ci.data.companyName, taxId: ci.data.taxId ?? '', defaultCreditTerm: ci.data.defaultCreditTerm ?? 0, contactPerson: ci.data.contactPerson ?? '', contactPhone: ci.data.contactPhone ?? '' }
  } else if (ci.type === 'reseller') {
    d.reseller = { resellerId: ci.data.resellerId, resellerCompanyName: ci.data.resellerCompanyName, endCustomerCompanyName: ci.data.endCustomerCompanyName, endCustomerContactPerson: ci.data.endCustomerContactPerson ?? '', endCustomerPhone: ci.data.endCustomerPhone ?? '' }
  }

  const hw = req.quotationItems.filter(i => i.type === 'hardware')
  const sw = req.quotationItems.find(i => i.type === 'software')
  const inst = req.quotationItems.find(i => i.type === 'installation')
  d.hardwareItems = hw.length > 0
    ? hw.map(h => ({ name: h.name, sellingPrice: h.sellingPrice, cost: h.cost }))
    : [{ name: '', sellingPrice: '', cost: '' }]
  if (sw) { d.softwareSellingPrice = sw.sellingPrice; d.softwareCost = sw.cost }
  if (inst) { d.installationSellingPrice = inst.sellingPrice; d.installationCost = inst.cost }

  return d
}
