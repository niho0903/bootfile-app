# Brand & AI Kit implementation checkpoint

Owner-approved direction: quiz-led brand definition and portable AI instructions, preserving the original quiz and $49 one-time target. Source baseline is design brief commit 5cdbb9d, based on unmerged application PR #2.

## Implemented in this isolated prototype

- New /brand experience and preview-branch root redirect. No production branch or live domain change.
- The original eight-question QUESTIONS and calculateResult are imported without changing wording, scores, taxonomy or snapshot tests.
- Five chapters cover private working preferences, business facts, voice, visual direction and one campaign. Existing palettes/fonts can be preserved.
- Live previews, exact contrast calculations, editable backbrief and explicit approval. Edits invalidate export approval; stored drafts never restore approval.
- Separate versioned brand-foundation-preview-v1 contract, independent from paid marketing-setup-v1 orders.
- Public Markdown/JSON, private optional AI instructions, a bounded Canva voice summary, three caption/SVG/PNG drafts, and a browser print/save-PDF guide. Private working preferences are excluded from public artifacts.
- A fictional example and clear prelaunch/template labeling. No new provider calls, backend writes, checkout, model synthesis, or native tool integrations.
- /brand added to middleware private headers and telemetry exclusion. User text is React-escaped; SVG text is XML-escaped; colors are validated hex values.
- Unit and production-browser verification added. Test artifacts contain only synthetic/fictional business data.

## Verification state

Tests and hosted preview checks must be recorded from their actual source-specific run after this commit is pushed. A committed test is not a passed test. The browser suite exercises the real built application locally in GitHub CI, not an authenticated Vercel preview. No customer data or provider credentials are used.

## Remaining before charging for this offer

This is a testable product prototype, not a finished paid synthesis service. The campaign is assembled from deterministic templates; positioning and voice are guided choices, not researched brand strategy. Before sale, connect bounded model synthesis and version-aware paid fulfillment, verify factual/quality validation and recovery, update customer terms and growth messaging, prove destination handoffs in actual supported accounts, and complete the existing hosted provider/scheduler/support gates. Preserve old orders and recovery.

No existing production switches or price amounts have been changed. No advertising spend, subscription, promotional outreach, public post or irreversible data action is authorized by this checkpoint.

## Rollback

Keep this as a stacked draft release against rebuild/task-studio-20261020. Reverting the prototype commit restores the prior preview; production master is untouched. Do not merge or enable commerce to work around a failed check.

## Test-tool sources

Playwright 1.63.0 is pinned for isolated CI-only browser verification, based on Microsoft's release listing checked October 21, 2026. It is installed outside the application dependency tree. Official browser installation guidance: https://playwright.dev/docs/browsers . Contrast checks use https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html . Canva's 500-character voice limit is documented at https://www.canva.com/help/brand-voice/ .
