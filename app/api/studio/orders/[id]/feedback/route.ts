import { bearerStudioToken } from '@/lib/studio/access';
import { requireStudioOrderAccess } from '@/lib/studio/db';
import { StudioError } from '@/lib/studio/errors';
import { parseStudioFeedback, readStudioFeedback, saveStudioFeedback } from '@/lib/studio/feedback';
import { readStudioText, studioErrorResponse, studioJson } from '@/lib/studio/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const token = bearerStudioToken(request);
    const { id } = await params;
    const order = await requireStudioOrderAccess(id, token);
    return studioJson({ feedback: await readStudioFeedback(order) });
  } catch (error) { return studioErrorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const token = bearerStudioToken(request);
    const { id } = await params;
    const order = await requireStudioOrderAccess(id, token);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      throw new StudioError('invalid_feedback', 'Choose a feedback option on your order page.', 400);
    }
    const event = parseStudioFeedback(await readStudioText(request, 128));
    return studioJson({ feedback: await saveStudioFeedback(order, event, request.headers.get('idempotency-key')) });
  } catch (error) { return studioErrorResponse(error); }
}
