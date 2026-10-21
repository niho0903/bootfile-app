# Bootfile AI setup guidance: source record

Checked 2026-10-21 against official provider instructions. The paid pack is a portable text setup; it does not connect to, change, or publish from a customer's AI account. A normal conversation works as a fallback on every supported platform, so an unavailable or renamed saved-workspace feature cannot prevent reuse.

## ChatGPT

Official guidance: https://help.openai.com/en/articles/10169521-projects-in-chatgpt

Projects support project-specific instructions under the project menu's **Project settings**, and signed-in users can organize repeated tasks there. A customer can instead paste the reusable context into a standard new chat. Project instructions are preferable to global custom instructions for one business's marketing context.

## Claude

Official guidance: https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects

Projects support **Set project instructions** and a project knowledge area. Free accounts can create a limited number of projects. Project instructions apply to chats within that project; do not suggest Claude automatically transfers unsaved facts from earlier unrelated chats.

## Gemini

Official guidance: https://support.google.com/gemini/answer/15146780?hl=en

At this check Gemini's saved custom instructions are provided through **Gems**. The official help page announces a transition of Gems to **skills** on personal Google accounts beginning in November 2026. Avoid hardcoding a mandatory Gem UI workflow or promising an exact menu name after that change. The first-choice instruction remains an ordinary new Gemini chat, with optional saved instructions where available.

## Maintenance policy

If provider menus or entitlements change, refresh this document from official sources and update `lib/studio/bundle.ts` setup steps. Do not change the fixed $49 offer, collect user login credentials, claim native-project persistence as guaranteed, or infer that a customer actually followed the steps. The built-in review checklist and plain-text backup remain mandatory.
