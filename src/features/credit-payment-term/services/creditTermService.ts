/**
 * Credit Term Service
 * Mock layer — replace with Google Sheet / portal API when ready.
 *
 * Google Sheet tabs targeted:
 *   Requests | Customers | Request_Customers | Quotation_Items | Payment_Terms | Approval_History
 */
import type { Request, RequestStatus, RequestListItem } from '../types/request'
import type { ApprovalHistoryEntry } from '../types/approval'
import {
  getMockRequests,
  getMockRequestById,
  saveMockRequest,
  generateRequestNo,
  generateId,
} from '../data/mockRequests'
import type { CurrentUser } from '../types/user'

function _delay(ms = 150): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function _toListItem(req: Request): RequestListItem {
  const customerName =
    req.customerInfo.type === 'existing'
      ? req.customerInfo.data.companyName
      : req.customerInfo.type === 'new'
        ? req.customerInfo.data.companyName
        : req.customerInfo.data.resellerCompanyName
  return {
    id: req.id,
    requestNo: req.requestNo,
    proposalNo: req.proposalNo,
    projectName: req.projectName || req.proposalNo,
    customerName,
    customerType: req.customerInfo.type,
    saleType: req.saleType,
    totalSelling: req.financial.totalSelling,
    totalCost: req.financial.totalCost,
    grossProfit: req.financial.grossProfit,
    marginPercent: req.financial.marginPercent,
    maxCreditTerm: req.financial.maxCreditTerm,
    installmentCount: req.installmentCount,
    status: req.status,
    salesName: req.salesName,
    approverName: req.approvalResult?.approverName,
    updatedAt: req.updatedAt,
    version: req.version,
  }
}

export async function getRequests(userId?: string, viewAll?: boolean): Promise<RequestListItem[]> {
  await _delay()
  const all = getMockRequests()
  const filtered = viewAll ? all : all.filter(r => r.salesId === userId)
  return filtered.map(_toListItem)
}

export async function getRequestById(id: string): Promise<Request | undefined> {
  await _delay()
  return getMockRequestById(id)
}

export async function createRequest(data: Omit<Request, 'id' | 'requestNo' | 'createdAt' | 'updatedAt' | 'history'>): Promise<Request> {
  await _delay()
  const now = new Date().toISOString()
  const req: Request = {
    ...data,
    id: generateId('req'),
    requestNo: generateRequestNo(),
    createdAt: now,
    updatedAt: now,
    history: [
      {
        historyId: generateId('h'),
        requestId: '',
        version: 1,
        action: 'created',
        actorEmail: data.salesEmail,
        actorName: data.salesName,
        fromStatus: '',
        toStatus: data.status,
        createdAt: now,
      },
    ],
  }
  req.history[0].requestId = req.id
  saveMockRequest(req)
  return req
}

export async function updateRequest(id: string, data: Partial<Request>, actor: CurrentUser): Promise<Request> {
  await _delay()
  const existing = getMockRequestById(id)
  if (!existing) throw new Error('Request not found')
  const now = new Date().toISOString()
  const entry: ApprovalHistoryEntry = {
    historyId: generateId('h'),
    requestId: id,
    version: existing.version,
    action: 'edited',
    actorEmail: actor.email,
    actorName: actor.name,
    fromStatus: existing.status,
    toStatus: data.status ?? existing.status,
    createdAt: now,
  }
  const updated: Request = {
    ...existing,
    ...data,
    updatedAt: now,
    history: [...existing.history, entry],
  }
  saveMockRequest(updated)
  return updated
}

export async function saveDraft(id: string, data: Partial<Request>, actor: CurrentUser): Promise<Request> {
  await _delay()
  const existing = getMockRequestById(id)
  if (!existing) throw new Error('Request not found')
  const now = new Date().toISOString()
  const entry: ApprovalHistoryEntry = {
    historyId: generateId('h'),
    requestId: id,
    version: existing.version,
    action: 'draft_saved',
    actorEmail: actor.email,
    actorName: actor.name,
    fromStatus: existing.status,
    toStatus: 'draft',
    createdAt: now,
  }
  const updated: Request = {
    ...existing,
    ...data,
    status: 'draft',
    updatedAt: now,
    history: [...existing.history, entry],
  }
  saveMockRequest(updated)
  return updated
}

export async function submitRequest(id: string, actor: CurrentUser): Promise<Request> {
  await _delay()
  const existing = getMockRequestById(id)
  if (!existing) throw new Error('Request not found')
  if (existing.status !== 'draft') throw new Error('Only draft requests can be submitted')
  const now = new Date().toISOString()
  const entry: ApprovalHistoryEntry = {
    historyId: generateId('h'),
    requestId: id,
    version: existing.version,
    action: 'submitted',
    actorEmail: actor.email,
    actorName: actor.name,
    fromStatus: 'draft',
    toStatus: 'pending',
    createdAt: now,
  }
  const updated: Request = { ...existing, status: 'pending', updatedAt: now, history: [...existing.history, entry] }
  saveMockRequest(updated)
  return updated
}

