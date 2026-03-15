/**
 * Reddit Conversions API (CAPI) v3 — server-side event tracking.
 * Pixel ID: a2_io9m8gl1e3jf
 * Requires REDDIT_CAPI_TOKEN env var (Conversion Access Token from Reddit Ads Manager).
 */

const PIXEL_ID = 'a2_io9m8gl1e3jf';
const CAPI_URL = `https://ads-api.reddit.com/api/v3/pixels/${PIXEL_ID}/conversion_events`;

interface RedditEvent {
  eventType: 'Lead' | 'Purchase' | 'SignUp' | 'ViewContent';
  conversionId: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  value?: number;
  currency?: string;
  itemCount?: number;
}

/**
 * Send a conversion event to Reddit CAPI v3.
 * Fire-and-forget — never blocks the user experience.
 */
export async function sendRedditEvent(event: RedditEvent): Promise<void> {
  const token = process.env.REDDIT_CAPI_TOKEN;
  if (!token) return;

  try {
    const eventPayload: Record<string, unknown> = {
      event_at: Date.now(),
      action_source: 'web',
      type: {
        tracking_type: event.eventType,
      },
      metadata: {
        conversion_id: event.conversionId,
        ...(event.value !== undefined && { value: event.value }),
        ...(event.currency && { currency: event.currency }),
        ...(event.itemCount !== undefined && { item_count: event.itemCount }),
      },
    };

    // Match keys for attribution
    const user: Record<string, string> = {};
    if (event.email) user.email = event.email;
    if (event.ipAddress) user.ip_address = event.ipAddress;
    if (event.userAgent) user.user_agent = event.userAgent;
    if (Object.keys(user).length > 0) {
      eventPayload.user = user;
    }

    const body = {
      data: {
        events: [eventPayload],
      },
    };

    await fetch(CAPI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[REDDIT CAPI ERROR]', err);
  }
}
