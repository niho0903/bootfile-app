import { NextRequest } from 'next/server';
import { bearerStudioToken } from '@/lib/studio/access';
import { studioBundleMarkdown } from '@/lib/studio/bundle';
import { requireStudioOrderAccess } from '@/lib/studio/db';
import { StudioError } from '@/lib/studio/errors';
import { STUDIO_PRIVATE_HEADERS, studioErrorResponse } from '@/lib/studio/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await requireStudioOrderAccess(id, bearerStudioToken(request));
    if (!order.output || order.payment_status !== 'paid' || order.refund_status !== 'none') throw new StudioError('package_not_ready', 'This package is not currently available to download.', 409);
    return new Response(studioBundleMarkdown(order.output), {
      headers: { ...STUDIO_PRIVATE_HEADERS, 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename="bootfile-marketing-setup.md"' },
    });
  } catch (error) { return studioErrorResponse(error); }
}
