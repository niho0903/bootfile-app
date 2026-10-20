import * as Sentry from '@sentry/nextjs';
import { filterTelemetryEvent } from '@/lib/observability-privacy';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
  sendDefaultPii: false,
  beforeSend: filterTelemetryEvent,
  beforeSendTransaction: filterTelemetryEvent,
});
