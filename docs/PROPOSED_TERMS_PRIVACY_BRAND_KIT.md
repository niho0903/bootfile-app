# Proposed terms and privacy wording for the Brand & AI Kit

Written 2026-11-13. **Proposed text for the owner's review. Not legal advice, and not applied.** `app/terms/page.tsx` and `app/privacy/page.tsx` are unchanged by this document, and nothing here is shown to a customer. A change to either page is an owner decision under `docs/STAGED_AUTONOMY_RELEASE_POLICY.md`, and counsel should read it before the first real charge.

## Why it is needed

The purchase panel on `/brand` asks the buyer to accept the Terms and Privacy Policy. Both pages describe the Marketing Setup: its fields, its deliverables and its name. Before a real charge they have to describe this product as well. This is gap 9 in `docs/HANDOFF_GAP_REGISTER.md`.

## Rule followed

Each proposed sentence describes what the source does today and names where that can be checked. It adds no promise the product does not already keep. Anything that would be a new promise is listed at the end as undecided.

## Terms

**1. Description of the service. Add after the Marketing Setup paragraph:**

> The Bootfile Brand & AI Kit is a one-time purchase. From answers you review and approve before payment, it produces a draft brand foundation: working positioning, voice guidance, a visual starter kit built from the colors and fonts you choose, working instructions for an AI assistant, and a first campaign of one customer email and three social posts. An AI model drafts the positioning, voice guidance, email and posts from your approved answers. The kit is a draft for you to check and edit. It is not researched or independently verified strategy, and nothing is sent or published on your behalf.

Checked against: `lib/studio/products.ts` (name and description), `lib/brand-kit/synthesis.ts` (what the model returns, and `requiresCustomerReview`), `lib/brand-kit/paid-output.ts` (what the kit file contains).

**2. Refund clause. Replace "If you're not satisfied with your BootFile" with:**

> If you're not satisfied with your purchase

The policy itself is unchanged: a full refund on request within 7 days of purchase. `docs/PAID_BRAND_KIT_RELEASE_PLAN.md` keeps that policy for this product, and `lib/studio/db.ts` computes the same seven-day window for every order.

**3. Your content. Add after the sentence that begins "For Studio, this includes":**

> For the Brand & AI Kit, this includes using your brand foundation, voice guidance, visual choices, AI working instructions, customer email and social posts for your own business.

This illustrates the existing licence sentence, which already covers the content generated for any purchase.

**4. AI-generated content. Add:**

> Parts of a Brand & AI Kit are assembled from your own choices and parts are drafted by an AI model. You are responsible for checking every claim, price, date and link before you publish anything from it.

The one-time-payment and no-subscription sentence already covers every purchase and needs no change.

## Privacy

**1. What we collect. Add after the Studio order paragraph:**

> When you buy a Brand & AI Kit, we collect your delivery email and the answers you approved: your eight working-preference answers, your business name and description, your audience, what sets you apart and the evidence you supply, your voice choice and notes, your color and font choices, and your offer, its confirmed details and next step. Until you press the payment button, these answers stay in your browser tab.

Checked against: the `BrandInput` fields in `lib/brand-kit/kit.ts`, `lib/brand-kit/paid-intake.ts`, and `components/brand/BrandKitPurchase.tsx`, which sends nothing before the button is pressed.

**2. Service providers. Add under the list:**

> For a Brand & AI Kit, we send Anthropic your business, voice, color and campaign answers. We do not send it your email address, your working-preference answers or your font names. Stripe receives your email address, the product name and price, and an order reference, not your answers. Resend receives your email address and the delivery message, which carries your private order link and the public version of your kit as an attachment. Supabase stores your approved answers, the generated kit, payment references and delivery records.

Checked against: `brandModelRequest` in `lib/brand-kit/synthesis.ts` (the exact fields sent), `studioCheckoutParameters` in `lib/studio/checkout.ts`, and `studioDeliveryMessage` in `lib/studio/delivery.ts`.

**3. Private working preferences. Add:**

> Your working-preference result is kept out of the emailed kit, the order page and the standard download. It is included only in the private copy that you download yourself from your order page.

Checked against: `lib/studio/db.ts`, the download route, and the tests in `lib/studio/brand-delivery.test.ts`.

**4. Analytics and browser storage. Extend the existing sentences to name this page:**

> The Brand & AI Kit page is excluded from Vercel Web Analytics. Its draft is kept in session storage in your current tab and expires after 24 hours of inactivity. Your delivery email is not part of that draft.

Checked against: the allowlist in `lib/privacy.ts`, `restoreBrandDraft` in `lib/brand-kit/kit.ts`, and the purchase panel, which never stores the email.

## Not proposed, because it would be a new promise or needs counsel

- Any revision or regeneration allowance. It is still an open owner decision.
- A fixed retention period or deletion deadline. The current policy states none and the source enforces none.
- Any statement about how a provider itself uses the data it receives. The current policy correctly points to each provider's own terms.
- Delivery time. No generation time has been measured on a hosted deployment.
- Governing law, liability and warranty language, which are unchanged.

## Smaller mismatches noticed while reading

- The Terms' opening describes the Service only as the quiz and the Marketing Setup.
- The Terms carry an effective date of June 1, 2025 and "last updated" of October 20, 2026. Both dates need the owner's decision when the text changes.
- The Privacy Policy's error-reporting sentence names "Private Studio routes". The source also filters the brand page, per the test in `lib/brand-kit/kit.test.ts`, so the sentence should name it once the page takes orders.
