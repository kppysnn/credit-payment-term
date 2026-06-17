# Credit & Payment Term Approval System

A portable React sub-module for internal sales workflow: request creation, approval, and accounting review.

## How to run

```bash
npm install
npm run dev        # development at http://localhost:5173
npm run build      # production build → /dist
```

## Folder structure

```
src/
  app/                     App entry, router, UserContext (mock auth)
  components/
    layout/                AppShell, Sidebar, RoleSwitcher (DEV only)
    ui/                    StatusBadge, StatusTimeline, Card, Button, Modal, Alert, FormField
    modals/                ApproveModal, RejectModal
  features/credit-payment-term/
    types/                 request.ts, customer.ts, user.ts, approval.ts
    data/                  mockUsers, mockCustomers, mockRequests
    services/              creditTermService, customerService, exportService
    utils/                 calculations, formatters, permissions, status, validation
    components/            5-step form components + StickyRequestSummary
    pages/                 Dashboard, RequestList, Create, Edit, Detail
  styles/                  globals.css (Tailwind v4 + tokens), print.css
```

## Main features

| Feature | Details |
|---|---|
| Dashboard | Role-specific stats + recent request list |
| Request List | Filterable table with role-based action columns |
| Create Request | 5-step form: Info → Customer → Quotation → Payment/Credit → Summary |
| Edit / Resubmit | Same form pre-filled; keeps Request No., increments version |
| Request Detail | Full detail + approval timeline + role-based action buttons |
| Approve / Reject | Modal with required comment + confirmation checkbox |
| Accounting view | Read-only — all buttons hidden for Accounting role |
| Print / PDF | Opens browser print dialog with A4-formatted HTML |

## Mock data

4 sample requests (approved, pending, draft, rejected), 6 mock customers, 3 mock users.

Use the **DEV role switcher** (bottom-right corner) to switch between Sales, Approver, and Accounting.

## Google Sheet integration

All data access is through service functions. To connect to Google Sheets, replace the implementations in:

| File | Google Sheet Tabs |
|---|---|
| `services/creditTermService.ts` | Requests, Request_Customers, Quotation_Items, Payment_Terms, Approval_History |
| `services/customerService.ts` | Customers |

All functions are async and return the same TypeScript types — no page or component changes needed.

## Tech stack

React 19 + Vite 6 + TypeScript + Tailwind CSS v4 + React Router v7 + Lucide React
