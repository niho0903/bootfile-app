import { describe, expect, it } from 'vitest';
import { isPrivatePath, isPublicAnalyticsPath } from './privacy';
import { filterTelemetryEvent } from './observability-privacy';

describe('private order telemetry boundaries', () => {
  it.each(['/studio', '/studio/order/private-id', '/operations', '/admin', '/build/success', '/api/studio/orders'])('excludes %s', path => {
    expect(isPublicAnalyticsPath(path)).toBe(false);
    expect(isPrivatePath(path)).toBe(true);
    expect(filterTelemetryEvent({ request: { url: `https://bootfile.ai${path}#secret` } })).toBeNull();
  });
  it('allows the fictional sample and informational pages', () => {
    expect(isPublicAnalyticsPath('/studio/sample')).toBe(true);
    expect(isPublicAnalyticsPath('/blog/how-to-write-a-brief')).toBe(true);
  });
  it('removes URL tokens, request content, and prior navigation from public error reports', () => {
    const result = filterTelemetryEvent({ request: { url: 'https://bootfile.ai/?token=private#access', data: 'brief', headers: { Authorization: 'private' } }, breadcrumbs: ['private route'] });
    expect(result).toEqual({ request: { url: 'https://bootfile.ai/' }, breadcrumbs: [] });
  });
});
