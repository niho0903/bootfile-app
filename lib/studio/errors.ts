export class StudioError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 503) {
    super(message);
    this.name = 'StudioError';
  }
}

/** Keep provider responses, customer intake, and secrets out of logs and public errors. */
export function studioErrorCode(error: unknown): string {
  if (error instanceof StudioError) return error.code;
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return 'provider_timeout';
  return 'studio_internal_error';
}

export function publicStudioError(error: unknown): { code: string; message: string; status: number } {
  if (error instanceof StudioError) return { code: error.code, message: error.message, status: error.status };
  return { code: 'service_unavailable', message: 'The setup service is temporarily unavailable. Please try again shortly.', status: 503 };
}
