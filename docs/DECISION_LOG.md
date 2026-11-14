# Owner decision log

The repository decision log named in `docs/OPERATING_CHARTER.md`. Each record states the affected customer or task, the evidence, the decision, its exact scope, its cost, and its stop or rollback condition. A record here does not send money, deploy code, or publish content.

## 2026-11-13: the handoff brief governs

- **Affects:** product direction and every planning assumption.
- **Evidence:** the owner's handoff brief of 2026-11-13 and the binding product decision of 2026-10-21.
- **Decision:** the $49 one-time, quiz-led Brand & AI Kit for small-business owners is the product. Bootfile is a build-and-validate project and is not part of any short-term revenue target.
- **Scope:** no new SKUs, no price change, no subscription, paid acquisition stays at $0.
- **Cost:** none.
- **Stop or rollback:** a later explicit owner decision.

## 2026-11-13: per-order model ceiling approved

- **Affects:** every paid `brand-foundation-paid-v1` order.
- **Evidence:** `lib/studio/model-budget.ts` and its tests; published list prices on 2026-11-13.
- **Decision:** approved as proposed for the single-stage synthesis design.
- **Scope:** at most 3 provider calls per order, 16,000 request bytes and 4,000 output tokens per call, and $0.35 per order across all attempts, on allow-listed models only. Worst case per call is $0.037 on Haiku 4.5 and $0.111 on Sonnet 4.6.
- **Measurement:** the usage ledger on the order and its `model_usage_recorded` events. A missing token count is charged at the worst case and marks the order's total as estimated.
- **Cost:** bounded by the ceiling. No live call has been made, so typical cost is an estimate of about $0.01 per call on Haiku 4.5.
- **Stop or rollback:** any `model_budget_breached` event, or a paid order refused with `model_budget_exhausted`, is a defect to resolve before more Brand Kit orders are admitted. Automatic pausing of checkout on that signal is not built yet and arrives with checkout. Raising any ceiling, adding a model stage, or adding a revision allowance needs a new record.

## 2026-11-13: repository visibility

- **Affects:** `niho0903/bootfile-app`, which is public.
- **Evidence:** the repository API reports `visibility=public`; a pattern scan of all 274 commits on `master` and six branch heads found no key-shaped strings other than one test placeholder.
- **Decision:** make it private.
- **Status:** not yet executed. On a Vercel Hobby team, commits to a private repository deploy only when authored by the team owner, which would stop previews of agent-authored commits. The team plan could not be read because the Vercel connection lacks team approval. Execute once the plan is known, or on the owner's word that the trade-off is accepted.
- **Update, later on 2026-11-13:** the owner approved Vercel team access and the plan was read: Hobby. Vercel's published rules for private repositories were read the same day. On Hobby a commit deploys only when its author is the team owner; on Pro or Enterprise only when its author is a team member. An earlier note that a Pro plan alone would remove the problem was wrong. Agent-authored commits would stop producing previews on either plan unless the agent's commit identity joins the team or previews are created another way. The repository is left public, and CI remains the verification of record, until the owner says to switch with that trade-off accepted.
- **Cost:** none on GitHub. Possibly a hosting plan change, which would be its own decision.
- **Stop or rollback:** visibility can be switched back.

## 2026-11-13: hosting moved to Vercel Pro

- **Affects:** every project in the Vercel team, including `bootfile-app`.
- **Evidence:** the owner's message, and the team's event log entry "changed plan from Hobby to Pro" at 20:18 UTC on 2026-11-13. The user-level billing field still read `hobby` minutes later, so the team event is the evidence of record.
- **Decision:** made and executed by the owner. It removes the Hobby plan's non-commercial limit as a blocker for a paid product on this hosting.
- **Scope:** hosting only. It opens no checkout, enables no flag and does not change repository visibility. On Pro a private repository still deploys only commits authored by a team member.
- **Cost:** the Pro subscription, bought by the owner; the amount was not read. Builds are now billed. Vercel's published rate on 2026-11-13 starts at $0.0035 per CPU minute, and the plan change moved every project to Elastic build machines. Each push to this repository builds two projects, `bootfile-app` and `personal-site`.
- **Stop or rollback:** the owner can change the plan.

## 2026-11-13: owner approval of the open items, and the acceptance database

- **Evidence:** the owner's message "approved to do all" at 17:56 Eastern, in reply to a report that listed what was waiting on him.
- **Read as approving, and done:** a separate acceptance database. The free Supabase project `bootfile-acceptance` was created in the owner's organization at no cost. The seven files in `supabase/migrations` were applied to it from commit `e0c49a3`, each checked against its SHA-256 before it ran, on top of stand-ins for the two legacy tables the October migrations alter. All six smoke suites in `supabase/tests` then passed on it and were rolled back. Its security advisor reports only the expected notice that tables have row-level security with no policies, which is the design: access is through the service role only.
- **Read as approving, recorded and not yet built or applied:** the customer wording as written (checkout line, purchase panel, delivery email, order page labels); one revision within seven days of delivery at a $0.60 per-order ceiling; the proposed terms and privacy text, which counsel should still read before a real charge.
- **Not done under this approval:** entering any key or secret, and paying. Those stay with the owner. No flag was enabled. Nothing in the production database or the `personal-site` project was changed.
- **Stop or rollback:** delete the `bootfile-acceptance` project and the `rebuild/acceptance` branch. Nothing in production depends on either.

