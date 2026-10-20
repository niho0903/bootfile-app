import { assembleStudioBundle } from './bundle';
import type { StudioDraft, StudioIntake } from './types';

/** Fictional example, never used as a fallback for a paid order. No network calls. */
export const STUDIO_DEMO_INTAKE: StudioIntake = {
  businessName: 'Juniper Home Organizing',
  businessDescription: 'A fictional independent home organizing business helping people create practical systems for everyday spaces.',
  audience: 'Busy households who want a calmer, easier-to-use kitchen.',
  offer: 'A kitchen reset session that helps a household sort the space and choose a practical place for everyday items.',
  goal: 'Invite interested households to ask about a kitchen reset.',
  approvedFacts: 'The session focuses on sorting kitchen items and arranging everyday essentials. We work with the storage customers already have. Pricing and availability are discussed before booking.',
  callToAction: 'Reply KITCHEN to ask about a kitchen reset.',
  voiceSample: 'A home can work for you without looking like a showroom. Let us start with the cupboard you open every day.',
  constraints: 'Do not invent a price, discount, duration, testimonial, or promise of a particular result. Use a warm, practical tone.',
  email: 'sample@example.com',
  platform: 'chatgpt',
  acceptedTerms: true,
};

const sampleDraft: StudioDraft = {
  email: {
    subject: 'Could your kitchen work a little better for you?',
    previewText: 'Start with the everyday essentials and the storage you already have.',
    body: 'Hello,\n\nIf your kitchen feels harder to use than it needs to, we can start with the items you reach for every day.\n\nJuniper Home Organizing offers a kitchen reset session: a chance to sort kitchen items and choose a practical place for everyday essentials, using the storage you already have.\n\nThere is no need to aim for a showroom. The starting point is your household and how you use the space. We will discuss pricing and availability before you decide whether to book.\n\nReply KITCHEN to ask about a kitchen reset.\n\nJuniper Home Organizing',
  },
  socialPosts: [
    { label: 'Introduce the offer', body: 'Which kitchen cupboard do you open most often? It can be a useful place to start. A kitchen reset with Juniper Home Organizing focuses on sorting kitchen items and arranging everyday essentials with the storage you already have. Reply KITCHEN to ask about a kitchen reset.' },
    { label: 'Explain the fit', body: 'A kitchen does not have to look like a showroom to work for your household. If you would like help deciding what goes where, our kitchen reset starts with your everyday items and existing storage. Pricing and availability are discussed before booking. Reply KITCHEN to ask about a kitchen reset.' },
    { label: 'Invite the next step', body: 'Thinking about a kitchen reset, but unsure where to begin? Tell Juniper Home Organizing which part of the kitchen feels hardest to use. We can talk about the sorting and organizing session, including pricing and availability, before you decide. Reply KITCHEN to ask about a kitchen reset.' },
  ],
  sourceNotes: [
    { field: 'approvedFacts', quote: 'We work with the storage customers already have.' },
    { field: 'approvedFacts', quote: 'Pricing and availability are discussed before booking.' },
    { field: 'callToAction', quote: 'Reply KITCHEN to ask about a kitchen reset.' },
  ],
};

export const STUDIO_DEMO_BUNDLE = assembleStudioBundle(STUDIO_DEMO_INTAKE, sampleDraft);
