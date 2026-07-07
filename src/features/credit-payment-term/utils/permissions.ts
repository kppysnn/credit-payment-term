import type { CurrentUser, Permission } from '../types/user'
import type { Request, RequestStatus } from '../types/request'

export function hasPermission(user: CurrentUser, permission: Permission): boolean {
  return user.permissions.includes(permission)
}

export function canCreateRequest(user: CurrentUser): boolean {
  return hasPermission(user, 'creditTerm.create')
}

export function canViewRequest(user: CurrentUser, req: Request): boolean {
  // Drafts are private to their owner regardless of viewAll — a draft is the
  // sales rep's own scratch work and isn't a request yet.
  if (req.status === 'draft') return req.salesId === user.id
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
  // 'approved' is included so a request can be cancelled after the fact if
  // the customer renegotiates post-approval — sales cancels this one and
  // files a new request rather than editing an already-approved record.
  return req.status === 'draft' || req.status === 'pending' || req.status === 'approved'
}

// Deliberately narrower than canCancelRequest: cancelling a pending request
// keeps a full audit trail (it's a real decision on a real submission), but
// a draft has never been submitted and carries no history worth preserving
// — so a draft can be hard-deleted outright, while "cancel" is the only
// option once a request has actually entered the approval flow.
export function canDeleteRequest(user: CurrentUser, req: Request): boolean {
  if (user.role !== 'sales') return false
  if (req.salesId !== user.id) return false
  return req.status === 'draft'
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