## 2026-11-13: previews share production credentials

- **Evidence:** the Vercel project's variable names and targets, read without values. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET` and `ADMIN_PASSWORD` each have one value that applies to Production, Preview and Development. No `STUDIO_` variable exists in the project.
- **Consequence:** a preview that had the checkout flags turned on, without branch-scoped overrides, would take live payments against the production database. The acceptance order therefore is: branch-scoped test values first, then a read of `/api/studio/brand-config` showing `paymentMode: "test"`, and only then the flags.
- **Recommended, owner's setting:** limit the production values of those secrets to the Production environment.

## 2026-11-13: the site must explain itself, and Enrich Labs is not a destination

- **Evidence:** the owner's messages between 18:32 and 18:41 Eastern.
- **Decided by the owner:** the flow must make plain, without effort, what a small business owner does, what they get, why it is useful and where each piece goes. The outputs should be shown in use as placeholders, at a starter-kit grade, with care that people do not fix on the first version they see. Enrich Labs / Helena is removed as a destination because its adoption is too low. The assistants to support are the ones owners actually use: ChatGPT, Claude, Gemini, Grok, DeepSeek and Kimi.
- **How it is carried out:** outcome first on the opening screen; plain step names; a last screen that leads with where each piece goes. For visuals the rule is real brand, placeholder layout: the owner's own words, colors and type at full fidelity, with photo, logo and arrangement drawn as obvious placeholders. No generated images. The quiz stays first, under the standing quiz-led decision.
- **Supersedes:** the destination lists in `docs/BRAND_FOUNDATION_PRODUCT_BRIEF.md`, `docs/BRAND_KIT_BUILD_STATUS.md` and `docs/PAID_BRAND_KIT_RELEASE_PLAN.md` where they name Enrich Labs.
- **Stop or rollback:** revert the increment. No stored order or approval depends on the destination list.

## Open

- Two customer-facing wordings still use older terms and are the owner's to change: the checkout line in `lib/studio/products.ts` says "A brand foundation, ..." where the page and the saved kit now say "Your brand", and the order page's browser tab title reads "Your Marketing Setup" for both products. Recommended: "Your brand guide, voice guide, visual starter kit, AI working instructions, and a first campaign." and "Your order | Bootfile". Neither changes the price or what is delivered.
- Hosted acceptance still needs four branch-scoped secrets from the owner on `rebuild/acceptance`: a Stripe test-mode secret key, its webhook signing secret, the acceptance database's service role key, and a new `STUDIO_ACCESS_TOKEN_SECRET`. Then the test payment.
- Hosted acceptance, per `docs/PROVIDER_ACCEPTANCE_RUNBOOK.md`. Needs from the owner: the database choice (recommended: a separate free Supabase project for acceptance, so no synthetic order enters the production ledger), the Preview variables for the `rebuild/acceptance` branch, and the test payment. Bounded cost: one generation under the $0.35 ceiling, one email, one build.
- The production database plan. It is on Supabase's Free plan, which pauses projects after a week of low activity and reserves automated backups for paid plans. Recommended before the first real charge: a paid plan. It is a new subscription, so it waits for the owner.
- Build spend. Every push here now pays for a `personal-site` build as well as the Bootfile one. Recommended: disconnect `personal-site` from this repository, and consider the Basic build machine for `bootfile-app`. Both are the owner's settings; `personal-site` is outside this work and was not touched. Pushes on the rebuild line are kept to one per increment.
- The wording a customer sees on `/brand` once checkout is open: the purchase panel in `components/brand/BrandKitPurchase.tsx` and the four conditional lines in `components/brand/BrandStudio.tsx`. It describes what the synthesis returns today, states one payment with no subscription, and names the existing 7-day refund policy. Shown to no one while either checkout flag is off.
- The Brand & AI Kit delivery email wording in `lib/studio/delivery.ts` and the labels on its order page. They keep the existing seven-day refund policy and promise nothing new. Shown to no one while fulfillment is closed.
- The bounded refinement allowance behind the $49 promise. Must be decided before any charge.
- Whether an independent second model stage is wanted at up to roughly double the per-order ceiling.
- The exact checkout wording for the Brand & AI Kit. `lib/studio/products.ts` currently names it "Bootfile Brand & AI Kit" with the line "A brand foundation, voice guide, visual starter kit, AI working instructions, and a first campaign." It is shown to no one while checkout is closed.
- Proposed, not decided: one revision per order within seven days of delivery. The customer changes their answers once, re-approves the backbrief and receives a regenerated kit; editing the text themselves stays unlimited. Cap: at most 2 further provider calls, raising the per-order ceiling from $0.35 to $0.60. Measurement: the same usage ledger. Stop condition: if more than 40 percent of the first 25 orders use the revision, treat first-draft quality as the defect and fix synthesis instead of widening the allowance. Owner involvement per order: none.
