export interface Guide {
  platform: string;
  platformName: string;
  title: string;
  description: string;
  updatedAt: string;
  intro: string;
  steps: { title: string; text: string }[];
  tips: string[];
  ctaText: string;
}

const guides: Guide[] = [
  {
    platform: 'chatgpt',
    platformName: 'ChatGPT',
    title: 'How to Add Custom Instructions to ChatGPT',
    description:
      'Step-by-step guide to setting up your BootFile in ChatGPT\'s Custom Instructions so every conversation matches your thinking style.',
    updatedAt: '2025-06-01',
    intro:
      'ChatGPT\'s Custom Instructions feature lets you set persistent context that applies to every new conversation. Instead of repeating your preferences each time, your BootFile sits in the background and shapes how ChatGPT responds automatically.',
    steps: [
      {
        title: 'Open ChatGPT Settings',
        text: 'Go to chatgpt.com and click your profile icon in the bottom-left corner. Select "Settings" from the menu.',
      },
      {
        title: 'Navigate to Custom Instructions',
        text: 'Click "Personalization" in the left sidebar, then click "Custom Instructions." You\'ll see two text fields.',
      },
      {
        title: 'Paste Field 1: About You',
        text: 'Copy the first section of your BootFile (your reasoning profile and thinking style) and paste it into "What would you like ChatGPT to know about you?"',
      },
      {
        title: 'Paste Field 2: Response Preferences',
        text: 'Copy the second section (communication rules, format preferences, and boundaries) and paste it into "How would you like ChatGPT to respond?"',
      },
      {
        title: 'Save and Test',
        text: 'Click "Save." Open a new conversation and ask a question you\'d normally ask. Notice how the response style matches your thinking preferences right from the first message.',
      },
    ],
    tips: [
      'Custom Instructions apply to all new conversations automatically. You don\'t need to paste them each time.',
      'If a response feels off, you can always override in-conversation by saying "be more direct" or "give me more detail."',
      'BootFile formats your instructions specifically for ChatGPT\'s two-field layout so nothing important gets cut.',
      'Free and Plus accounts both support Custom Instructions. No upgrade required.',
    ],
    ctaText: 'Get your ChatGPT-ready BootFile',
  },
  {
    platform: 'claude',
    platformName: 'Claude',
    title: 'How to Add Custom Instructions to Claude',
    description:
      'Step-by-step guide to setting up your BootFile in Claude\'s Profile settings for personalized AI conversations.',
    updatedAt: '2025-06-01',
    intro:
      'Claude supports persistent custom instructions through its Profile settings. Once you add your BootFile, Claude will follow your reasoning preferences in every conversation without you needing to repeat yourself.',
    steps: [
      {
        title: 'Open Claude Settings',
        text: 'Go to claude.ai and click your profile icon in the bottom-left corner. Select "Settings" from the dropdown menu.',
      },
      {
        title: 'Find the Profile Section',
        text: 'In Settings, click "Profile." You\'ll see a "Custom Instructions" text area where you can add persistent context.',
      },
      {
        title: 'Paste Your BootFile',
        text: 'Copy your full BootFile text and paste it into the Custom Instructions field. Claude uses a single-block format, so your entire instruction set goes in one place.',
      },
      {
        title: 'Save and Test',
        text: 'Click "Save." Start a new conversation and notice how Claude\'s responses align with your thinking style: more direct, more structured, or more collaborative depending on your archetype.',
      },
    ],
    tips: [
      'Claude\'s single-field format means your BootFile can be more detailed than platforms with character limits.',
      'Claude is particularly responsive to reasoning-style instructions. It adapts well to "push back on my ideas" or "lead with the answer" directives.',
      'Instructions persist across conversations but you can override them anytime by explicitly asking Claude to respond differently.',
      'Both Free and Pro accounts support custom instructions.',
    ],
    ctaText: 'Get your Claude-ready BootFile',
  },
  {
    platform: 'gemini',
    platformName: 'Gemini',
    title: 'How to Add Custom Instructions to Google Gemini',
    description:
      'Step-by-step guide to setting up your BootFile in Gemini using Gems or Preferences for tailored AI responses.',
    updatedAt: '2025-06-01',
    intro:
      'Google Gemini offers two ways to personalize your experience: Gems (detailed custom personas) and Preferences (lighter-weight settings). Your BootFile works with both, so choose the option that fits your workflow.',
    steps: [
      {
        title: 'Choose Your Setup Method',
        text: 'Decide between creating a Gem (full BootFile as a reusable persona) or using Preferences (condensed version that applies everywhere). Gems are more powerful; Preferences are more convenient.',
      },
      {
        title: 'Option A: Create a Gem',
        text: 'Go to gemini.google.com, open Settings, then Extensions, and select "Create a Gem." Paste your full BootFile as the Gem\'s instructions. Give it a name like "My Thinking Style" and save.',
      },
      {
        title: 'Option B: Set Preferences',
        text: 'Go to Settings, then Preferences. Paste the condensed version of your BootFile into the preferences field. This applies lighter-weight instructions to all conversations.',
      },
      {
        title: 'Test Your Setup',
        text: 'Start a new conversation (or activate your Gem) and ask a question. Compare the response to what you\'d normally get. You should notice the AI adapting to your reasoning style.',
      },
    ],
    tips: [
      'Gems give you the full BootFile experience with no compromises on instruction length.',
      'Preferences are best when you want subtle adjustments across all conversations without activating a specific Gem.',
      'Your BootFile includes both formats: full for Gems and condensed for Preferences.',
      'Gemini Advanced users get the most benefit from Gems, but Preferences work on all tiers.',
    ],
    ctaText: 'Get your Gemini-ready BootFile',
  },
  {
    platform: 'grok',
    platformName: 'Grok',
    title: 'How to Add Custom Instructions to Grok',
    description:
      'Step-by-step guide to setting up your BootFile in Grok\'s Personalization settings on X (formerly Twitter).',
    updatedAt: '2025-06-01',
    intro:
      'Grok supports personalized instructions through its Personalization settings. Like ChatGPT, it uses a two-field format: one for context about you and one for response preferences. Your BootFile is pre-formatted for both fields.',
    steps: [
      {
        title: 'Open Grok Settings',
        text: 'Go to grok.com and click your profile icon. Select "Settings" from the menu.',
      },
      {
        title: 'Navigate to Personalization',
        text: 'Find the "Personalization" section in Settings. You\'ll see two text fields: "About You" and response preferences.',
      },
      {
        title: 'Paste Field 1: About You',
        text: 'Copy the first section of your BootFile (reasoning profile and thinking style) and paste it into the "About You" field.',
      },
      {
        title: 'Paste Field 2: Response Preferences',
        text: 'Copy the second section (communication rules and boundaries) and paste it into the response preferences field.',
      },
      {
        title: 'Save and Test',
        text: 'Save your settings and start a new conversation. Grok will now respond according to your thinking style preferences.',
      },
    ],
    tips: [
      'Grok uses the same two-field layout as ChatGPT, so your BootFile formats instructions the same way for both.',
      'Personalization settings persist across all your Grok conversations.',
      'Grok tends to have a more casual tone by default. Your BootFile can either lean into that or override it depending on your archetype.',
      'Premium and Premium+ users both have access to personalization features.',
    ],
    ctaText: 'Get your Grok-ready BootFile',
  },
  {
    platform: 'deepseek',
    platformName: 'DeepSeek',
    title: 'How to Set Up Custom Instructions in DeepSeek',
    description:
      'Step-by-step guide to using your BootFile with DeepSeek by pasting it as a conversation primer.',
    updatedAt: '2025-06-01',
    intro:
      'DeepSeek doesn\'t have a dedicated custom instructions feature yet, but you can achieve the same effect by pasting your BootFile as the first message in a new conversation. DeepSeek will acknowledge your preferences and apply them throughout the chat.',
    steps: [
      {
        title: 'Open DeepSeek',
        text: 'Go to chat.deepseek.com and start a new conversation.',
      },
      {
        title: 'Paste Your BootFile',
        text: 'Copy your full BootFile instruction block and paste it as your first message. It\'s pre-formatted with a system instruction header that DeepSeek recognizes.',
      },
      {
        title: 'Wait for Acknowledgment',
        text: 'DeepSeek will read your instructions and confirm it understands your preferences. It will then apply them to all responses in the conversation.',
      },
      {
        title: 'Start Your Conversation',
        text: 'Ask your questions normally. DeepSeek will respond according to your reasoning style preferences for the rest of the conversation.',
      },
    ],
    tips: [
      'Since DeepSeek doesn\'t have persistent instructions, you\'ll need to paste your BootFile at the start of each new conversation.',
      'Your BootFile includes a special system instruction format that DeepSeek responds well to.',
      'For best results, wait for DeepSeek to confirm it has read your instructions before asking your first real question.',
      'DeepSeek\'s reasoning mode (DeepThink) works especially well with BootFile instructions about thinking style.',
    ],
    ctaText: 'Get your DeepSeek-ready BootFile',
  },
  {
    platform: 'copilot',
    platformName: 'Microsoft Copilot',
    title: 'How to Add Custom Instructions to Microsoft Copilot',
    description:
      'Step-by-step guide to setting up your BootFile in Microsoft Copilot\'s Personalization settings.',
    updatedAt: '2025-06-01',
    intro:
      'Microsoft Copilot supports custom instructions through its Personalization settings. Your BootFile is formatted as a single condensed block optimized for Copilot\'s instruction field.',
    steps: [
      {
        title: 'Open Copilot Settings',
        text: 'Go to copilot.microsoft.com and click on your profile icon in the top-right corner. Select "Settings" from the dropdown.',
      },
      {
        title: 'Find Personalization',
        text: 'Navigate to the "Personalization" section in Settings. You\'ll see a custom instructions text area.',
      },
      {
        title: 'Paste Your BootFile',
        text: 'Copy your Copilot-formatted BootFile and paste it into the custom instructions field. It\'s been condensed to fit Copilot\'s character limits while preserving your core reasoning preferences.',
      },
      {
        title: 'Save and Test',
        text: 'Click "Save" and open a new conversation. Copilot will now respond according to your thinking style, whether that\'s more direct, more detailed, or more collaborative.',
      },
    ],
    tips: [
      'Copilot\'s instruction field has tighter character limits than some platforms, so your BootFile is pre-condensed.',
      'Instructions apply across Copilot experiences including chat and integrated Microsoft 365 features.',
      'If you use Copilot in Edge, your instructions will carry over to the sidebar chat as well.',
      'Both free and Pro users can set custom instructions.',
    ],
    ctaText: 'Get your Copilot-ready BootFile',
  },
];

export function getAllGuides(): Guide[] {
  return guides;
}

export function getGuideByPlatform(platform: string): Guide | undefined {
  return guides.find((g) => g.platform === platform);
}
