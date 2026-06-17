# Workflow

## Status transitions

```
[New]
  │
  ▼
DRAFT ──────────────────────────────► CANCELLED
  │
  │ (Sales submits)
  ▼
PENDING ─────────────────────────────► CANCELLED
  │           │
  │ Approve   │ Reject
  ▼           ▼
APPROVED    REJECTED
              │
              │ Sales edits + resubmits
              ▼
            PENDING  (version++)
              │
              │ Approve
              ▼
            APPROVED
```

## Sales workflow

1. Navigate to Dashboard → Create New Request
2. Fill in 5-step form
3. Save Draft (can return and edit) OR Submit directly
4. After submitting: read-only until Approver acts
5. If Rejected: Edit & Resubmit button appears
6. In Edit/Resubmit form: prior rejection reason shown as reminder
7. After resubmitting: version number increments, full history preserved

## Approver workflow

1. Dashboard shows Pending count with alert
2. Request List filtered by status=pending
3. Open Request Detail → review all information
4. Click Approve → fill Approval Comment → confirm checkbox → submit
5. Click Reject → fill Reject Reason + optional Suggestion → confirm checkbox → submit
6. Decision is final; Approver cannot undo after submission

## Accounting workflow

1. Dashboard shows all requests with counts
2. Request List — searchable, filterable; no action columns
3. Request Detail — full view including financial, quotation, payment schedule, approval result
4. Print / PDF buttons available
5. No edit, approve, reject, submit, or comment capability

## Reject and resubmit detail

- Status changes Rejected → Sales can edit
- Same Request No. preserved
- Version increments (e.g. v1 → v2)
- Approval History entry added: `resubmitted`
- Previous approval result (rejection reason) remains visible in Detail page
- Accounting can see full version history
