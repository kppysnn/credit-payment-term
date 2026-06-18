export type CustomerType = 'new' | 'existing' | 'reseller'

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  new: 'ลูกค้าใหม่',
  existing: 'ลูกค้าเก่า',
  reseller: 'Reseller',
}

export interface Customer {
  id: string
  companyName: string
  taxId?: string
  defaultCreditTerm?: number
  contactPerson?: string
  contactEmail?: string
  contactPhone?: string
  status: 'active' | 'inactive'
}

export interface NewCustomerInfo {
  companyName: string
  taxId?: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
}

export interface ExistingCustomerInfo {
  customerId: string
  companyName: string
  taxId?: string
  defaultCreditTerm?: number
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
}

export interface ResellerInfo {
  resellerId: string
  resellerCompanyName: string
  defaultCreditTerm?: number
  endCustomerCompanyName: string
  endCustomerContactPerson?: string
  endCustomerPhone?: string
  billingTo?: 'reseller' | 'endCustomer'
  creditTermAppliesTo?: 'reseller' | 'endCustomer'
}

export type RequestCustomerInfo =
  | { type: 'new'; data: NewCustomerInfo }
  | { type: 'existing'; data: ExistingCustomerInfo }
  | { type: 'reseller'; data: ResellerInfo }
