# Data Model

## TypeScript types (src/features/credit-payment-term/types/)

### Request (`request.ts`)

| Field | Type | Description |
|---|---|---|
| id | string | UUID |
| requestNo | string | CPT-YYYY-NNNN |
| version | number | Increments on resubmission |
| salesId / salesName / salesEmail | string | Filled from currentUser |
| proposalNo | string | Required |
| quotationNo | string | Optional |
| projectName | string | Required |
| saleType | 'hardware' \| 'software_installation' \| 'mixed' | |
| requestPurpose | string | Why this credit/payment term is needed |
| customerInfo | RequestCustomerInfo | Discriminated union |
| quotationItems | QuotationItem[] | Line items |
| installmentCount | number | 1–4 |
| installments | PaymentInstallment[] | One per installment |
| financial | FinancialSummary | Calculated totals |
| status | RequestStatus | |
| approvalResult | ApprovalResult? | Set after approval/rejection |
| history | ApprovalHistoryEntry[] | Append-only audit log |

### Customer (`customer.ts`)

New / Existing / Reseller each have their own data shape, combined as a discriminated union `RequestCustomerInfo`.

### ApprovalHistoryEntry (`approval.ts`)

| Field | Type |
|---|---|
| historyId | string |
| requestId | string |
| version | number |
| action | ApprovalAction enum |
| actorEmail / actorName | string |
| fromStatus / toStatus | string |
| comment | string? |
| createdAt | ISO datetime |

## Google Sheet column mapping

### Requests tab
`request_id, request_no, version, created_at, updated_at, sales_email, sales_name, sales_id, proposal_no, quotation_no, project_name, sale_type, request_purpose, remark, customer_type, status, total_selling, total_cost, gross_profit, margin_percent, max_credit_term, installment_count, payment_term_reason, credit_term_reason, approver_email, approver_name, approved_at, rejected_at, decision_comment, suggestion`

### Customers tab
`customer_id, company_name, tax_id, default_credit_term, contact_person, contact_email, contact_phone, status`

### Request_Customers tab
`request_id, customer_type, company_name, tax_id, contact_person, contact_email, contact_phone, reseller_company, reseller_contact_person, reseller_email, reseller_phone, end_customer_company, end_customer_contact_person, end_customer_email, end_customer_phone, billing_to, credit_term_applies_to`

### Quotation_Items tab
`item_id, request_id, item_type (hardware|software|installation), item_name, description, selling_price, cost, gross_profit, margin_percent, remark`

### Payment_Terms tab
`payment_id, request_id, installment_no, installment_percent, installment_amount, credit_term_days, payment_condition, credit_term_reason, remark`

### Approval_History tab
`history_id, request_id, version, action, actor_email, actor_name, from_status, to_status, comment, created_at`
