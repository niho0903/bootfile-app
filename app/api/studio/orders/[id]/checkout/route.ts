import { NextRequest } from 'next/server';
import { bearerStudioToken } from '@/lib/studio/access';
import { resumeStudioCheckout } from '@/lib/studio/checkout';
import { requireStudioOrderAccess } from '@/lib/studio/db';
import { studioErrorResponse, studioJson } from '@/lib/studio/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await requireStudioOrderAccess(id, bearerStudioToken(request));
    return studioJson(await resumeStudioCheckout(order));
  } catch (error) { return studioErrorResponse(error); }
}
