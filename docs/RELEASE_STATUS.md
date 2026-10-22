# Bootfile Studio release status

## October 21 morning continuation — source-specific verification

**Current verified application code SHA:** `ed6faef8c0381d653f09b730fba6dfd667d30fa8` on draft PR #2. [GitHub verification run 39598440976](https://github.com/niho0903/bootfile-app/actions/runs/39598440976) completed successfully. This is a prelaunch code result, not a hosted commerce acceptance or production promotion.

- **Product usability:** Step-three checkout intake now lets customers choose ChatGPT, Claude or Gemini, and retains that selection with their non-email tab draft. The output's setup steps offer platform-specific saved-workspace guidance with a normal-chat fallback, plus a privacy-safe direct provider link. See `docs/PLATFORM_SETUP_REFERENCES.md` for dated official-source evidence, including Gemini's announced Gems-to-skills transition. The one-time $49 offer and output contract have not changed.
- **Security regression caught and fixed:** The new local production-mode HTTP smoke initially exposed a same-origin request rejected as 403. The middleware's CSRF check now accepts the exact observed Host/protocol when Next normalizes `nextUrl`, while continuing to reject an explicitly foreign Origin and a missing Origin/Referer. Automated verification covers these cases; this is not yet a hosted browser checkout test.
- **CI release gate strengthened:** `npm run smoke:prelaunch` starts the compiled application with checkout, fulfillment, refunds and publishing forced off and checks 11 public/private, headers, auth, CSRF and configuration behaviors. The latest CI also passed TypeScript, lint (0 errors / 6 existing legacy warnings), **172 unit tests across 15 files**, a Next.js 16.4.2 production build, and all **11** HTTP acceptance checks.
- **Dependency verification:** The new `npm audit --omit=dev --audit-level=high` gate passed. Four moderate production advisories remain in the legacy `gray-matter` / `js-yaml` / `argparse` / `sprintf-js` chain; upgrading blindly would be breaking and is not part of this release. The full `npm ci` installation emitted **13 total advisories (7 moderate, 6 high)** including development dependencies. Production audit passing does not imply the whole development tree is advisory-free. Investigate development advisories on an isolated maintenance branch before claiming full supply-chain clearance.
- **Hosted previews:** The earlier product-source commit `a1b43f4d1ebe2dff7728efff48ff4459128dc175` has a successful `bootfile-app` Vercel deployment status visible through GitHub. The latest CI/policy-only commit's preview had not yet been confirmed at this recording. Vercel team-scope access and protected hosted application acceptance remain unresolved; do not infer promotion from an automatic build.
- **Runtime boundaries unchanged:** App PR #2 and growth PR #1 remain unmerged drafts. Railway still runs the March legacy master SHA. Supabase continues to show no new Studio orders, deliveries, worker-run rows, feedback or owned-publication rows. All new commerce/publishing switches remain default off in source, and paid acquisition allocation is $0. No real Studio transaction, inbox delivery, scheduled worker recovery, automatic post or revenue was demonstrated.
- **Scheduled agents:** The hourly Bootfile operations watch is enabled. The separate overnight build series stopped before completing the full advertised eight-hour sequence, so do not count unobserved iterations as work completed. This continuation provides independently checked code and workflow evidence instead.

**Next release gate:** Obtain authorized scoped hosting QA, validate configured providers against the intended project, observe a controlled paid purchase and deterministic recovery, deploy the reviewed Railway service and verify two unattended five-minute outcomes, then verify the independent publisher. Until then, remain in staged autonomy; do not enable checkout, refunds, publication or spend as a shortcut.

## October 21 prelaunch prototype update (verified source)

- Application PR #2 now contains the Edge middleware compatibility repair and bounded in-memory rate-store cleanup at commit `c791827a92617bef20efb671c0c93143728323c6`. The first isolated patch at `1d85ff7` was incorporated and improved on the existing rebuild branch; that standalone branch is not the release source.
- Application PR #2 also contains a free-alternative comparison on `/studio/sample`, a directly copyable prompt, and a neutral evaluation checklist at commit `d26f0768fcb79f603f1781bd815abeecd5d89d58`. The goal is to validate the paid value against a good native-AI solution; no improved conversion or quality has been claimed.
- GitHub Actions workflow `39534422382` for `d26f0768` completed successfully. Its typecheck, lint, automated tests, and production build steps all succeeded. The Vercel `bootfile-app` status for that commit was **pending** at this check; do not mark hosted acceptance complete until the source-specific result is observed.
- Neither application PR #2 nor growth-service PR #1 has been merged. Existing launch gates, flags, and $0 paid-acquisition budget remain unchanged. The current Railway deployment still points at the March legacy master source.
- Overnight staged-autonomy iterations are scheduled for 23:00 through 06:00 America/New_York, with an evidence-only review at 07:00. A scheduled task is not proof that fixes were produced or executed; read the actual commits, statuses, and run records before making a launch claim.


