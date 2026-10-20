# Bootfile Studio release status

Evidence recorded on 2026-10-20. This document separates verified implementation and database work from production activation. Update the pending entries with observed results before describing the rebuilt business as live.

## Current position

The rebuilt offer is a **$49 one-time Marketing Setup** for a solo service-business owner preparing one promotion: a customer email, three coordinated social posts, a saved business brief, reusable AI context/task instructions, and a review checklist. It is a product hypothesis ready for a controlled launch, not demonstrated demand or revenue.

The application and separate operating service are implemented and have passed substantial local verification. All six database migrations are applied, and all five guarded rollback smoke suites passed. The publisher’s initial legacy-status compatibility failure was fixed through a separate corrective migration and a successful full smoke rerun. Hosting access, release persistence, deployed provider checks, and unattended execution evidence are not yet complete.

**No live Studio payment, refund, model generation, transactional email, or blog publication was performed during this rebuild. No revenue or 99% unattended-operation result has been demonstrated.**

## Completed verification

These are the final completed results reported by the release agents, including the repeat test suite and production build after the status-compatibility correction and sitemap-refresh change.

| Verification | Observed result | Scope |
| --- | --- | --- |
| Application test suite | Final repeat passed: 169 tests across 15 files | Automated behavior and failure boundaries; provider interactions use test doubles |
| Production build | Final repeat passed on Next.js 16.4.2; 75 pages/routes generated | Includes the sitemap refresh; local production build, not a hosted deployment |
| Application lint | 0 errors; 6 existing legacy warnings | Repository lint pass |
| Product HTTP QA | 12 passing checks | Local production server, including paused checkout and capability-protected endpoints |
| Product browser QA | 7 passing groups; 0 failures | Responsive layouts, keyboard/copy/download/recovery flows, and explicit feedback/refund fixtures |
| Focused operations verification | 18 tests passed; scoped ESLint clean | Auth, run dispatch, streaming draft limits, measurement honesty, and independent publication boundaries |
| Growth service | Build passed; 6 tests passed | Disabled defaults, exact credential destinations, dedupe keys, bounded operating triggers |
| Application production dependency audit | 0 critical, 0 high, 4 moderate | Remaining moderate findings are in the legacy `gray-matter` dependency chain |
| Growth production dependency audit | 2 moderate findings; no high/critical finding reported | Existing `node-cron` / `uuid` chain; cron expressions are trusted deployment configuration |

The [preview record](previews/README.md) and [browser QA report](previews/browser-qa-report.json) distinguish actual local production pages from intercepted synthetic private-order fixtures. Root uploaded and hash-verified 17 screenshot blobs for release packaging; branch/PR persistence is still pending below. Screenshots are evidence of presentation and behavior. They are not customer orders, refunds, results, or hosted-launch evidence.

## Database release record

Target project: `fehgxlhqvizpozvbvemq`. Versions below are the observed remote migration versions, not the earlier local preparation timestamps.

| Migration | Remote version | Current evidence |
| --- | --- | --- |
| Studio fulfillment and capacity | `20261020192116` | Applied; guarded rollback smoke passed |
| Operations control | `20261020192124` | Applied; guarded rollback smoke passed |
| Studio refund recovery | `20261020192133` | Applied; guarded rollback smoke passed |
| Explicit customer feedback | `20261020192540` | Applied; guarded rollback smoke passed |
| Owned-blog publication | `20261020194835` | Applied; full publisher rollback smoke passed after the separate compatibility correction |
| Publication-status compatibility | `20261020195437` | Applied; all legacy/new state checks and the complete publisher rollback smoke passed |

The initial publisher smoke rolled back its fixtures after revealing that legacy drafts permitted only `pending`, `approved`, and `rejected`. The separately applied correction preserves those states and existing rows, adds explicit `published` and `withdrawn` states, and changes neither RLS nor grants. The already-applied publisher migration was not rewritten. The complete rerun passed: all five supported states, rejection of an unknown state, exact approval hashes, leases, dedupe, separate caps, and safe withdrawal. Those publication fixtures also rolled back; this remains database verification, not a live public article.

Final database verification found all 8 new tables empty, with RLS enabled and SELECT denied to `anon` and `authenticated`. The 12 existing blog posts and 83 legacy drafts were unchanged after the rollback tests. Database security advisors reported 15 informational RLS-without-policy entries and no warnings/errors; these private service-only tables deliberately have no browser-role policy. This does not replace the separate production dependency audit above.

Applying private tables and RPCs does not activate a web worker, validate provider credentials, or establish a running schedule. Match the repository migration filenames to the observed remote history; do not apply the same DDL again under an earlier preparation timestamp.

## Active, inactive, and unverified surfaces

| Surface | State at this handoff | What can be claimed |
| --- | --- | --- |
| New application code | Implemented and locally verified; production deployment pending | A reviewable build exists |
| New database controls | All six migrations installed; all five rollback smoke suites passed | Applied schema and verified database boundaries |
| New checkout, fulfillment, and refund configuration | Prepared flags default off; hosted configuration unverified | No newly enabled production commerce flow |
| Five-minute paid-order routine | Implemented; new Railway trigger defaults off | No unattended execution evidence yet |
| Native Vercel schedule | Source contains daily operations at 14:00 UTC and Sunday rarity snapshot at 15:00 UTC | A source configuration, not an activated schedule |
| Existing Railway growth deployment | Existing service remains active from its old `master` source | The old process is running; new default-off flags do not change that deployed code |
| Rebuilt growth service | Prepared in a separate working branch; new capabilities default off | Bounded draft generation and operating triggers are implemented |
| Independent owned-blog review/publication | Implemented; review and publication flags default off | No actual model review, public article, or deployed publisher has been verified |
| Explicit useful/use/reuse reporting | Implemented; private feedback schema and smoke verified | Authenticated self-reporting is supported by the code; no customer outcome cohort is established |
| Support inbox | Not connected | Self-service recovery/refund code does not establish unattended email support |
| External hourly oversight | Pending root setup and verification | No active oversight schedule is claimed in this record |
| Remote release branches and PRs | Pending root persistence/confirmation | Local work is not yet evidence of a remote PR or deployed release |
| Paid acquisition | Allocation remains $0 | No advertising budget or promotional-outreach authority has been introduced |

