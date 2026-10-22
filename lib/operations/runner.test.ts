import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  client: vi.fn(), reconcile: vi.fn(), worker: vi.fn(), refunds: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: mocks.client }));
vi.mock('@/lib/studio/reconcile', () => ({ reconcileStudioPayments: mocks.reconcile }));
vi.mock('@/lib/studio/worker', () => ({ runStudioWorker: mocks.worker }));
vi.mock('@/lib/studio/refunds', () => ({ reconcileStudioRefunds: mocks.refunds }));

import { runOperations } from './runner';

beforeEach(() => { vi.resetAllMocks(); });

describe('operating dispatch guard', () => {
  it('does not move money or generate work when its audit record cannot be saved', async () => {
    mocks.client.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: { code: '42P01' } }) });
    expect(await runOperations('cron')).toEqual({ status: 'failed', reason: 'run_ledger_unavailable' });
    expect(mocks.reconcile).not.toHaveBeenCalled();
    expect(mocks.worker).not.toHaveBeenCalled();
    expect(mocks.refunds).not.toHaveBeenCalled();
  });

  it('does not dispatch a duplicate owner/cron invocation in an already-recorded window', async () => {
    mocks.client.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: { status: 'skipped', reason: 'run_already_recorded_for_window' }, error: null }) });
    expect(await runOperations('owner')).toEqual({ status: 'skipped', reason: 'run_already_recorded_for_window' });
    expect(mocks.reconcile).not.toHaveBeenCalled();
    expect(mocks.worker).not.toHaveBeenCalled();
    expect(mocks.refunds).not.toHaveBeenCalled();
  });

  it('does not dispatch when a run from the previous window still owns the operating lease', async () => {
    mocks.client.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: { status: 'skipped', reason: 'run_already_active' }, error: null }) });
    expect(await runOperations('cron')).toEqual({ status: 'skipped', reason: 'run_already_active' });
    expect(mocks.reconcile).not.toHaveBeenCalled();
    expect(mocks.worker).not.toHaveBeenCalled();
    expect(mocks.refunds).not.toHaveBeenCalled();
  });

  it('requires positive claim evidence before dispatching', async () => {
    mocks.client.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: {}, error: null }) });
    expect(await runOperations('cron')).toEqual({ status: 'failed', reason: 'run_ledger_unavailable' });
    expect(mocks.worker).not.toHaveBeenCalled();
    expect(mocks.refunds).not.toHaveBeenCalled();
  });
});