Evidence recorded on 2026-10-20. This document separates verified implementation and database work from production activation. Update the pending entries with observed results before describing the rebuilt business as live.

## Current position

The rebuilt offer is a **$49 one-time Marketing Setup** for a solo service-business owner preparing one promotion: a customer email, three coordinated social posts, a saved business brief, reusable AI context/task instructions, and a review checklist. It is a product hypothesis ready for a controlled launch, not demonstrated demand or revenue.

The application and separate operating service are implemented and have passed substantial local verification. All six database migrations are applied, and all five guarded rollback smoke suites passed. The publisher’s initial legacy-status compatibility failure was fixed through a separate corrective migration and a successful full smoke rerun. Both implementations are persisted in GitHub PRs and both repositories have successful GitHub verification. Vercel reports a successful automatic Bootfile preview, but its authentication wall prevents application-level hosted QA. Controlled hosting access, deployed commerce-provider checks, production promotion, and unattended commerce execution evidence remain incomplete.

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
| Application GitHub verification | Completed successfully for PR run `39516526432` and push run `39516523202` | Install, types, lint, tests, and production build passed for the persisted implementation |
| Growth GitHub verification | Completed successfully; run `39516363561` | Remote verification of the persisted operating-service implementation |
| Application production dependency audit | 0 critical, 0 high, 4 moderate | Remaining moderate findings are in the legacy `gray-matter` dependency chain |
| Growth production dependency audit | 2 moderate findings; no high/critical finding reported | Existing `node-cron` / `uuid` chain; cron expressions are trusted deployment configuration |

The [preview record](previews/README.md) and [browser QA report](previews/browser-qa-report.json) distinguish actual local production pages from intercepted synthetic private-order fixtures. The 17 screenshot blobs are hash-verified and persisted in the application PR. Screenshots are evidence of presentation and behavior. They are not customer orders, refunds, results, or hosted-launch evidence.

## Persisted implementation releases

