import { BRAND_KIT_PRICE, buildBrandKit, FICTIONAL_BRAND_INPUT } from './kit';
import { PAID_BRAND_KIT_VERSION, type PaidBrandKit } from './synthesis';

const cta = FICTIONAL_BRAND_INPUT.callToAction;

/** A saved paid kit for the fictional sample business. No provider is involved in building it. */
export function paidBrandKitFixture(): PaidBrandKit {
  return {
    schemaVersion: PAID_BRAND_KIT_VERSION,
    price: BRAND_KIT_PRICE,
    foundation: buildBrandKit(structuredClone(FICTIONAL_BRAND_INPUT)),
    synthesis: {
      positioning: 'Juniper Home Organizing helps busy households make their kitchens easier to use.',
      voiceDo: ['Use warm, practical language.', 'Explain the next step clearly.'],
      voiceAvoid: ['Avoid guilt and invented promises.'],
      email: {
        subject: 'A practical kitchen reset with Juniper',
        preview: 'A calmer way to organize your everyday kitchen.',
        body: `Hello,\n\nJuniper Home Organizing helps busy households sort everyday kitchen spaces using the storage they already own.\n\n${cta}`,
      },
      posts: [
        { body: `Start with a practical kitchen reset from Juniper Home Organizing. ${cta}` },
        { body: `For busy households who want a kitchen that is easier to use. ${cta}` },
        { body: `Want to explore a practical kitchen reset? ${cta}` },
      ],
      sourceNotes: [{ field: 'businessName', quote: 'Juniper Home Organizing' }],
    },
    provenance: 'Model-assisted draft from customer-supplied facts; not independently verified.',
    requiresCustomerReview: true,
  };
}
