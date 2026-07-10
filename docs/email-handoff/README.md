# Email templates — handoff package

5 finished HTML email templates for the Credit & Payment Term module, ready to wire into the real send pipeline (Angular app + whatever mail service it uses). This package is self-contained: templates + every image file they need. Nothing here depends on this repo's React code — it's just static HTML/CSS and PNG assets.

## What's in here

```
templates/    the 5 emails, real markup, filled with example data
assets/       every image file the templates reference — copy these as-is
```

| Template | Sent when |
|---|---|
| `01-submit-confirmation-sale.html` | Sales submits or resubmits a request |
| `02-new-request-approver.html` | Approver has a new request waiting |
| `03-approved-sale.html` | Request gets approved |
| `04-rejected-sale.html` | Request gets rejected |
| `05-cancelled-sale.html` | Sales cancels a request (pending or already-approved) |

## The one thing you need to do: replace `{{APP_BASE_URL}}`

Every template references images and one link using a placeholder token, `{{APP_BASE_URL}}` — find-and-replace it (all 5 files) with wherever the real app's domain ends up being, e.g. `https://your-real-domain.com`. It appears in two kinds of places:

- **Images** — `{{APP_BASE_URL}}/email-icons/*.png` and `{{APP_BASE_URL}}/workx-logo.png`. Upload the contents of `assets/` so they land at exactly those paths on your domain (i.e. `assets/email-icons/*.png` → serve at `/email-icons/*.png`, `assets/workx-logo.png` → serve at `/workx-logo.png`). Any static host works (the app's own public folder, a CDN, S3+CloudFront, whatever) as long as the final URL is a public `https://` address — mail clients fetch these over the network, they can't read a local/relative path.
- **One link** — `{{APP_BASE_URL}}/requests/{id}` (the "ดูรายละเอียดคำขอ" button + the plain-text fallback link in the footer). Point this at the real request-detail route.

**Don't inline the images as base64 `data:` URIs** to sidestep hosting them — looks convenient, but Outlook and several corporate mail gateways strip or block inline data URIs, so the icons would silently disappear for a real chunk of recipients. Keep them as hosted PNGs; that part is already handled correctly in these templates.

## Everything else is already done

- All images are real PNGs (not SVG — Gmail strips `<svg>` tags entirely), true-color, no palette/quality issues.
- Layout is table-based with inline CSS only — works across Outlook/Gmail/Apple Mail without a CSS framework.
- Dark mode is handled via `@media (prefers-color-scheme: dark)` — already in each file's `<style>` block, no extra work needed.
- Each file is a complete, valid HTML document — open any one directly in a browser to preview it as-is.

## What NOT to bring over

This repo also contains a React app that sends these same templates through Resend for local testing/design review only (`src/features/credit-payment-term/services/emailPreviewService.ts`, `api/send-email.ts`, `docs/emails/send-test-email.ts`). That's scaffolding for this prototyping phase — it's how these 5 templates got tested and refined, not something to port. The templates in `templates/` are the actual deliverable.
