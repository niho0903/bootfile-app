import { NextResponse } from 'next/server';
import { publicStudioError, studioErrorCode, StudioError } from './errors';

export const STUDIO_PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Vary': 'Authorization',
};

export function studioJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: STUDIO_PRIVATE_HEADERS });
}

/** Bound the actual bytes consumed, including chunked requests without Content-Length. */
export async function readStudioText(request: Request, maxBytes: number): Promise<string> {
  const tooLarge = () => new StudioError('intake_too_large', 'The submitted information is too long.', 413);
  if (Number(request.headers.get('content-length')) > maxBytes) {
    await request.body?.cancel().catch(() => undefined);
    throw tooLarge();
  }
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw tooLarge();
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export function studioErrorResponse(error: unknown) {
  const publicError = publicStudioError(error);
  if (publicError.status >= 500 && publicError.code !== 'temporarily_full') console.error('[STUDIO]', studioErrorCode(error));
  return NextResponse.json({ error: { code: publicError.code, message: publicError.message } }, {
    status: publicError.status,
    headers: { ...STUDIO_PRIVATE_HEADERS, ...(publicError.status === 429 ? { 'Retry-After': '3600' } : publicError.code === 'temporarily_full' ? { 'Retry-After': '300' } : {}) },
  });
}
