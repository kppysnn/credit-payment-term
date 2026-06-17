export type UserRole = 'sales' | 'approver' | 'accounting'

export type Permission =
  | 'creditTerm.create'
  | 'creditTerm.viewOwn'
  | 'creditTerm.viewAll'
  | 'creditTerm.approve'
  | 'creditTerm.reject'
  | 'creditTerm.export'
  | 'creditTerm.cancel'

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: UserRole
  permissions: Permission[]
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  sales: [
    'creditTerm.create',
    'creditTerm.viewOwn',
    'creditTerm.export',
    'creditTerm.cancel',
  ],
  approver: [
    'creditTerm.viewAll',
    'creditTerm.approve',
    'creditTerm.reject',
    'creditTerm.export',
  ],
  accounting: [
    'creditTerm.viewAll',
    'creditTerm.export',
  ],
}

export const ROLE_LABELS: Record<UserRole, string> = {
  sales: 'Sales',
  approver: 'Approver',
  accounting: 'Accounting',
}
