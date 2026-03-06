export interface Post {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  body: string;
}

const posts: Post[] = [
  {
    slug: 'why-your-ai-feels-generic',
    title: 'Why Your AI Feels Generic (And What to Do About It)',
    description:
      'Most people use AI the same way — and get the same bland results. Here\'s why your AI sounds like everyone else\'s and how a BootFile changes that.',
    publishedAt: '2025-06-01',
    body: `You've probably noticed it. You ask ChatGPT or Claude a question and the answer is... fine. Technically correct. Perfectly forgettable. It reads like it was written for everyone — because it was.

The default AI experience is designed for the median user. It hedges, over-explains, adds disclaimers, and wraps every answer in a polite sandwich. For some people, that's exactly right. But if you think in systems, or prefer blunt answers, or want to be challenged instead of coddled — the default is actively working against you.

This is the gap that custom instructions were supposed to fill. But most people either skip them entirely or write something vague like "be concise" and hope for the best. That's like telling a new colleague "just be good" and expecting them to read your mind.

The problem isn't the AI. It's the lack of a shared language between you and the machine. You know how you like to think, but the AI doesn't — and it has no way to learn unless you tell it explicitly.

That's what a BootFile does. It's a structured instruction profile based on how you actually reason, make decisions, and process information. Not a personality quiz. A thinking profile that translates your cognitive style into language your AI can act on.

There are eight distinct reasoning styles — from The Surgeon who wants answers without preamble, to The Architect who needs to see the full system before making a move. Each one maps to a specific set of instructions that reshape how the AI communicates with you.

The difference is immediate. Instead of generic responses that could be for anyone, you get answers shaped around how your brain actually works. Your AI stops sounding like a customer service bot and starts sounding like a colleague who already knows how you think.

It takes two minutes to find your style. And once you paste your BootFile into your AI platform, every conversation after that is different — not because the AI got smarter, but because it finally knows who it's talking to.`,
  },
  {
    slug: 'custom-instructions-vs-bootfile',
    title: "Custom Instructions vs. BootFile: What's the Difference?",
    description:
      'Custom instructions tell AI how to format responses. A BootFile tells it how you think. Here\'s why that distinction matters.',
    publishedAt: '2025-06-08',
    body: `Every major AI platform now offers some form of custom instructions — a place where you can tell the AI about yourself and how you want it to respond. So why would you need a BootFile if you already have that?

The short answer: custom instructions are a feature. A BootFile is the content that makes the feature actually work.

Most people's custom instructions look something like this: "I'm a marketing manager. Be concise. Use bullet points." That's better than nothing, but it barely scratches the surface. It tells the AI what you do and how to format — but nothing about how you think.

A BootFile goes deeper. It captures your reasoning style — whether you prefer to see the full picture before deciding, or want the bottom line first. Whether you want the AI to push back on your ideas or just execute. Whether you process information through analogies or through structured frameworks.

These aren't preferences you'd naturally think to write down. That's why BootFile starts with a quiz. Eight carefully designed questions surface patterns in how you process information, and the result maps to one of eight reasoning archetypes.

Your BootFile then translates that archetype into platform-specific instructions. For ChatGPT, it splits into two fields. For Claude, it's a single block. For Gemini, it can be a Gem or a preference. Each format is optimized for what that platform actually supports.

The other difference is structure. Custom instructions are freeform — you're staring at a blank text box trying to figure out what to say. A BootFile gives you a complete, tested instruction set that covers communication rules, format preferences, reasoning approach, and explicit boundaries.

Think of it this way: custom instructions are the blank page. A BootFile is the document you put on it — one that was actually designed to make your AI work the way your brain does.`,
  },
  {
    slug: 'get-more-from-every-ai-conversation',
    title: 'How to Get More Out of Every AI Conversation',
    description:
      'Small changes to how you set up your AI can dramatically improve every interaction. Here are the highest-leverage moves.',
    publishedAt: '2025-06-15',
    body: `Most people treat every AI conversation like a fresh start. They open a new chat, type a question, get an answer, and move on. The AI has no memory of what worked last time, no understanding of their preferences, and no context about how they like to think.

This is like hiring a brilliant assistant and never telling them anything about you. They'll do competent work, but they'll never be great — because they're guessing about your preferences every single time.

Here are the highest-leverage changes you can make.

First, set up persistent instructions. Every major platform supports them — ChatGPT calls them Custom Instructions, Claude calls them Profile settings, Gemini uses Gems and Preferences. These persist across conversations so you don't start from zero each time.

Second, tell the AI how you think, not just what you do. "I'm a software engineer" is less useful than "I think in systems and want to understand how pieces connect before I make decisions." The first tells AI your job title. The second tells it how to reason with you.

Third, set explicit boundaries. Tell the AI what you never want — excessive caveats, unprompted disclaimers, restating your question back to you. Most AI defaults are cautious and verbose. If that's not your style, say so upfront.

Fourth, specify your preferred format. Do you want bullet points or paragraphs? Do you want the recommendation first or the reasoning first? Do you want analogies or technical precision? These small signals have outsized impact on response quality.

Fifth, match your instructions to the platform. ChatGPT and Grok use two-field formats. Claude uses a single block. Gemini supports Gems for detailed instructions. What works on one platform may not translate directly to another.

If figuring all this out sounds like a lot of work — that's exactly why BootFile exists. A two-minute quiz identifies your reasoning style and generates platform-specific instructions automatically. It handles the structure so you can focus on the conversation.`,
  },
];

export function getAllPosts(): Post[] {
  return posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
