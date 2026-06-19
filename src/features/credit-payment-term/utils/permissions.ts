import type { CurrentUser, Permission } from '../types/user'
import type { Request, RequestStatus } from '../types/request'

export function hasPermission(user: CurrentUser, permission: Permission): boolean {
  return user.permissions.includes(permission)
}

export function canCreateRequest(user: CurrentUser): boolean {
  return hasPermission(user, 'creditTerm.create')
}

export function canViewRequest(user: CurrentUser, req: Request): boolean {
  if (hasPermission(user, 'creditTerm.viewAll')) return true
  if (hasPermission(user, 'creditTerm.viewOwn') && req.salesId === user.id) return true
  return false
}

export function canEditRequest(user: CurrentUser, req: Request): boolean {
  if (user.role !== 'sales') return false
  if (req.salesId !== user.id) return false
  return req.status === 'draft' || req.status === 'rejected' || req.status === 'pending'
}

export function canSubmitRequest(user: CurrentUser, req: Request): boolean {
  if (user.role !== 'sales') return false
  if (req.salesId !== user.id) return false
  return req.status === 'draft'
}

export function canResubmitRequest(user: CurrentUser, req: Request): boolean {
  if (user.role !== 'sales') return false
  if (req.salesId !== user.id) return false
  return req.status === 'rejected'
}

export function canApproveRequest(user: CurrentUser, req: Request): boolean {
  return hasPermission(user, 'creditTerm.approve') && req.status === 'pending'
}

export function canRejectRequest(user: CurrentUser, req: Request): boolean {
  return hasPermission(user, 'creditTerm.reject') && req.status === 'pending'
}

export function canCancelRequest(user: CurrentUser, req: Request): boolean {
  if (user.role !== 'sales') return false
  if (req.salesId !== user.id) return false
  return req.status === 'draft' || req.status === 'pending'
}

export function canExport(user: CurrentUser): boolean {
  return hasPermission(user, 'creditTerm.export')
}

export function isReadOnly(user: CurrentUser, req: Request): boolean {
  if (user.role === 'accounting') return true
  if (user.role === 'approver') return true
  if (user.role === 'sales') {
    const editableStatuses: RequestStatus[] = ['draft', 'rejected', 'pending']
    return !editableStatuses.includes(req.status)
  }
  return true
}
