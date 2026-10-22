import { bearerStudioToken } from '@/lib/studio/access';
import { requireStudioOrderAccess } from '@/lib/studio/db';
import { StudioError } from '@/lib/studio/errors';
import { readStudioText, studioErrorResponse, studioJson } from '@/lib/studio/http';
import { requestStudioRefund } from '@/lib/studio/refunds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = bearerStudioToken(request);
    const { id } = await context.params;
    const order = await requireStudioOrderAccess(id, token);
    const body = await readStudioText(request, 256);
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { throw new StudioError('invalid_refund_request', 'Confirm your refund request on the order page.', 400); }
    if (!parsed || typeof parsed !== 'object' || !('confirmed' in parsed) || parsed.confirmed !== true) {
      throw new StudioError('refund_confirmation_required', 'Confirm the full refund before continuing.', 400);
    }
    return studioJson(await requestStudioRefund(order));
  } catch (error) {
    return studioErrorResponse(error);
  }
}
