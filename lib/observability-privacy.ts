import { isPrivatePath, isPrivateUrl } from '@/lib/privacy';

type EventShape = {
  transaction?: string;
  request?: { url?: string; data?: unknown; headers?: unknown; cookies?: unknown; query_string?: unknown };
  breadcrumbs?: unknown[];
};

/** Operational counters retain evidence; telemetry must never receive a private brief or access key. */
export function filterTelemetryEvent<T extends EventShape>(event: T): T | null {
  if (typeof window !== 'undefined' && isPrivatePath(window.location.pathname)) return null;
  if (event.request?.url && isPrivateUrl(event.request.url)) return null;
  if (event.transaction && /\/(api|studio|operations|admin|build|bootfile|result)(?:\/|\b)/.test(event.transaction)) return null;
  if (event.request) {
    const url = event.request.url ? new URL(event.request.url, 'https://bootfile.ai') : null;
    event.request = url ? { url: `${url.origin}${url.pathname}` } : {};
  }
  // Breadcrumbs can include prior navigation or form content even on a public page.
  event.breadcrumbs = [];
  return event;
}
