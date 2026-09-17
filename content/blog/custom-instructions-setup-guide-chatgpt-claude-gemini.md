---
title: "Custom Instructions Setup Guide: ChatGPT, Claude & Gemini Compared"
description: "Multi-AI comparison fills gap for beginners; positions bootfile.ai as cross-platform authority on personalization"
publishedAt: "2026-09-17"
target_query: "how to set up custom instructions for ChatGPT Claude and Gemini"
pillar: "education"
author: "librarian"
meta_title: "Custom Instructions Setup Guide: ChatGPT, Claude & Gemini Compared"
meta_description: "Multi-AI comparison fills gap for beginners; positions bootfile.ai as cross-platform authority on personalization"
---

# Custom Instructions Setup Guide: ChatGPT, Claude & Gemini Compared

There is a particular kind of frustration that comes from explaining the same thing twice. You know the feeling — you've just spent three minutes giving an AI assistant your professional context, your preferred output format, the fact that you don't want bullet points unless you specifically ask for them, and then you open a new conversation and the model greets you like a stranger. Everything you said, gone. You start over.

Custom instructions exist to solve this problem. All three major AI platforms — ChatGPT, Claude, and Gemini — now offer some form of persistent personalization that survives across conversations. But they implement the idea quite differently, with different levels of flexibility, different constraints, and different philosophies about what "knowing you" actually means. This guide walks through how to set up custom instructions on each platform, where they succeed, and where each one falls short — so you can make an informed decision about how to configure them, and what to realistically expect.

---

## What Custom Instructions Actually Do (and Don't Do)

Before comparing implementations, it's worth being precise about what we're talking about. Custom instructions are persistent context that gets prepended to your conversations automatically. They're not memory in the human sense — the model doesn't accumulate impressions of you over time (unless memory features are separately enabled). They're more like a standing brief you hand to a contractor at the start of every job.

This distinction matters because it shapes what belongs in custom instructions versus what doesn't. Static facts about yourself — your profession, your expertise level, your preferred response style, your name — are excellent candidates. Dynamic context — the specific project you're working on this week, the deadline you're under — probably doesn't belong there, because it will be stale by next month and could actively mislead the model.

There's also a ceiling effect worth acknowledging. Custom instructions improve consistency and reduce repetitive setup friction. They don't fundamentally change the model's capabilities, and they won't compensate for vague prompting. A well-configured instruction set alongside a poorly-framed question still produces a mediocre answer. Think of custom instructions as reducing overhead, not replacing skill.

---

## How to Set Up Custom Instructions in ChatGPT

ChatGPT's implementation is the oldest of the three and the most explicitly structured. You'll find the option by clicking your profile icon in the lower left of the interface, then selecting **"Customize ChatGPT"** (previously called "Custom Instructions").

You're presented with two text fields:

1. **What would you like ChatGPT to know about you?** — Background information, professional context, preferences.
2. **How would you like ChatGPT to respond?** — Format preferences, tone, verbosity, what to avoid.

Each field has a 1,500-character limit, which is both a constraint and a useful forcing function. You can't be vague and long at the same time — if you want to use the space well, you have to be specific.

A concrete example of effective ChatGPT custom instructions in the first field: *"I'm a UX researcher with 8 years of experience. I work primarily in B2B SaaS. I'm familiar with standard statistical concepts and don't need them explained from scratch."* In the second field: *"Lead with your conclusion. Use plain prose unless I ask for lists. If you're uncertain, say so rather than hedging with filler phrases."*

