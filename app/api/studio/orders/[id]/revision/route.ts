import { after } from 'next/server';
import { bearerStudioToken } from '@/lib/studio/access';
import { requireStudioOrderAccess } from '@/lib/studio/db';
import { StudioError, studioErrorCode } from '@/lib/studio/errors';
import { readStudioText, studioErrorResponse, studioJson } from '@/lib/studio/http';
import { assertStudioRevisionsEnabled, requestStudioRevision, studioRevisionDraft } from '@/lib/studio/revisions';
import { runStudioWorker } from '@/lib/studio/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/**
 * The one revision a paid Brand & AI Kit order may use. Closed by default: while the flag is off
 * nothing is read from the request and no order is looked up.
 */

/** The customer's own answers, to edit. Private notes included, so only on an explicit request with the private link. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertStudioRevisionsEnabled();
    const { id } = await context.params;
    const order = await requireStudioOrderAccess(id, bearerStudioToken(request));
    return studioJson(await studioRevisionDraft(order));
  } catch (error) { return studioErrorResponse(error); }
}

/** Saves the revision once. A repeat of the same request returns the same revision; a different one is refused. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertStudioRevisionsEnabled();
    const { id } = await context.params;
    const order = await requireStudioOrderAccess(id, bearerStudioToken(request));
    // The largest accepted set of answers measures about 23 KB with its approval snapshot.
    const raw = await readStudioText(request, 40_000);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new StudioError('brand_intake_invalid', 'Please complete your answers and try again.', 400); }
    const revision = await requestStudioRevision(order, body);
    // A saved revision is durable. This only shortens the wait; a later visit or the daily run recovers it.
    after(async () => { try { await runStudioWorker({ limit: 1 }); } catch (error) { console.error('[STUDIO REVISION WORKER]', studioErrorCode(error)); } });
    return studioJson({ revision: { status: revision.status, canRequest: false, availableUntil: null, requestedAt: revision.created_at, readyAt: revision.ready_at } }, 202);
  } catch (error) { return studioErrorResponse(error); }
}
