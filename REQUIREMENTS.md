# Requirements

## Functional requirements

### Request form (5 steps)

**Step 1 — Request Information**
- Auto-fill: Request No. (generated), Request Date, Sales Owner, Sales Email
- Required: Proposal No., Project Name, Sale Type, Request Purpose (min 10 chars)
- Optional: Quotation No., Remark

**Step 2 — Customer Information**
- Customer Type: New Customer / Existing Customer / Reseller (required)
- New Customer: Company Name (required), Tax ID, contacts, credit term reason
- Existing Customer: Search + auto-fill from customer master; contacts editable
- Reseller: Reseller info, End Customer info, Billing To (required), Credit Term Applies To (required)

**Step 3 — Quotation Information**
- Hardware section: shown when Sale Type is Hardware or Mixed. Multiple rows supported. Each row: Product Name (req), Selling Price (req), Cost, auto-calculated GP and Margin.
- Software section: shown when Sale Type is Software & Installation or Mixed.
- Installation section: shown when Software is visible.
- Auto-calculate: Gross Profit = Selling – Cost. Margin % = GP / Selling × 100.
- Financial summary card updates live.

**Step 4 — Payment & Credit Term**
- Installment Count: 1–4 (required)
- Per installment: % (req), Credit Term Days (req, 0 = COD), Payment Condition (req), Credit Term Reason (req)
- Auto-calculate: Installment Amount = Total Selling × %
- Validation: total % must = 100%
- Warning: New Customer with Credit Term > 0 days

**Step 5 — Summary & Submit**
- Read-only summary of all steps
- Confirmation checkbox (Thai text)
- Buttons: Save Draft (no checkbox required) / Submit / Resubmit (if rejected)
- Shows prior rejection reason when resubmitting

### Calculation rules

```
Gross Profit = Selling Price - Cost
Margin % = Gross Profit / Selling Price × 100
Total Selling = Σ all item selling prices
Total Cost = Σ all item costs
Total Gross Profit = Total Selling - Total Cost
Total Margin % = Total Gross Profit / Total Selling × 100
Installment Amount = Total Selling × Installment % / 100
Max Credit Term = MAX(credit term days across all installments)
```

### Workflow rules

- Only Sales with `creditTerm.create` can create requests
- Sales can only edit their own requests in Draft or Rejected status
- Resubmitting a Rejected request increments version, keeps Request No., logs action
- Approver can only approve/reject Pending requests
- Approved = workflow end (read-only forever)
- Accounting = always read-only

### Role-based UI rules

| Action | Sales (own) | Approver | Accounting |
|---|---|---|---|
| Create | Yes | No | No |
| Edit Draft | Yes | No | No |
| Submit Draft | Yes | No | No |
| View own | Yes | No | — |
| View all | No | Yes | Yes |
| Approve | No | Pending only | No |
| Reject | No | Pending only | No |
| Resubmit | Rejected only | No | No |
| Cancel | Draft/Pending own | No | No |
| Print / PDF | Yes | Yes | Yes |
| Approve button visible | No | Yes | No |
| Reject button visible | No | Yes | No |
| Edit button visible | Draft/Rejected | No | No |
| Comment box | No | In modal | No |

### Export requirements

- Print A4: opens browser print dialog with print-friendly HTML (no nav/sidebar)
- PDF: same HTML with `@media print` + A4 `@page` rules
- Must include: Request header, Customer info, Quotation summary table, Payment schedule table, Approval result
