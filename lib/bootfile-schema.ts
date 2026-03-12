/**
 * BootFile Structured Data Schema v1.0
 *
 * Machine-readable JSON representation of a BootFile.
 * Generated alongside the human-readable text via post-generation extraction.
 * Stored in Supabase (JSONB) and localStorage for future use.
 *
 * NOT shown to users in v1 — this is infrastructure for:
 * - Portable .bootfile format / import-export
 * - API endpoint (bootfile.ai/api/profile/{id})
 * - Aggregate research queries
 * - Open spec foundation
 *
 * Schema is versioned from day one. Never remove or rename fields —
 * only add new ones. Old profiles can always be migrated forward.
 */

export interface BootFileStructured {
  bootfile_version: '1.0';
  generated_at: string; // ISO 8601
  platform_agnostic: true;

  identity: {
    archetype_primary: string;
    archetype_secondary: string | null;
    archetype_tertiary: string | null;
    archetype_lowest: string[];
    score_distribution: Record<string, number>;
  };

  context: {
    domain: string;
    domain_specific: string | null;
    technical_level: number;
    primary_use: string;
    seniority_signal: string | null;
  };

  cognition: {
    decision_style: string;
    reasoning_posture: string;
    response_length_preference: string;
    traits: string[];
  };

  reasoning_frameworks: Array<{
    name: string;
    instruction: string;
  }>;

  communication: {
    rules: string[];
    format_preferences: {
      default_structure: string;
      use_bullets_for: string;
      use_tables_for: string;
      emphasis: string;
    };
  };

  failure_conditions: string[];

  prohibitions: string[];

  avoidances: {
    phrases: string[];
    formatting: string[];
    patterns: string[];
  };

  pet_peeves: string[];
}

/**
 * Builds the extraction prompt that converts human-readable BootFile text
 * into structured JSON following the v1.0 schema.
 */
export function buildExtractionPrompt(bootfileText: string, inputs: {
  primaryArchetype: string;
  secondaryArchetype: string | null;
  tertiaryArchetype: string | null;
  lowestArchetypes: string[];
  allScores: Record<string, number>;
  domain: string;
  domainOther?: string;
  technicalLevel: number;
  primaryUses: string[];
  decisionStyle: string;
  responseLength: string;
  petPeeves: string[];
  customAvoidances: string;
}): { systemPrompt: string; userMessage: string } {
  const domainDisplay = inputs.domain === 'Other' && inputs.domainOther
    ? inputs.domainOther
    : inputs.domain;

  const systemPrompt = `You are a structured data extraction specialist. Your task is to convert a human-readable BootFile (AI instruction profile) into a machine-readable JSON object following the bootfile v1.0 schema.

Return ONLY valid JSON. No markdown fencing, no explanation, no other text.

The JSON schema:
{
  "bootfile_version": "1.0",
  "generated_at": "<ISO 8601 timestamp>",
  "platform_agnostic": true,
  "identity": {
    "archetype_primary": "<string>",
    "archetype_secondary": "<string|null>",
    "archetype_tertiary": "<string|null>",
    "archetype_lowest": ["<string>"],
    "score_distribution": { "<archetype>": <number> }
  },
  "context": {
    "domain": "<string>",
    "domain_specific": "<string|null - specific role/focus extracted from About Me>",
    "technical_level": <1-10>,
    "primary_use": "<string>",
    "seniority_signal": "<string|null - junior/mid/senior/executive inferred from text>"
  },
  "cognition": {
    "decision_style": "<convergent|analytical|adversarial|generative>",
    "reasoning_posture": "<string - brief description of reasoning approach>",
    "response_length_preference": "<short|medium|long>",
    "traits": ["<string - each bullet from How I Think section>"]
  },
  "reasoning_frameworks": [
    { "name": "<snake_case_name>", "instruction": "<the reasoning rule>" }
  ],
  "communication": {
    "rules": ["<each rule from Communication Rules>"],
    "format_preferences": {
      "default_structure": "<paragraphs|bullets|mixed>",
      "use_bullets_for": "<when to use bullets>",
      "use_tables_for": "<when to use tables>",
      "emphasis": "<how to emphasize key points>"
    }
  },
  "failure_conditions": ["<each condition from Failure Detection>"],
  "prohibitions": ["<each rule from Never Do This>"],
  "avoidances": {
    "phrases": ["<specific phrases to avoid>"],
    "formatting": ["<formatting patterns to avoid>"],
    "patterns": ["<behavioral patterns to avoid>"]
  },
  "pet_peeves": ["<inferred from failure conditions and prohibitions>"]
}

Rules:
- Extract reasoning_frameworks from "How to Reason With Me" — give each a descriptive snake_case name
- Extract communication rules as discrete, individual items
- Extract failure_conditions from "Failure Detection" section
- Extract prohibitions from "Never Do This" section
- Infer avoidances from the overall text (phrases, formatting, patterns the user dislikes)
- Infer pet_peeves from failure conditions and prohibitions
- Use the provided metadata (archetypes, scores, domain, etc.) for the identity and context sections
- If a field cannot be determined, use null for nullable fields or empty arrays for array fields`;

  const userMessage = `Extract structured data from this BootFile.

## Metadata (use directly — do not infer these from text)
PRIMARY_ARCHETYPE: ${inputs.primaryArchetype}
SECONDARY_ARCHETYPE: ${inputs.secondaryArchetype ?? 'null'}
TERTIARY_ARCHETYPE: ${inputs.tertiaryArchetype ?? 'null'}
LOWEST_ARCHETYPES: ${inputs.lowestArchetypes.join(', ')}
SCORE_DISTRIBUTION: ${JSON.stringify(inputs.allScores)}
DOMAIN: ${domainDisplay}
TECHNICAL_LEVEL: ${inputs.technicalLevel}
PRIMARY_USES: ${inputs.primaryUses.join(', ')}
DECISION_STYLE: ${inputs.decisionStyle}
RESPONSE_LENGTH: ${inputs.responseLength}
PET_PEEVES: ${inputs.petPeeves.join(', ')}
CUSTOM_AVOIDANCES: ${inputs.customAvoidances || '(none)'}

## BootFile Text

${bootfileText}`;

  return { systemPrompt, userMessage };
}
