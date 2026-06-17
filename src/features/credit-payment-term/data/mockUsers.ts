import type { CurrentUser, UserRole } from '../types/user'
import { ROLE_PERMISSIONS } from '../types/user'

export const MOCK_USERS: CurrentUser[] = [
  {
    id: 'u001',
    name: 'สมหญิง รักงาน',
    email: 'sales@company.com',
    role: 'sales',
    permissions: ROLE_PERMISSIONS.sales,
  },
  {
    id: 'u002',
    name: 'วิชัย สุขสบาย',
    email: 'sales2@company.com',
    role: 'sales',
    permissions: ROLE_PERMISSIONS.sales,
  },
  {
    id: 'u003',
    name: 'นายประยุทธ์ มั่นคง',
    email: 'approver@company.com',
    role: 'approver',
    permissions: ROLE_PERMISSIONS.approver,
  },
  {
    id: 'u004',
    name: 'สุดา บัญชีดี',
    email: 'accounting@company.com',
    role: 'accounting',
    permissions: ROLE_PERMISSIONS.accounting,
  },
]

export function getMockUser(role: UserRole): CurrentUser {
  return MOCK_USERS.find(u => u.role === role) ?? MOCK_USERS[0]
}
