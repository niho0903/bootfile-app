# Release manifest

Recorded 2026-11-13. Release gate 1 of `docs/STAGED_AUTONOMY_RELEASE_POLICY.md`. This is a record of source, not a release: every pull request below is an open draft, nothing is merged, and production still serves `master` at `5ede597`.

## bootfile-app

Each pull request is stacked on the one above it. The base of #2 is `master`.

| PR | Branch | Head | Adds | Latest Verify run on that head |
| --- | --- | --- | --- | --- |
| #2 | `rebuild/task-studio-20261020` | `73ed664` | Marketing Setup commerce and operations: orders, payment binding, worker leases, delivery, refunds, operations ledger | [39598900446](https://github.com/niho0903/bootfile-app/actions/runs/39598900446) success, 2026-10-21 |
| #3 | `rebuild/brand-kit-20261021` | `b612d88` | The quiz-led Brand & AI Kit experience at `/brand`: guided chapters, review screen, template preview and exports | [39632341244](https://github.com/niho0903/bootfile-app/actions/runs/39632341244) success, 2026-10-21 |
| #4 | `build/paid-brand-synthesis-20261023` | `82bfe33` | Paid synthesis candidate: versioned intake, one bounded model request, kit renderers, release plan | [40017391197](https://github.com/niho0903/bootfile-app/actions/runs/40017391197) success, 2026-10-23 |
| #5 | `rebuild/order-model-budget-20261113` | `d1ba93a` | Per-order model ceiling and generation dispatched by the order's persisted version; dependency advisory fix | [43477473002](https://github.com/niho0903/bootfile-app/actions/runs/43477473002) success, 2026-11-13 |
| #6 | `rebuild/product-versions-schema-20261113` | `faefeac` | Migration admitting the product version, with a bound model budget and usage ledger, its rollback and a database smoke suite in CI | [43488568607](https://github.com/niho0903/bootfile-app/actions/runs/43488568607) success, 2026-11-13 |
| #7 | `rebuild/versioned-checkout-20261113` | `bfa0ab8` | Checkout, payment verification and refunds bound to the persisted version; default-off paid intake route | [43490220081](https://github.com/niho0903/bootfile-app/actions/runs/43490220081) success, 2026-11-13 |
| #8 | `rebuild/versioned-delivery-20261113` | `aa13a96` | Delivery email, download and order page for a Brand & AI Kit order, public by default | [43497366571](https://github.com/niho0903/bootfile-app/actions/runs/43497366571) success, 2026-11-13 |
| #9 | `rebuild/brand-page-checkout-20261113` | `20aba06` | `/brand` offers the paid kit only when the server reports checkout open; order page wording follows the product | [43501557158](https://github.com/niho0903/bootfile-app/actions/runs/43501557158) success, 2026-11-13 |
| #10 | `rebuild/hosted-acceptance-kit-20261113` | `89ce43c` | Hosted acceptance runbook, guarded acceptance script, test-mode report on the readiness route | [43504403711](https://github.com/niho0903/bootfile-app/actions/runs/43504403711) success, 2026-11-13 |
| #11 | `rebuild/terms-and-manifest-20261113` | see the pull request | This manifest and the proposed terms and privacy wording. Documents only | see the pull request |

Full head commits: #2 `73ed664526112511c4d15ca44b8bd9e3cd47d7c2`, #3 `b612d88133c5d4e05a3f4d901ef0d9b7431e18d6`, #4 `82bfe3372caf4b861108d4eb1ee067399e017355`, #5 `d1ba93a3f5f9cd24eec0b09ab95eae2a0b1ec14f`, #6 `faefeac9289a79fe387d71cf9308673b43259be3`, #7 `bfa0ab893550a370eeb90121bf31e173da476609`, #8 `aa13a964ef508d06ec9249db26bb3d42e317fa61`, #9 `20aba0631ebcc77b7a14dc8d09337b6635c2792e`, #10 `89ce43c5850082d7342b5694828594a5c506b1cb`.

Two cautions about the table. The runs for #2, #3 and #4 date from October. On 2026-11-13 the dependency audit failed on their lockfile, on the advisory that #5 fixes, so a re-run would stop there and their passes are not current evidence. The run shown for #5 is a push run: its base is a `build/` branch, which the workflow does not trigger on for pull requests.

### Added after this recording

Stacked on #11 in the same way, each an open draft with its Verify run green on its head: #12 `rebuild/brand-first-run-20261113` (`bc0b333`), the flow that explains itself; #13 `rebuild/brand-placements-20261113` (`5fc62de`), the kit shown in placeholder placements; #14 `rebuild/paid-page-put-to-work-20261113` (`dcf1fe8`), the steps on the paid order page and plain words in the saved kit; #15 `rebuild/one-revision-20261113` (see the pull request), the server half of the one revision. #15 adds the migration `20261114021500_studio_order_revisions_v1`, applied to no database, and the flag `BRAND_KIT_REVISIONS_ENABLED`, off by default.

Hosted state changed since the recording: the acceptance database no longer has the temporary `http` extension, and the branch `rebuild/acceptance` has four non-secret Preview variables. A preview read `paymentMode: "live"` on 2026-11-13, so no checkout flag has been set anywhere.

## bootfile-growth-agent

| PR | Branch | Head | State |
| --- | --- | --- | --- |
| #1 | `rebuild/studio-operations-20261020` | `46e5dc5` | Open draft. Not changed in this work |
| #2 | `ops/growth-suspension-brand-kit-plan-20261023` | `be3ff30` | Open draft, one design document |

## Hosted state at this recording

- Vercel: team on Pro since 2026-11-13. Production is `master` at `5ede597`. Previews build for each head and sit behind Vercel Authentication. No preview has been exercised with provider credentials.
- Supabase: the six October migrations are applied to the hosted project. `20261113185211_studio_product_versions_v1` is applied nowhere. The eight Studio and operations tables held zero rows when read on 2026-11-13.
- Supabase, acceptance: a separate free project, `bootfile-acceptance`, created 2026-11-13 with all seven migrations applied from `e0c49a3` and the six smoke suites passing on it. It holds no orders.
- Railway: one idle placeholder service, per the handoff.
- Flags: `STUDIO_CHECKOUT_ENABLED`, `BRAND_KIT_CHECKOUT_ENABLED`, `STUDIO_FULFILLMENT_ENABLED` and `STUDIO_REFUNDS_ENABLED` default to off in source. Their hosted values were not read.

## Verified in source and CI

Types, lint, unit tests, a production build, the prelaunch HTTP smoke, the browser walk of `/brand` with checkout closed and with checkout simulated open against stand-ins, and the migration with its rollback and smoke suites on a disposable database.

## Not verified anywhere

- A real Stripe session in test or live mode, a webhook from Stripe, and a refund.
- A model call. Kit quality and actual cost per order are unmeasured.
- An email accepted by the provider, and inbox arrival.
- Any page on a hosted deployment, including the return from Stripe to the order page.
- The migration on a hosted database.
- Unattended scheduling, monitoring and a support destination.
- Customer value. No owner outside this project has used the kit.

## To release

The order is in `docs/PROVIDER_ACCEPTANCE_RUNBOOK.md` and `docs/PAID_BRAND_KIT_RELEASE_PLAN.md`: hosted acceptance in test modes, the open owner decisions in `docs/DECISION_LOG.md`, the terms and privacy text, the migration on production after a rollback-only run, then an explicit owner approval naming the commit and rollback plan.
