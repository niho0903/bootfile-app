import { NextRequest } from 'next/server';
import { paidBrandJson, paidBrandMarkdown } from '@/lib/brand-kit/paid-output';
import { PAID_BRAND_KIT_VERSION } from '@/lib/brand-kit/synthesis';
import { bearerStudioToken } from '@/lib/studio/access';
import { studioBundleMarkdown } from '@/lib/studio/bundle';
import { requireStudioOrderAccess } from '@/lib/studio/db';
import { StudioError } from '@/lib/studio/errors';
import { STUDIO_PRIVATE_HEADERS, studioErrorResponse } from '@/lib/studio/http';
import { brandKitOf, marketingBundleOf } from '@/lib/studio/outputs';
import { STUDIO_PRODUCT } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function attachment(body: string, type: string, filename: string) {
  return new Response(body, { headers: { ...STUDIO_PRIVATE_HEADERS, 'Content-Type': `${type}; charset=utf-8`, 'Content-Disposition': `attachment; filename="${filename}"` } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await requireStudioOrderAccess(id, bearerStudioToken(request));
    if (!order.output || order.payment_status !== 'paid' || order.refund_status !== 'none') throw new StudioError('package_not_ready', 'This package is not currently available to download.', 409);
    if (order.product_version === STUDIO_PRODUCT.version) return attachment(studioBundleMarkdown(marketingBundleOf(order)), 'text/markdown', 'bootfile-marketing-setup.md');
    if (order.product_version === PAID_BRAND_KIT_VERSION) {
      // Public unless the owner explicitly asks for the copy that includes their private working preferences.
      const scope = request.nextUrl.searchParams.get('scope') === 'private' ? 'private' : 'public';
      const kit = brandKitOf(order);
      const name = `bootfile-brand-ai-kit${scope === 'private' ? '-private' : ''}`;
      return request.nextUrl.searchParams.get('format') === 'json'
        ? attachment(paidBrandJson(kit, scope), 'application/json', `${name}.json`)
        : attachment(paidBrandMarkdown(kit, scope), 'text/markdown', `${name}.md`);
    }
    throw new StudioError('package_version_unsupported', 'This package is not currently available to download.', 409);
  } catch (error) { return studioErrorResponse(error); }
}
