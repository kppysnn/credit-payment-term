# Project Context

## Overview

Credit & Payment Term Approval System is an internal workflow sub-module. Sales create quotation-linked approval requests, Approvers review and decide, Accounting monitors read-only.

## Business background

The company sells Hardware, Software & Installation, and mixed deals. Customers often request special payment conditions (installments, extended credit terms). These requests were previously handled informally via LINE or email with no audit trail. This module replaces that with a structured, auditable workflow.

## Main goal

Provide a single source of truth for:
- Who requested what credit/payment terms for which customer and proposal
- What the financial details (selling price, cost, GP, margin) are
- What the approved payment schedule looks like
- Who approved or rejected, when, and why

## Scope

**In scope:** Dashboard, Request List, Create/Edit form, Request Detail, Approve/Reject, Resubmission, Accounting read-only view, A4 print, PDF export, Mock Google Sheet service layer.

**Out of scope:** Standalone login, file attachments, multi-level approval, accounting confirmation workflow, admin user management, complex reporting, SQL database, ERP integration.

## Actors and permissions

| Role | Create | View Own | View All | Approve | Reject | Export | Cancel |
|---|---|---|---|---|---|---|---|
| Sales | Yes | Yes | No | No | No | Yes | Own only |
| Approver | No | No | Yes | Yes (Pending) | Yes (Pending) | Yes | No |
| Accounting | No | No | Yes | No | No | Yes | No |

## Workflow

1. Sales creates request → Draft
2. Sales submits → Pending Approval
3. Approver approves → Approved (workflow ends)
4. Approver rejects → Rejected
5. Sales edits rejected request → resubmits → Pending Approval (version incremented)
6. Accounting views all requests read-only at any point

## Statuses

| Status | Thai | Editable by Sales |
|---|---|---|
| draft | แบบร่าง | Yes |
| pending | รออนุมัติ | No |
| approved | อนุมัติแล้ว | No |
| rejected | ไม่อนุมัติ | Yes (resubmit) |
| revised | แก้ไขและส่งใหม่ | No |
| cancelled | ยกเลิก | No |

## Google Sheet storage concept

Each logical entity maps to one Google Sheet tab:
- **Requests** — header data for each request
- **Customers** — customer master (loaded for Existing Customer selection)
- **Request_Customers** — customer details per request
- **Quotation_Items** — line items (hardware/software/installation)
- **Payment_Terms** — installment schedule
- **Approval_History** — audit log of every action

The service layer (`creditTermService.ts`, `customerService.ts`) abstracts all data access so switching from mock to Google Sheets only requires replacing the function implementations.
