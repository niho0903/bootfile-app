# Bootfile production preview

Captured on 2026-10-20 from the local production build of Next.js 16.4.2. These files are review evidence for the rebuild, not evidence of a live launch or customer sales.

The homepage, sample, recovery pages, and paused checkout are the actual built application. Paid-order feedback and refund screens use intercepted synthetic fixtures. No real payment, refund, model, email, or publishing action occurred during these browser checks. All screenshot captures are free of the development badge.

## Main previews

| Preview | File | Evidence |
| --- | --- | --- |
| Desktop homepage hero | [homepage-hero-desktop.png](homepage-hero-desktop.png) | Actual production page, 1440 px viewport |
| Mobile homepage hero | [homepage-hero-mobile.png](homepage-hero-mobile.png) | Actual production page, 390 px viewport |
| Full desktop homepage | [homepage-desktop.png](homepage-desktop.png) | Actual production page |
| Full mobile homepage | [homepage-mobile.png](homepage-mobile.png) | Actual production page |
| Desktop sample pack | [sample-desktop.png](sample-desktop.png) | Clearly labeled fictional Juniper example |
| Mobile sample pack | [sample-mobile.png](sample-mobile.png) | Actual production sample viewer |
| Optional feedback, desktop | [feedback-reported-desktop.png](feedback-reported-desktop.png) | Synthetic private-order fixture; explicit report controls |
| Optional feedback, mobile | [feedback-reported-mobile.png](feedback-reported-mobile.png) | Synthetic private-order fixture; responsive control layout |
| Paused checkout | [intake-paused-desktop.png](intake-paused-desktop.png) | Actual server config has checkout disabled |
| Refund confirmation | [refund-confirmation-fixture.png](refund-confirmation-fixture.png) | Synthetic fixture; no provider refund request |
| Refund processing | [refund-processing-fixture.png](refund-processing-fixture.png) | Synthetic pending state, distinct from completion |
| Refund completed | [refund-completed-fixture.png](refund-completed-fixture.png) | Synthetic completed state |

Additional files show the sample social posts, reusable setup, missing/incomplete private-link recovery, and the actual downloadable illustrative Markdown pack.

## Production checks

[browser-qa-report.json](browser-qa-report.json) records **7 passing browser groups, 0 failures**, and **12 passing HTTP checks**.

- Eight public and preserved legacy routes returned HTTP 200: `/`, `/studio`, `/studio/sample`, `/studio/recover`, `/privacy`, `/terms`, `/quiz`, and `/build`.
- The real `/api/studio/config` returned `checkoutEnabled: false` and the fixed price of $49 USD. The browser could prepare a brief but could not create an order through paused checkout.
- The order, download, and feedback GET endpoints rejected missing capabilities with HTTP 401 and private no-store/no-referrer headers. The production framework adds its own entries to the `Vary` header while retaining `Authorization`.
- Desktop, mobile, and narrow-screen overflow checks passed. Keyboard tabs, copying, sample download, saved-brief restoration/expiration, and private-link recovery worked.
- Fixture refund checks required deliberate confirmation, kept pending distinct from completed, and removed pack/feedback access after the request.
- Fixture feedback checks preserved a retry key after an uncertain response, saved only explicit useful/not-useful/use/reuse reports, restored reports after reload, and kept the pack accessible when optional feedback failed.

## Claims review

The current pages describe a one-time $49 Marketing Setup for one promotion: a customer email, three social posts, a confirmed business brief, reusable ChatGPT context and next-task prompt, and a review checklist/download. The sample is explicitly fictional. Customer review is required before publication.

The pages do not claim verified demand, sales, customer totals, testimonials, guaranteed marketing results, a guaranteed turnaround, permanent model memory, or unattended operating performance. Customer-reported use and reuse are separate from downloads and page views. Live willingness to pay, quality, reuse, and operating performance still require observed evidence after launch.
