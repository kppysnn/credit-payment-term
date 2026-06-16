import { z } from 'zod'

export const step1Schema = z.object({
  proposalNo: z.string().min(1, 'กรุณาระบุ Proposal No.'),
  quotationNo: z.string().optional(),
  projectName: z.string().min(1, 'กรุณาระบุชื่อโปรเจกต์'),
  saleType: z.enum(['hardware', 'software_installation', 'mixed']).refine(v => !!v, { message: 'กรุณาเลือกประเภทการขาย' }),
  requestPurpose: z.string().min(10, 'กรุณาระบุวัตถุประสงค์อย่างน้อย 10 ตัวอักษร'),
  remark: z.string().optional(),
})

export const newCustomerSchema = z.object({
  companyName: z.string().min(1, 'กรุณาระบุชื่อบริษัท'),
  taxId: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email('รูปแบบ email ไม่ถูกต้อง').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  remark: z.string().optional(),
  creditTermReason: z.string().optional(),
})

export const existingCustomerSchema = z.object({
  customerId: z.string().min(1, 'กรุณาเลือกลูกค้า'),
})

export const resellerSchema = z.object({
  resellerCompanyName: z.string().min(1, 'กรุณาระบุชื่อ Reseller'),
  endCustomerCompanyName: z.string().min(1, 'กรุณาระบุชื่อ End Customer'),
  billingTo: z.enum(['reseller', 'end_customer']).refine(v => !!v, { message: 'กรุณาเลือก Billing To' }),
  creditTermAppliesTo: z.enum(['reseller', 'end_customer']).refine(v => !!v, { message: 'กรุณาเลือก Credit Term Applies To' }),
  resellerContactPerson: z.string().optional(),
  resellerEmail: z.string().email().optional().or(z.literal('')),
  resellerPhone: z.string().optional(),
  endCustomerContactPerson: z.string().optional(),
  endCustomerEmail: z.string().email().optional().or(z.literal('')),
  endCustomerPhone: z.string().optional(),
})

const quotationItemSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อสินค้า'),
  description: z.string().optional(),
  sellingPrice: z.number().positive('ราคาขายต้องมากกว่า 0'),
  cost: z.number().nonnegative('ราคาต้นทุนต้องไม่ติดลบ'),
  remark: z.string().optional(),
})

export const step3Schema = z.object({
  hardwareItems: z.array(quotationItemSchema).optional(),
  softwareName: z.string().optional(),
  softwareSellingPrice: z.number().optional(),
  softwareCost: z.number().optional(),
  installationDescription: z.string().optional(),
  installationSellingPrice: z.number().optional(),
  installationCost: z.number().optional(),
})

const installmentSchema = z.object({
  installmentPercent: z
    .number()
    .positive('เปอร์เซ็นต์ต้องมากกว่า 0')
    .max(100, 'เปอร์เซ็นต์ต้องไม่เกิน 100'),
  creditTermDays: z
    .number()
    .int('จำนวนวันต้องเป็นจำนวนเต็ม')
    .nonnegative('จำนวนวันต้องไม่ติดลบ'),
  paymentCondition: z.enum([
    'before_delivery', 'on_po', 'on_delivery',
    'on_installation', 'on_acceptance', 'monthly', 'other',
  ]).refine(v => !!v, { message: 'กรุณาเลือกเงื่อนไขการชำระ' }),
  creditTermReason: z.string().min(1, 'กรุณาระบุเหตุผล Credit Term'),
  remark: z.string().optional(),
})

export const step4Schema = z.object({
  installmentCount: z
    .number()
    .int()
    .min(1, 'จำนวนงวดต้องอย่างน้อย 1 งวด')
    .max(4, 'จำนวนงวดต้องไม่เกิน 4 งวด'),
  paymentTermReason: z.string().min(1, 'กรุณาระบุเหตุผลการขอเงื่อนไขการชำระ'),
  overallCreditTermReason: z.string().optional(),
  installments: z.array(installmentSchema),
})

export type Step1Values = z.infer<typeof step1Schema>
export type Step4Values = z.infer<typeof step4Schema>