A few important caveats: Custom instructions apply to all conversations by default, but you can toggle them off for a specific chat using the same settings menu. Also, if you use Projects (ChatGPT's newer organizational feature), project-level instructions take precedence over global custom instructions — useful to know if you're wondering why your preferences seem to be ignored in certain contexts.

---

## How to Set Up Custom Instructions (Memory) in Claude

Claude handles personalization differently, and it's worth being honest that the terminology is less clean here. Anthropic uses the word "memory" rather than "custom instructions," and the implementation varies depending on whether you're using Claude.ai directly, the mobile app, or the API.

On Claude.ai, go to **Settings → Memory** to find the feature. Claude can save memories automatically as you converse — it will extract facts it thinks are relevant and store them — or you can add memories manually. You can also view and delete stored memories, which gives you more control than you might expect.

The practical setup approach for people who want explicit control: disable automatic memory-saving initially, then manually add the facts you want Claude to retain. Something like: *"Profession: software engineer, primarily backend, Python and Go. Prefers concise answers. Works in a regulated industry (fintech), so accuracy and caveats matter."*

The notable difference from ChatGPT here is flexibility without explicit structure. There are no separate "about you" and "response format" fields — it's a freeform list of stored facts. This is either freeing or disorienting depending on how you think. The lack of a character limit per entry means you can be more expansive, but it also means there's no structural guardrail pushing you toward specificity.

One important edge case: if you're using Claude through a third-party integration or the API, Memory as Claude.ai implements it likely won't carry over. The feature is tied to the Claude.ai product, not the underlying model.

---

## How to Set Up Custom Instructions in Gemini

Gemini's approach sits somewhere between ChatGPT's structured fields and Claude's freeform memory. In **Gemini Advanced** (the paid tier), go to **Settings → Personalization** to find custom instructions. The free tier of Gemini does not include persistent custom instructions in the same way, which is a meaningful practical limitation worth knowing upfront.

The interface offers a single text field for your instructions, with a character limit that's more generous than ChatGPT's but similarly encourages concision. What Gemini does that the others don't — at least by default — is more aggressive integration with your Google account context: your location, your history with other Google products, and so on. Depending on your privacy preferences, this is either a feature or a concern.

A concrete example of what to put in Gemini's custom instruction field: *"I'm a high school science teacher. I often need to explain concepts at a 10th-grade level. I prefer examples drawn from everyday life rather than technical analogies. My default format preference is prose, not bullet points."*

The gotcha with Gemini is workspace versus personal accounts. If you're using Gemini through a Google Workspace account (a work or school account), your administrator controls whether personalization features are available at all. Many enterprise accounts have these features locked or limited. Check with your IT team before assuming the feature is available.

---

## Side-by-Side Comparison: What to Know Before You Configure

For anyone trying to decide how to invest their setup time, here's the honest summary:

**Consistency and predictability**: ChatGPT's two-field structure produces the most consistent results in practice. The explicit separation of "about me" and "response preferences" mirrors how prompts tend to be organized, and the model applies them reliably.

**Flexibility and depth**: Claude's memory system allows for more granular, iteratively-built context over time — if you're willing to manage it manually. It's more powerful in theory but requires more maintenance.

**Ecosystem integration**: Gemini's strength is its connection to Google's broader context — useful if you're working across Docs, Gmail, and Calendar. But this only becomes relevant if you're on Gemini Advanced and using it within that ecosystem.

**Platform agnosticism**: None of these systems talk to each other. Instructions you've carefully crafted in ChatGPT don't exist in Claude, and vice versa. If you move between platforms — which many people do, depending on the task — you're maintaining parallel instruction sets, each with their own syntax and limitations.

That last point is where most guides stop. But it's arguably the most important one for anyone who uses AI tools seriously: the configuration work doesn't compound across platforms. It's not a one-time investment. It's ongoing maintenance per tool.

---

## A Note on What BootFile Is Doing Here

The problem of rebuilding your context every time you switch platforms, or every time an interface changes, is exactly what BootFile is designed to address. Rather than asking you to figure out what to tell each AI tool about yourself, BootFile creates a personalized instruction profile — based on how you actually think and work — that you can carry with you. If you're curious how your profile would be characterized across different AI platforms, the quiz at [bootfile.ai/quiz](https://bootfile.ai/quiz) is a reasonable place to start. It takes about five minutes and produces something more specific than most people manage to write for themselves.

The setup work described in this guide is genuinely worth doing. It reduces friction, improves output quality, and makes AI tools feel less like talking to a stranger every time. But knowing what to write — and writing it well — is its own skill, and one that most users underinvest in. Hopefully this comparison helps close some of that gap.
