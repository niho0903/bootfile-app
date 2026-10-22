# Growth service migration

Prepared 2026-10-20 against connected repository `niho0903/bootfile-growth-agent`, `master` ref `f92b48de0da38522ff80bc7728e90f92454ad7d7`. The isolated working copy is on `rebuild/studio-operations-20261020`. No live Railway settings or publication were changed during preparation.

## Concrete changes

- Replace the legacy profile/archetype prompts with the $49 one-time Marketing Setup contract.
- Remove `src/git.ts`, GitHub push capability, and unused Git/model SDK dependencies.
- Persist canonical **pending** content in the app's existing `content_drafts` table through a scoped, authenticated endpoint.
- Check a deterministic draft key before generation. A database/ingress failure stops the task instead of manufacturing a successful draft.
- Remove startup content bursts, unbounded research recursion, and fail-open model editorial decisions.
- Generate bounded drafts with explicit model timeouts/token ceilings. Defaults: two blog drafts and two caption drafts weekly, plus one internal research note.
- Keep content generation, the paid-operations heartbeat, and the owned-blog trigger disabled until explicitly configured.
- Add an optional Railway trigger for `/api/operations/run` every five minutes, using a separately configured credential and refusing redirects.
- Add a separate owned-blog trigger; the application owns independent review, exact approval hashes, fixed source/product gates, durable weekly review/publication caps, and limited public writes.
- Emit structured logs to the provider's stdout collection rather than accumulating local filesystem logs.
- Add deterministic boundary tests and a read-only CI workflow.

The working copy contains the complete proposed service. `patches/growth-agent-studio.patch` carries its source, dependency, test, and workflow changes. The patch omits the previous `.env.example` context; use the working copy's new empty configuration template or the variable table in its README. Runtime credential values must not be included in a repository patch.

## App-side contract

`GET /api/operations/drafts?channel=blog&jobKey=blog:YYYY-MM-DD` checks whether a draft exists. `POST /api/operations/drafts` accepts `{productVersion, channel, jobKey, content, metadata}`. Both require `GROWTH_AGENT_SECRET`, distinct from the admin and routine cron credentials.

`productVersion` is `studio-marketing-v1`. The app derives a stable ID from version/channel/job key, forces `status=pending`, allowlists metadata, and sets `reviewRequired=true` and `publicationAuthority=draft-only`. A duplicate insert cannot overwrite approval or a previously saved body. The response confirms persistence, not publication.

The ingress flags stale quiz links, old prices, and unsupported guarantees for review. These deterministic flags are only a basic validation layer. They are not an independent factual verification process or an authorization to publish.

The service sends the configured application origin on its authenticated server POST. The endpoint requires the dedicated bearer secret; an Origin header is not authorization. Content cannot select a credential destination. HTTPS is required and redirects are rejected.

## Optional scheduler configuration

Use Railway when the verified hosting plan cannot support the required native cadence. Configure these new values through the authorized provider surfaces:

| Railway setting | Matching application setting |
| --- | --- |
| `BOOTFILE_OPERATIONS_URL=https://bootfile.ai/api/operations/run` | Verified production deployment route |
| `BOOTFILE_CRON_SECRET` | The newly configured `CRON_SECRET` value |
| `OPERATIONS_SCHEDULER_ENABLED=true` | Routine app scheduler enabled and migrations applied |
| `BOOTFILE_APP_URL=https://bootfile.ai` | Verified application origin |
| `GROWTH_AGENT_SECRET` | Matching new dedicated ingress credential |
| `GROWTH_DRAFTS_ENABLED=true` | Verified pending-draft ingress |
| `BOOTFILE_PUBLISHER_URL=https://bootfile.ai/api/operations/publish` | Verified narrow publisher endpoint |
| `GROWTH_PUBLISHER_SECRET` | Matching distinct publisher secret; never reuse draft/admin/cron credentials |
| `GROWTH_PUBLISHER_ENABLED=true` | App review/publication flags separately configured |
| `PUBLISHER_CRON=15 */6 * * *` | At most two review claims and two publication events per rolling seven days enforced by the database |

Set only the capabilities that are ready. An enabled flag with a missing endpoint/credential fails startup; default flags trigger no paid provider work. Existing `BLOG_CRON`, `INSTAGRAM_CRON`, and `RESEARCH_CRON` variables override the new defaults and must be reviewed during activation.

Neither migration nor activation requires reading secret values from an unrelated platform. The Vercel team's missing connector grant remains a real access blocker until the appropriate connection is granted scope. A Railway scheduler can provide cadence after the app is deployed and correctly configured; it cannot repair missing application deployment access.

## Implemented publication after validation

The independent owned-blog path is implemented in `lib/operations/publishing.ts`, `publishing-policy.ts`, and `POST /api/operations/publish`. Its separate migration is `supabase/migrations/20261020194835_operations_publishing_v1.sql`; its guarded, rollback-only verification file is `supabase/tests/operations_publishing_smoke.sql`.

The author’s ingress remains draft-only. The publisher route accepts no caller-provided article or approval. It claims a private review record, verifies the exact current Studio source URL, rejects unsafe Markdown and stale/unsupported claims, and calls a fresh application-side reviewer with no author history or action tools. The reviewer checks all public fields against the fixed $49 product facts, verified source excerpt, and recent articles. All mandatory checks must pass; an uncertain or unavailable check cannot approve.

The database stores the exact raw-draft hash, the normalized article/hash, policy version, reviewer result/model, and outcome. Source changes, article changes, existing slugs, expired approvals, or cap exhaustion prevent publication. There are at most two review claims and two publication events per rolling seven days; failures count toward the review cap and withdrawals do not reset the publication cap. Approved work can recover without another model call. Public rows and publication audit are committed in the same transaction.

Keep `GROWTH_REVIEW_ENABLED=false` and `GROWTH_PUBLICATION_ENABLED=false` by default. Validation may enable review while keeping public writes disabled. Enable routine publication only after the release gates pass. This gives agents normal owned-site publication authority under the operating charter without making Nick a daily draft reviewer. Ordinary editorial rejections stay unpublished. Agents investigate provider, source, or concurrency exceptions; product/policy/security/spending changes retain owner judgment.

`PATCH /api/operations/publish` with the admin credential accepts an exact publication ID and `action: withdraw`. It removes only the unchanged owned article this pipeline published, preserves the private body/audit, and refuses another editor’s changed work. The growth publisher credential cannot withdraw. No endpoint publishes social posts, sends promotional messages, changes a price, or spends on distribution.

## Release verification

Record the actual growth source SHA and Railway deployment ID, the app deployment SHA, enabled capabilities, the first pending draft ID, and two unattended paid-operation rows. Confirm the service cannot push to GitHub or publish social posts, the author cannot authorize a public write, and the limited owned-blog trigger cannot supply its own approval. Verify a private review before a controlled publication/withdrawal check. Review and remove obsolete write credentials after the new version is verified.

The service tests cover disabled defaults, credential URL constraints, stable cadence keys, redirect refusal/dedicated credential use, trigger-only publication calls, and an unavailable draft ledger. App tests cover credential separation, streaming upload limits, forced review metadata, unavailable measurements, whole-run dispatch guards, safe Markdown/link gates, exact review hashes, weekly review-cap behavior, and refusal to publish when review persistence is rejected. SQL smoke assertions cover private grants, exact aggregates, leases, changed approval inputs, duplicate/capped publication, and precise withdrawal.

To pause, disable the affected service capability. A rollback to the old service can restore its direct publishing path, so rollback should normally retain disabled generation and revoked write authority while the repair is prepared.