The daily native fallback alone does not satisfy the operations dashboard's twenty-minute freshness requirement. Normal recovery needs the optional five-minute Railway trigger, correctly configured and observed. Application rows authenticated with a cron secret prove invocations; they do not independently prove the provider's schedule settings.

## Access and activation blockers

The correctly scoped Vercel connector returned **403** for team `nholmes0903-3741s-projects`. The intended project is `bootfile-app` (`prj_BtofPdRlxqSoLr2SuUvp3qEXkE1n`) under team `team_bRGZ2C69tQmnm2W8yrXMm09f`. The correctly scoped CLI fallback had no existing credentials and entered a device-login path, which was cancelled.

Production source SHA, deployment URL, environment targets, provider credentials, and hosted schedules therefore remain unverified. This is an account-scope/credential access block, not an automatic approval-review rejection. An authorized connection with access to the intended team is the one-time access gate; routine engineering work should continue through the established release process after access is available.

## Exact launch gates

Agents should complete ordinary release work and present evidence. These gates do not create a requirement for Nick to approve every run, article, repair, or merge.

1. **Persist the reviewed release.** Record both repository branches, immutable source SHAs, PR URLs, and final CI results. The final application verification includes the corrective migration and sitemap refresh; attach its results to the persisted release.
2. **Database gate completed.** All six observed versions are recorded above and all five guarded rollback smoke suites passed, including the status correction and complete publisher checks. Preserve this migration history in the release.
3. **Resolve hosting access.** Verify the intended Vercel team/project and current production source before configuring or deploying the new release.
4. **Verify deployment configuration.** Configure the correct database/provider accounts and distinct admin, cron, draft, and publisher credentials. Inspect variable names and deployment targets without exposing values. Keep enable flags off until their relevant checks pass.
5. **Deploy and verify the actual application.** Record the hosted source SHA and URL. Verify public pages, paused checkout behavior, private capability boundaries, and the configured webhook/cron destinations on that deployment.
6. **Prove one controlled commerce flow.** Verify payment amount/product binding, saved generation, transactional delivery evidence, safe retry/idempotency behavior, customer-requested eligible refund recovery, and explicit feedback persistence. Provider email acceptance is distinct from inbox arrival; a saved setup is distinct from usefulness or reuse.
7. **Prove unattended recovery.** Enable the selected five-minute scheduler and observe two successive unattended executions with final run outcomes. Confirm the deployed growth-service SHA and configuration. A manual endpoint call or registered cron expression is insufficient proof.
8. **Prove the limited publisher.** First observe an independent review with public writes disabled. Verify exact source/article binding, approved-source checks, changed-content refusal, publication caps, and one controlled publish/withdraw cycle, including blog and sitemap refresh. Only then enable routine owned-blog publication under the operating charter.
9. **Verify oversight and support boundaries.** Record the hourly oversight task's actual identifier, schedule, accessible evidence, and exception behavior after root creates it. Connect and verify an approved support-inbox workflow before claiming unattended inbox support. Until then, record that limit explicitly.
10. **Measure the business test.** Track confirmed purchases, provider/operating costs, delivery failures, refunds, explicit usefulness/use/reuse reports with their denominators, and owner-intervention time. Revenue, profit, product demand, and the 99% autonomy objective require observed evidence after launch.

## Owner decisions stay limited

- **Product and economics:** a material change to the customer/task, $49 offer, pricing, or customer promises.
- **New financial commitments:** paid acquisition, a new recurring vendor, or expansion beyond an approved operating budget. Bring an exact cap, success measure, and stop condition.
- **Consequential exceptions:** security/data-use changes, disputes, outside-policy refunds, or another irreversible business decision.

Routine reconciliation, eligible policy refunds, bounded retries, compliant owned-blog publication, and tested reversible maintenance belong to the agents once deployment/access is verified. An ordinary editorial rejection stays unpublished; it is not a daily owner review request. Missing configuration and transient operational failures are engineering work unless the remedy crosses one of the decision boundaries above.

## Final release entries for root

| Entry | Current value |
| --- | --- |
| App remote branch / SHA / PR | Pending confirmation |
| Growth remote branch / SHA / PR | Pending confirmation |
| Corrective migration remote version / publisher smoke | `20261020195437`; full updated publisher rollback smoke passed |
| Final post-correction verification | Tests 169/15 passed; Next.js 16.4.2 build with 75 pages/routes passed; lint 0 errors / 6 legacy warnings |
| Hosted app deployment SHA / URL | Blocked on verified hosting access |
| New Railway deployment ID / SHA / enabled capabilities | Pending |
| Two unattended operation run IDs | Pending |
| Controlled provider and publication verification | Pending |
| Hourly oversight task ID / schedule / observed result | Pending root setup |

Operating details: [charter](OPERATING_CHARTER.md), [operations runbook](OPERATIONS_RUNBOOK.md), and [growth migration/publication contract](GROWTH_AGENT_MIGRATION.md).
