/**
 * Reddit Conversions API (CAPI) — server-side event tracking.
 * Pixel ID: a2_io9m8gl1e3jf
 * Requires REDDIT_CAPI_TOKEN env var (Conversion Access Token from Reddit Ads Manager).
 */

const PIXEL_ID = 'a2_io9m8gl1e3jf';
const CAPI_URL = `https://ads-api.reddit.com/api/v2.0/conversions/events/${PIXEL_ID}`;

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
 * Send a conversion event to Reddit CAPI.
 * Fire-and-forget — never blocks the user experience.
 */
export async function sendRedditEvent(event: RedditEvent): Promise<void> {
  const token = process.env.REDDIT_CAPI_TOKEN;
  if (!token) return;

  try {
    const body: Record<string, unknown> = {
      events: [
        {
          event_at: new Date().toISOString(),
          event_type: {
            tracking_type: event.eventType,
          },
          event_metadata: {
            conversion_id: event.conversionId,
            ...(event.value !== undefined && { value: event.value }),
            ...(event.currency && { currency: event.currency }),
            ...(event.itemCount !== undefined && { item_count: event.itemCount }),
          },
          user: {
            ...(event.email && { email: event.email }),
            ...(event.ipAddress && { ip_address: event.ipAddress }),
            ...(event.userAgent && { user_agent: event.userAgent }),
          },
        },
      ],
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