| Repository | Implementation SHA | Review and verification |
| --- | --- | --- |
| Application | `59e016b9f3336e8ae9e6784570216e677ea884db` | [PR #2](https://github.com/niho0903/bootfile-app/pull/2); [PR verification](https://github.com/niho0903/bootfile-app/actions/runs/39516526432) and [push verification](https://github.com/niho0903/bootfile-app/actions/runs/39516523202) succeeded |
| Operating service | `21ea85b305e7c2fc80a0dda99e2ba0a8d55a561c` | [PR #1](https://github.com/niho0903/bootfile-growth-agent/pull/1); [verification](https://github.com/niho0903/bootfile-growth-agent/actions/runs/39516363561) succeeded |

The application implementation tree is `1eef9105fc65233ad09f05b00a1924392667e33b`, verified to match the local implementation. These are implementation SHAs; the release-status documentation follow-up changes the branch heads without changing that implementation evidence. PR persistence and passing CI do not establish production activation.

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
| New application code | Persisted in PR #2; local and GitHub checks passed; automatic Vercel preview reported successful | The implementation and a protected preview build exist; production promotion is pending |
| New database controls | All six migrations installed; all five rollback smoke suites passed | Applied schema and verified database boundaries |
| New checkout, fulfillment, and refund configuration | Prepared flags default off; hosted configuration unverified | No newly enabled production commerce flow |
| Five-minute paid-order routine | Implemented; new Railway trigger defaults off | No unattended execution evidence yet |
| Native Vercel schedule | Source contains daily operations at 14:00 UTC and Sunday rarity snapshot at 15:00 UTC | A source configuration, not an activated schedule |
| Existing Railway growth deployment | Existing service remains active from its old `master` source | The old process is running; new default-off flags do not change that deployed code |
| Rebuilt growth service | Persisted in PR #1; GitHub verification passed; new capabilities default off | Bounded draft generation and operating triggers are implemented; the new service has not been deployed |
| Independent owned-blog review/publication | Implemented; review and publication flags default off | No actual model review, public article, or deployed publisher has been verified |
| Explicit useful/use/reuse reporting | Implemented; private feedback schema and smoke verified | Authenticated self-reporting is supported by the code; no customer outcome cohort is established |
| Support inbox | Not connected | Self-service recovery/refund code does not establish unattended email support |
| External hourly oversight | “Bootfile operations” created and enabled; hourly, `America/New_York` | First read-check run completed; no paid-worker execution or recovery outcome is established |
| Remote release branches and PRs | Application PR #2 and operating-service PR #1 persisted with successful CI | Immutable implementation references are recorded above; this is not production promotion |
| Paid acquisition | Allocation remains $0 | No advertising budget or promotional-outreach authority has been introduced |

The hourly oversight task is configured to check GitHub, Supabase, and Railway evidence with healthy preflights, report actionable changes, and suppress healthy updates and duplicate notices for unchanged known blockers. Its first recorded run completed on 2026-10-20 at 23:48:41 UTC and reported successful infrastructure reads without a new production incident. The optional attempt to post PR comments was blocked by GitHub tool safety checks; that action has been removed from the watch. Monitoring results remain in the task record, with owner notices limited to material exceptions. One completed read-check run does not establish sustained reliability or a paid-order recovery outcome. It does not replace the application's paid-order scheduler.

The daily native fallback alone does not satisfy the operations dashboard's twenty-minute freshness requirement. Normal recovery needs the optional five-minute Railway trigger, correctly configured and observed. Application rows authenticated with a cron secret prove invocations; they do not independently prove the provider's schedule settings.

## Access and activation blockers

The correctly scoped Vercel connector returned **403** for team `nholmes0903-3741s-projects`. The intended project is `bootfile-app` (`prj_BtofPdRlxqSoLr2SuUvp3qEXkE1n`) under team `team_bRGZ2C69tQmnm2W8yrXMm09f`. The correctly scoped CLI fallback had no existing credentials and entered a device-login path, which was cancelled.

The existing GitHub integration automatically triggered a preview for the intended `bootfile-app` project. Vercel reports that [deployment](https://vercel.com/nholmes0903-3741s-projects/bootfile-app/HvuHRugiSj7Np24xB9xxJamN9xhp) as **SUCCESS** for implementation SHA `59e016b9f3336e8ae9e6784570216e677ea884db`. The official bot supplied this [protected preview URL](https://bootfile-app-git-rebuild-task-a6df8c-nholmes0903-3741s-projects.vercel.app). Read-only requests to `/`, `/studio`, `/api/studio/config`, and a private order endpoint without a capability all returned **302 to Vercel sign-in with `no-store`**. No authentication bypass was attempted. Hosted application responses therefore remain unverified; an authorized Vercel session is required for controlled preview QA.

The same GitHub integration also triggered an unexpected preview for `personal-site` (`prj_OJsB6nGDdQPFCS2cqjttYZnfnkSb`), which failed. Inspect the project/repository routing under the correct Vercel scope before promoting the Bootfile release. There is no authority to change the unrelated personal-site project.

Production source SHA and URL, environment targets, provider credentials, and hosted schedules remain unverified. The automatic preview build does not provide controlled configuration access or constitute production promotion. The direct connector failure is an account-scope/credential access block, not an automatic approval-review rejection. An authorized connection with access to the intended team is the one-time access gate; routine engineering work should continue through the established release process after access is available.

## Exact launch gates

Agents should complete ordinary release work and present evidence. These gates do not create a requirement for Nick to approve every run, article, repair, or merge.

1. **Release persistence completed.** Both PRs, immutable implementation SHAs, and successful GitHub verification runs are recorded above. The application implementation includes the corrective migration and sitemap refresh; the 17 QA screenshots are persisted with it.
2. **Database gate completed.** All six observed versions are recorded above and all five guarded rollback smoke suites passed, including the status correction and complete publisher checks. Preserve this migration history in the release.
3. **Resolve hosting access and routing.** Verify the intended Vercel team/project, current production source, and repository associations. Resolve the unexpected personal-site preview routing before promotion without changing that unrelated project without authority. Obtain authorized access for controlled preview QA; the successful automatic preview alone does not satisfy this gate.
4. **Verify deployment configuration.** Configure the correct database/provider accounts and distinct admin, cron, draft, and publisher credentials. Inspect variable names and deployment targets without exposing values. Keep enable flags off until their relevant checks pass.
5. **Deploy and verify the actual application.** Record the hosted source SHA and URL. Verify public pages, paused checkout behavior, private capability boundaries, and the configured webhook/cron destinations on that deployment.
6. **Prove one controlled commerce flow.** Verify payment amount/product binding, saved generation, transactional delivery evidence, safe retry/idempotency behavior, customer-requested eligible refund recovery, and explicit feedback persistence. Provider email acceptance is distinct from inbox arrival; a saved setup is distinct from usefulness or reuse.
7. **Prove unattended recovery.** Enable the selected five-minute scheduler and observe two successive unattended executions with final run outcomes. Confirm the deployed growth-service SHA and configuration. A manual endpoint call or registered cron expression is insufficient proof.
8. **Prove the limited publisher.** First observe an independent review with public writes disabled. Verify exact source/article binding, approved-source checks, changed-content refusal, publication caps, and one controlled publish/withdraw cycle, including blog and sitemap refresh. Only then enable routine owned-blog publication under the operating charter.
9. **Verify oversight results and support boundaries.** The “Bootfile operations” watch is created and enabled on an hourly `America/New_York` schedule. Its first read-check run completed and the unnecessary blocked PR-comment action was removed. Continue verifying exception handling and sustained operation; the watch does not prove paid-order worker execution. Connect and verify an approved support-inbox workflow before claiming unattended inbox support. Until then, record that limit explicitly.
10. **Measure the business test.** Track confirmed purchases, provider/operating costs, delivery failures, refunds, explicit usefulness/use/reuse reports with their denominators, and owner-intervention time. Revenue, profit, product demand, and the 99% autonomy objective require observed evidence after launch.

## Owner decisions stay limited

- **Product and economics:** a material change to the customer/task, $49 offer, pricing, or customer promises.
- **New financial commitments:** paid acquisition, a new recurring vendor, or expansion beyond an approved operating budget. Bring an exact cap, success measure, and stop condition.
- **Consequential exceptions:** security/data-use changes, disputes, outside-policy refunds, or another irreversible business decision.

Routine reconciliation, eligible policy refunds, bounded retries, compliant owned-blog publication, and tested reversible maintenance belong to the agents once deployment/access is verified. An ordinary editorial rejection stays unpublished; it is not a daily owner review request. Missing configuration and transient operational failures are engineering work unless the remedy crosses one of the decision boundaries above.

## Final release entries for root

| Entry | Current value |
| --- | --- |
| App implementation / PR | `59e016b9f3336e8ae9e6784570216e677ea884db`; [PR #2](https://github.com/niho0903/bootfile-app/pull/2); both GitHub verification runs succeeded |
| Growth implementation / PR | `21ea85b305e7c2fc80a0dda99e2ba0a8d55a561c`; [PR #1](https://github.com/niho0903/bootfile-growth-agent/pull/1); GitHub verification succeeded |
| Corrective migration remote version / publisher smoke | `20261020195437`; full updated publisher rollback smoke passed |
| Final post-correction verification | Tests 169/15 passed; Next.js 16.4.2 build with 75 pages/routes passed; lint 0 errors / 6 legacy warnings |
| Automatic application preview | Vercel reports SUCCESS for the implementation SHA; supplied preview URL redirects tested requests to Vercel sign-in; application-level hosted QA remains blocked |
| Production app deployment SHA / URL | Unverified; no production promotion performed; hosting scope and repository routing require resolution |
| New Railway deployment ID / SHA / enabled capabilities | Pending |
| Two unattended operation run IDs | Pending |
| Controlled provider and publication verification | Pending |
| Hourly oversight / schedule / observed result | “Bootfile operations” created and enabled; hourly `America/New_York`; first read-check run completed; optional PR-comment action blocked and removed; no paid-worker execution proven |

Operating details: [charter](OPERATING_CHARTER.md), [operations runbook](OPERATIONS_RUNBOOK.md), and [growth migration/publication contract](GROWTH_AGENT_MIGRATION.md).
