import { StudioError } from './errors';

export const STUDIO_MAX_ATTEMPTS = 3;
export const STUDIO_MODEL_TIMEOUT_MS = 65_000;
export const STUDIO_MAX_OUTPUT_TOKENS = 4000;
export const STUDIO_ALLOWED_MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'] as const;

export function studioModel(): string {
  const model = process.env.STUDIO_MODEL || STUDIO_ALLOWED_MODELS[0];
  if (!STUDIO_ALLOWED_MODELS.includes(model as (typeof STUDIO_ALLOWED_MODELS)[number])) {
    throw new StudioError('model_not_allowed', 'The setup service is being configured.');
  }
  return model;
}

export function studioDailyGenerationLimit(): number {
  const value = Number(process.env.STUDIO_MAX_GENERATIONS_PER_DAY || '20');
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : 20;
}

export function studioBaseUrl(): string {
  const value = process.env.STUDIO_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://bootfile.ai';
  try {
    const url = new URL(value);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
    return url.origin;
  } catch {
    throw new StudioError('invalid_base_url', 'The setup service is being configured.');
  }
}

export function studioConfigurationIssues(): string[] {
  const issues: string[] = [];
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'CRON_SECRET']) {
    if (!process.env[key]) issues.push(key);
  }
  if ((process.env.STUDIO_ACCESS_TOKEN_SECRET || '').length < 32) issues.push('STUDIO_ACCESS_TOKEN_SECRET');
  if (process.env.STUDIO_FULFILLMENT_ENABLED !== 'true') issues.push('STUDIO_FULFILLMENT_ENABLED');
  try { studioModel(); } catch { issues.push('STUDIO_MODEL'); }
  try { studioBaseUrl(); } catch { issues.push('STUDIO_BASE_URL'); }
  return issues;
}

export function assertStudioCheckoutConfigured(): void {
  if (process.env.STUDIO_CHECKOUT_ENABLED !== 'true' || studioConfigurationIssues().length) {
    throw new StudioError('checkout_unavailable', 'Paid setups are not open yet. You can explore the sample while we finish testing.');
  }
}

export function assertStudioWorkerConfigured(): void {
  if (process.env.STUDIO_FULFILLMENT_ENABLED !== 'true') throw new StudioError('fulfillment_paused', 'Fulfillment is paused.');
  if (!process.env.ANTHROPIC_API_KEY || !process.env.RESEND_API_KEY || (process.env.STUDIO_ACCESS_TOKEN_SECRET || '').length < 32) {
    throw new StudioError('fulfillment_configuration_missing', 'Fulfillment configuration is incomplete.');
  }
  studioModel();
  studioBaseUrl();
}
