import { after, NextRequest } from 'next/server';
import { bearerStudioToken } from '@/lib/studio/access';
import { requireStudioOrderAccess, studioOrderView } from '@/lib/studio/db';
import { studioErrorCode } from '@/lib/studio/errors';
import { studioErrorResponse, studioJson } from '@/lib/studio/http';
import { reconcileStudioSession } from '@/lib/studio/payments';
import { runStudioWorker } from '@/lib/studio/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await requireStudioOrderAccess(id, bearerStudioToken(request));
    if (order.payment_status === 'awaiting_payment' && order.stripe_checkout_session_id) {
      after(async () => {
        try {
          const result = await reconcileStudioSession(order.stripe_checkout_session_id!);
          if (result.paid) await runStudioWorker({ limit: 1 });
        } catch (error) { console.error('[STUDIO RECONCILE]', studioErrorCode(error)); }
      });
    } else if (order.status === 'queued' || order.status === 'ready') {
      // An authenticated visit can nudge a persisted job; cron remains the recovery mechanism.
      after(async () => { try { await runStudioWorker({ limit: 1 }); } catch (error) { console.error('[STUDIO WORKER]', studioErrorCode(error)); } });
    }
    return studioJson(await studioOrderView(order));
  } catch (error) { return studioErrorResponse(error); }
}
