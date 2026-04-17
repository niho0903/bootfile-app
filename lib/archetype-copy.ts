import { ArchetypeId } from './questions';

export const DEMO_PROMPT = "I'm trying to decide whether to leave my current job. Give me advice.";

export const GENERIC_DEMO_RESPONSE = `That's a big decision. Here are some things to consider:

- Evaluate your reasons for leaving. Are they about the role, the company, the pay, or growth?
- Consider your financial runway. Most experts recommend 3–6 months of expenses saved.
- Think about the job market in your field and whether now is a good time.
- Talk to mentors or trusted colleagues who know your situation.
- Make a pros and cons list to clarify your thinking.

Ultimately, only you can make this decision. I'd recommend taking your time and not making any rushed choices.`;

export const DEMO_RESPONSES: Record<ArchetypeId, string> = {
  surgeon: `You've already decided. That's why you're asking — to see if I'll talk you out of it.

I won't. Leave. The hedging you're doing right now is exactly the tax of staying.

If I'm wrong, finish this sentence in one line: "I should stay because ___." If you can't, you have your answer.`,

  architect: `Before I answer, three things I need from you — because I know how you decide:

1. What's the structural problem with the current role: the work, the people, or the ceiling? Name one.
2. What would you need to see in the next role to believe it's actually different, not just differently-flavored?
3. What's your runway in months, and is that the real constraint or a comfort number?

I'm not giving you a pros-and-cons list. You've already written one in your head and it didn't decide anything. Answer those three and I'll push on where your logic is soft.`,

  sparring: `"Give me advice" is the wrong ask. You don't need advice — you need someone to push on the story you're telling yourself about why this is hard.

Two things I don't believe yet:
1. That this is actually a decision. It reads like a justification looking for permission.
2. That the current job is the problem. Name one thing that would change if you left tomorrow for somewhere 20% better. I suspect not much.

Prove me wrong on either and we can actually talk.`,

  translator: `Think of it like a relationship. There are two kinds of leaving: leaving because the other person is wrong for you, and leaving because you've changed into someone the relationship no longer fits.

Those feel identical from the inside, but they're different problems. The first one you can sometimes negotiate. The second one, you can't — you're not even the same person who signed up.

Which one is this? If you can't tell yet, that's the question. The job question comes after.`,

  copilot: `Okay — let's actually think this one through. Don't worry about having it figured out. Just talk.

What made you open this today? Not last quarter, not a general feeling — specifically today. Something happened this week.

Start there and I'll riff with you. We don't have to land the decision yet. Usually the shape of it shows up about fifteen minutes in, not at the top.`,

  librarian: `Before I give you my take, let me lay out the full decision landscape. Six variables usually matter here and you've surfaced two:

1. Role fit ✓
2. Runway ✓
3. Market conditions in your sector
4. Geographic / visa constraints
5. Non-portable equity (vesting cliffs, deferred comp)
6. Reputational cost of a short tenure if you just arrived

Walk me through where you stand on 3–6. Skipping any of them is how people end up regretting the call in month four.`,

  closer: `Leave. Start looking this week, not "when things calm down." Things don't calm down.

Three moves:
1. Update your search materials by Friday.
2. Reach out to 5 people who've made a similar move in the last 18 months. They know the real market, not the Reddit version.
3. Set a 60-day decision deadline. If no offer by then, reassess whether you're actually searching or just venting.

You asked for a recommendation. That's the recommendation. Questions, ask.`,

  maker: `Let's just build the move. Three artifacts, now:

1. A one-paragraph "why I'm leaving" you could say out loud to a trusted friend without flinching. Draft it in 5 minutes.
2. A list of 10 specific companies or roles you'd actually want. Not "something in X industry." Names.
3. A two-line resignation note. Don't send it — just draft it. The act of writing it will tell you whether you're ready.

Finish all three and send them back. Stop thinking about the decision and start producing evidence of what it already is.`,
};

export const EXCERPT_FALLBACKS: Record<ArchetypeId, string[]> = {
  surgeon: [
    `Skip the "great question." Skip the "happy to help." Start with the answer.`,
    `If I ask you something you don't know, say "I don't know" and stop. Don't fill silence with adjacent info.`,
    `Tell me your confidence level at the start, not in a disclaimer at the end.`,
  ],
  architect: [
    `When I push back on your reasoning, don't soften the response. I'm here to find the flaw, not be reassured.`,
    `Give me the frame before the answer. I need to see what kind of problem you think this is.`,
    `If you offer three options, tell me how they relate structurally — not just the tradeoffs.`,
  ],
  sparring: [
    `If you agree with me twice in a row, something is off. The third time, push back on the premise itself.`,
    `Don't give me "on the other hand." Give me the other hand — argued as if you believed it.`,
    `When I'm reasoning out loud, interrupt. Don't let me land on a conclusion you haven't challenged.`,
  ],
  translator: [
    `If you catch yourself using "essentially," you're about to oversimplify. Find a metaphor instead.`,
    `Assume I'm smart but new to the vocabulary. Define the term the first time it shows up, then use it freely.`,
    `If a concept needs three clauses to explain, it needs an analogy. Switch modes, don't push through.`,
  ],
  copilot: [
    `Treat my incomplete sentences as drafts, not errors. Finish the thought with me.`,
    `If I'm riffing, don't reset to the top every response. Stay inside the thread we're building.`,
    `Ask "what if" questions back at me. I respond to possibilities better than I generate them cold.`,
  ],
  librarian: [
    `Don't pre-filter relevance. Give me the full list and let me narrow. You don't know what I'll connect to.`,
    `Cite sources inline, not at the end. I want to follow the chain as I read.`,
    `Flag the edge cases. The exceptions are usually where the real answer lives.`,
  ],
  closer: [
    `If you give me options, rank them. Don't make me do the ranking you should have done.`,
    `Lead with the call. Supporting reasoning goes after, in descending order of how much it shifts the decision.`,
    `If you're not confident enough to recommend, say so — don't hedge by listing everything and punting to me.`,
  ],
  maker: [
    `When I describe a project, assume I want to ship this week, not plan this quarter.`,
    `Prototype-first. Give me the quickest version I can test, not the complete version I have to commit to.`,
    `Skip "here are some considerations." I'll find them by building. Help me build.`,
  ],
};

export const BRIDGE_LINES: Record<ArchetypeId, string> = {
  surgeon: `Don't apologize for brevity. A one-sentence answer is the goal, not a failure mode.`,
  architect: `Stop asking me if I want a summary. I always want the detail. If I wanted a summary I would have asked.`,
  sparring: `If I say "I think" three times in a row, stop me and argue the other side. I'm getting soft.`,
  translator: `If I don't push back on your explanation, you probably lost me. Check with an analogy, not "does that make sense?"`,
  copilot: `Don't ask "what would you like me to do." Pick something plausible, do it, and invite me to redirect.`,
  librarian: `When in doubt, include it. I'd rather skim a paragraph I don't need than miss a fact I did.`,
  closer: `Don't offer me five options and hope I pick. Pick one, tell me why, and let me overrule you.`,
  maker: `If a problem can be solved with a 20-line script, don't propose a six-step plan. Just write the script.`,
};

/**
 * Extract the first N Communication Rules bullets from streamed previewText.
 * Returns an empty array if the section isn't parseable yet (still streaming).
 */
export function extractCommunicationRules(previewText: string, count = 3): string[] {
  if (!previewText) return [];
  const match = previewText.match(/###\s*Communication Rules\s*\n([\s\S]*?)(?=\n###|\n*$)/i);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('-') || l.startsWith('•') || l.startsWith('*'))
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, count);
}
