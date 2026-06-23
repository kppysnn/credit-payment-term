import type { Request } from '../types/request'

export const MOCK_REQUESTS: Request[] = [
  {
    id: 'req001',
    requestNo: 'CPT-2026-0001',
    version: 1,
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-02T14:30:00.000Z',
    salesEmail: 'sales@company.com',
    salesName: 'สมหญิง รักงาน',
    salesId: 'u001',
    proposalNo: 'PRO-2026-001',
    projectName: 'ระบบเครือข่ายสำนักงานใหญ่',
    saleType: 'hardware',
    customerInfo: {
      type: 'existing',
      data: {
        customerId: 'c001',
        companyName: 'บริษัท ทีคิวเอ็ม จำกัด',
        defaultCreditTerm: 30,
        contactPerson: 'คุณมาลี จันทร์เพ็ญ',
        contactPhone: '02-123-4567',
      },
    },
    quotationItems: [
      {
        itemId: 'item001',
        type: 'hardware',
        name: 'Cisco Switch 24-port',
        sellingPrice: 150000,
        cost: 110000,
        grossProfit: 40000,
        marginPercent: 26.67,
      },
      {
        itemId: 'item002',
        type: 'hardware',
        name: 'Cisco Router 4400 Series',
        sellingPrice: 250000,
        cost: 190000,
        grossProfit: 60000,
        marginPercent: 24.00,
      },
    ],
    installmentCount: 2,
    installments: [
      {
        installmentNo: 1,
        installmentPercent: 50,
        installmentAmount: 200000,
        creditTermDays: 30,
        paymentCondition: 'on_po',
      },
      {
        installmentNo: 2,
        installmentPercent: 50,
        installmentAmount: 200000,
        creditTermDays: 30,
        paymentCondition: 'on_delivery',
      },
    ],
    financial: {
      totalSelling: 400000,
      totalCost: 300000,
      grossProfit: 100000,
      marginPercent: 25.00,
      maxCreditTerm: 30,
    },
    status: 'approved',
    approvalResult: {
      approverEmail: 'approver@company.com',
      approverName: 'นายประยุทธ์ มั่นคง',
      approvedAt: '2026-06-03T10:00:00.000Z',
      decisionComment: 'อนุมัติ ลูกค้าเก่าที่มีประวัติดี margin เพียงพอ',
    },
    history: [
      {
        historyId: 'h001',
        requestId: 'req001',
        version: 1,
        action: 'created',
        actorEmail: 'sales@company.com',
        actorName: 'สมหญิง รักงาน',
        fromStatus: '',
        toStatus: 'draft',
        createdAt: '2026-06-01T09:00:00.000Z',
      },
      {
        historyId: 'h002',
        requestId: 'req001',
        version: 1,
        action: 'submitted',
        actorEmail: 'sales@company.com',
        actorName: 'สมหญิง รักงาน',
        fromStatus: 'draft',
        toStatus: 'pending',
        createdAt: '2026-06-02T14:30:00.000Z',
      },
      {
        historyId: 'h003',
        requestId: 'req001',
        version: 1,
        action: 'approved',
        actorEmail: 'approver@company.com',
        actorName: 'นายประยุทธ์ มั่นคง',
        fromStatus: 'pending',
        toStatus: 'approved',
        comment: 'อนุมัติ ลูกค้าเก่าที่มีประวัติดี margin เพียงพอ',
        createdAt: '2026-06-03T10:00:00.000Z',
      },
    ],
  },
  {
    id: 'req002',
    requestNo: 'CPT-2026-0002',
    version: 2,
    createdAt: '2026-06-05T10:00:00.000Z',
    updatedAt: '2026-06-10T09:00:00.000Z',
    salesEmail: 'sales@company.com',
    salesName: 'สมหญิง รักงาน',
    salesId: 'u001',
    proposalNo: 'PRO-2026-002',
    projectName: 'Software License + Installation Project',
    saleType: 'hardware_software_installation',
    customerInfo: {
      type: 'new',
      data: {
        companyName: 'บริษัท สตาร์ทอัพ เทคโนโลยี จำกัด',
        contactPerson: 'คุณปัญญา รุ่งเรือง',
        contactPhone: '081-234-5678',
      },
    },
    quotationItems: [
      {
        itemId: 'item003',
        type: 'hardware',
        name: 'Server Dell PowerEdge R750',
        sellingPrice: 300000,
        cost: 230000,
        grossProfit: 70000,
        marginPercent: 23.33,
      },
      {
        itemId: 'item004',
        type: 'software',
        name: 'SAP Business One License',
        sellingPrice: 500000,
        cost: 380000,
        grossProfit: 120000,
        marginPercent: 24.00,
      },
      {
        itemId: 'item005',
        type: 'installation',
        name: 'SAP B1 Implementation',
        sellingPrice: 200000,
        cost: 120000,
        grossProfit: 80000,
        marginPercent: 40.00,
      },
    ],
    installmentCount: 1,
    installments: [
      {
        installmentNo: 1,
        installmentPercent: 100,
        installmentAmount: 300000,
        creditTermDays: 15,
        paymentCondition: 'on_delivery',
      },
    ],
    swInstallmentCount: 2,
    swInstallments: [
      {
        installmentNo: 1,
        installmentPercent: 60,
        installmentAmount: 420000,
        creditTermDays: 30,
        paymentCondition: 'on_installation',
      },
      {
        installmentNo: 2,
        installmentPercent: 40,
        installmentAmount: 280000,
        creditTermDays: 30,
        paymentCondition: 'on_acceptance',
      },
    ],
    financial: {
      totalSelling: 1000000,
      totalCost: 730000,
      grossProfit: 270000,
      marginPercent: 27.00,
      maxCreditTerm: 30,
    },
    status: 'pending',
    history: [
      {
        historyId: 'h004',
        requestId: 'req002',
        version: 1,
        action: 'created',
        actorEmail: 'sales@company.com',
        actorName: 'สมหญิง รักงาน',
        fromStatus: '',
        toStatus: 'draft',
        createdAt: '2026-06-05T10:00:00.000Z',
      },
      {
        historyId: 'h005',
        requestId: 'req002',
        version: 1,
        action: 'submitted',
        actorEmail: 'sales@company.com',
        actorName: 'สมหญิง รักงาน',
        fromStatus: 'draft',
        toStatus: 'pending',
        createdAt: '2026-06-06T08:00:00.000Z',
      },
      {
        historyId: 'h006',
        requestId: 'req002',
        version: 1,
        action: 'rejected',
        actorEmail: 'approver@company.com',
        actorName: 'นายประยุทธ์ มั่นคง',
        fromStatus: 'pending',
        toStatus: 'rejected',
        comment: 'ลูกค้าใหม่ credit term 60 วันสูงเกินไป ขอ max 30 วัน',
        createdAt: '2026-06-07T11:00:00.000Z',
      },
      {
        historyId: 'h007',
        requestId: 'req002',
        version: 2,
        action: 'resubmitted',
        actorEmail: 'sales@company.com',
        actorName: 'สมหญิง รักงาน',
        fromStatus: 'rejected',
        toStatus: 'pending',
        comment: 'แก้ไข credit term งวดสุดท้ายจาก 60 วันเป็น 30 วัน',
        createdAt: '2026-06-10T09:00:00.000Z',
      },
    ],
  },
  {
    id: 'req003',
    requestNo: 'CPT-2026-0003',
    version: 1,
    createdAt: '2026-06-12T08:30:00.000Z',
    updatedAt: '2026-06-12T08:30:00.000Z',
    salesEmail: 'sales2@company.com',
    salesName: 'วิชัย สุขสบาย',
    salesId: 'u002',
    proposalNo: 'PRO-2026-003',
    projectName: 'Network Security Solution',
    saleType: 'hardware_software_installation',
    customerInfo: {
      type: 'reseller',
      data: {
        resellerId: 'r001',
        resellerCompanyName: 'บริษัท ไอที พาร์ทเนอร์ จำกัด',
        defaultCreditTerm: 30,
        contactPerson: 'คุณธนกร ไอที',
        contactPhone: '02-789-0123',
        endCustomerCompanyName: 'โรงพยาบาล เมดิซีน พลัส',
      },
    },
    quotationItems: [
      {
        itemId: 'item006',
        type: 'software',
        name: 'Fortinet FortiGate License',
        sellingPrice: 350000,
        cost: 270000,
        grossProfit: 80000,
        marginPercent: 22.86,
      },
      {
        itemId: 'item007',
        type: 'installation',
        name: 'Security Configuration & Training',
        sellingPrice: 80000,
        cost: 40000,
        grossProfit: 40000,
        marginPercent: 50.00,
      },
    ],
    installmentCount: 0,
    installments: [],
    swInstallmentCount: 1,
    swInstallments: [
      {
        installmentNo: 1,
        installmentPercent: 100,
        installmentAmount: 430000,
        creditTermDays: 45,
        paymentCondition: 'on_delivery',
      },
    ],
    financial: {
      totalSelling: 430000,
      totalCost: 310000,
      grossProfit: 120000,
      marginPercent: 27.91,
      maxCreditTerm: 45,
    },
    status: 'draft',
    history: [
      {
        historyId: 'h008',
        requestId: 'req003',
        version: 1,
        action: 'created',
        actorEmail: 'sales2@company.com',
        actorName: 'วิชัย สุขสบาย',
        fromStatus: '',
        toStatus: 'draft',
        createdAt: '2026-06-12T08:30:00.000Z',
      },
    ],
  },
  {
    id: 'req004',
    requestNo: 'CPT-2026-0004',
    version: 1,
    createdAt: '2026-06-14T13:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
    salesEmail: 'sales@company.com',
    salesName: 'สมหญิง รักงาน',
    salesId: 'u001',
    proposalNo: 'PRO-2026-004',
    projectName: 'Cloud Migration Project',
    saleType: 'hardware_software_installation',
    customerInfo: {
      type: 'existing',
      data: {
        customerId: 'c002',
        companyName: 'บริษัท สยามเทคโนโลยี จำกัด',
        defaultCreditTerm: 45,
        contactPerson: 'คุณสมชาย วิทยาการ',
        contactPhone: '02-234-5678',
      },
    },
    quotationItems: [
      {
        itemId: 'item008',
        type: 'software',
        name: 'Microsoft Azure 1-Year Subscription',
        sellingPrice: 600000,
        cost: 500000,
        grossProfit: 100000,
        marginPercent: 16.67,
      },
      {
        itemId: 'item009',
        type: 'installation',
        name: 'Cloud Migration Service',
        sellingPrice: 150000,
        cost: 80000,
        grossProfit: 70000,
        marginPercent: 46.67,
      },
    ],
    installmentCount: 0,
    installments: [],
    swInstallmentCount: 2,
    swInstallments: [
      {
        installmentNo: 1,
        installmentPercent: 60,
        installmentAmount: 450000,
        creditTermDays: 30,
        paymentCondition: 'on_po',
      },
      {
        installmentNo: 2,
        installmentPercent: 40,
        installmentAmount: 300000,
        creditTermDays: 45,
        paymentCondition: 'on_acceptance',
      },
    ],
    financial: {
      totalSelling: 750000,
      totalCost: 580000,
      grossProfit: 170000,
      marginPercent: 22.67,
      maxCreditTerm: 45,
    },
    status: 'rejected',
    approvalResult: {
      approverEmail: 'approver@company.com',
      approverName: 'นายประยุทธ์ มั่นคง',
      rejectedAt: '2026-06-15T09:00:00.000Z',
      decisionComment: 'Margin ต่ำเกินไปสำหรับ Azure subscription ขอให้ review ราคาใหม่',
      suggestion: 'ควร negotiate ราคา Azure กับ Microsoft อีกครั้ง หรือปรับ margin ให้ได้อย่างน้อย 20%',
    },
    history: [
      {
        historyId: 'h009',
        requestId: 'req004',
        version: 1,
        action: 'created',
        actorEmail: 'sales@company.com',
        actorName: 'สมหญิง รักงาน',
        fromStatus: '',
        toStatus: 'draft',
        createdAt: '2026-06-14T13:00:00.000Z',
      },
      {
        historyId: 'h010',
        requestId: 'req004',
        version: 1,
        action: 'submitted',
        actorEmail: 'sales@company.com',
        actorName: 'สมหญิง รักงาน',
        fromStatus: 'draft',
        toStatus: 'pending',
        createdAt: '2026-06-14T15:00:00.000Z',
      },
      {
        historyId: 'h011',
        requestId: 'req004',
        version: 1,
        action: 'rejected',
        actorEmail: 'approver@company.com',
        actorName: 'นายประยุทธ์ มั่นคง',
        fromStatus: 'pending',
        toStatus: 'rejected',
        comment: 'Margin ต่ำเกินไปสำหรับ Azure subscription ขอให้ review ราคาใหม่',
        createdAt: '2026-06-15T09:00:00.000Z',
      },
    ],
  },
]

let _requests = [...MOCK_REQUESTS]

export function getMockRequests(): Request[] {
  return [..._requests]
}

export function getMockRequestById(id: string): Request | undefined {
  return _requests.find(r => r.id === id)
}

export function saveMockRequest(req: Request): void {
  const idx = _requests.findIndex(r => r.id === req.id)
  if (idx >= 0) {
    _requests[idx] = req
  } else {
    _requests = [req, ..._requests]
  }
}

let _counter = MOCK_REQUESTS.length + 1

export function generateRequestNo(): string {
  const no = String(_counter).padStart(4, '0')
  _counter++
  return `CPT-2026-${no}`
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