export async function resubmitRequest(id: string, data: Partial<Request>, actor: CurrentUser): Promise<Request> {
  await _delay()
  const existing = getMockRequestById(id)
  if (!existing) throw new Error('Request not found')
  if (existing.status !== 'rejected') throw new Error('Only rejected requests can be resubmitted')
  const now = new Date().toISOString()
  const newVersion = existing.version + 1
  const entry: ApprovalHistoryEntry = {
    historyId: generateId('h'),
    requestId: id,
    version: newVersion,
    action: 'resubmitted',
    actorEmail: actor.email,
    actorName: actor.name,
    fromStatus: 'rejected',
    toStatus: 'pending',
    createdAt: now,
  }
  const updated: Request = {
    ...existing,
    ...data,
    status: 'pending',
    version: newVersion,
    updatedAt: now,
    history: [...existing.history, entry],
  }
  saveMockRequest(updated)
  return updated
}

export async function updatePendingRequest(id: string, data: Partial<Request>, actor: CurrentUser): Promise<Request> {
  await _delay()
  const existing = getMockRequestById(id)
  if (!existing) throw new Error('Request not found')
  if (existing.status !== 'pending') throw new Error('Only pending requests can be updated this way')
  const now = new Date().toISOString()
  const newVersion = existing.version + 1
  const entry: ApprovalHistoryEntry = {
    historyId: generateId('h'),
    requestId: id,
    version: newVersion,
    action: 'edited',
    actorEmail: actor.email,
    actorName: actor.name,
    fromStatus: 'pending',
    toStatus: 'pending',
    createdAt: now,
  }
  const updated: Request = {
    ...existing,
    ...data,
    status: 'pending',
    version: newVersion,
    updatedAt: now,
    history: [...existing.history, entry],
  }
  saveMockRequest(updated)
  return updated
}

export async function approveRequest(id: string, comment: string, actor: CurrentUser): Promise<Request> {
  await _delay()
  const existing = getMockRequestById(id)
  if (!existing) throw new Error('Request not found')
  if (existing.status !== 'pending') throw new Error('Only pending requests can be approved')
  const now = new Date().toISOString()
  const entry: ApprovalHistoryEntry = {
    historyId: generateId('h'),
    requestId: id,
    version: existing.version,
    action: 'approved',
    actorEmail: actor.email,
    actorName: actor.name,
    fromStatus: 'pending',
    toStatus: 'approved',
    comment,
    createdAt: now,
  }
  const updated: Request = {
    ...existing,
    status: 'approved',
    updatedAt: now,
    approvalResult: {
      approverEmail: actor.email,
      approverName: actor.name,
      approvedAt: now,
      decisionComment: comment,
    },
    history: [...existing.history, entry],
  }
  saveMockRequest(updated)
  return updated
}

export async function rejectRequest(
  id: string,
  reason: string,
  suggestion: string,
  actor: CurrentUser,
): Promise<Request> {
  await _delay()
  const existing = getMockRequestById(id)
  if (!existing) throw new Error('Request not found')
  if (existing.status !== 'pending') throw new Error('Only pending requests can be rejected')
  const now = new Date().toISOString()
  const entry: ApprovalHistoryEntry = {
    historyId: generateId('h'),
    requestId: id,
    version: existing.version,
    action: 'rejected',
    actorEmail: actor.email,
    actorName: actor.name,
    fromStatus: 'pending',
    toStatus: 'rejected',
    comment: reason,
    createdAt: now,
  }
  const updated: Request = {
    ...existing,
    status: 'rejected',
    updatedAt: now,
    approvalResult: {
      approverEmail: actor.email,
      approverName: actor.name,
      rejectedAt: now,
      decisionComment: reason,
      suggestion,
    },
    history: [...existing.history, entry],
  }
  saveMockRequest(updated)
  return updated
}

export async function cancelRequest(id: string, actor: CurrentUser): Promise<Request> {
  await _delay()
  const existing = getMockRequestById(id)
  if (!existing) throw new Error('Request not found')
  const cancelable: RequestStatus[] = ['draft', 'pending']
  if (!cancelable.includes(existing.status)) throw new Error('Cannot cancel this request')
  const now = new Date().toISOString()
  const entry: ApprovalHistoryEntry = {
    historyId: generateId('h'),
    requestId: id,
    version: existing.version,
    action: 'cancelled',
    actorEmail: actor.email,
    actorName: actor.name,
    fromStatus: existing.status,
    toStatus: 'cancelled',
    createdAt: now,
  }
  const updated: Request = { ...existing, status: 'cancelled', updatedAt: now, history: [...existing.history, entry] }
  saveMockRequest(updated)
  return updated
}
