import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { __resetAlertsFetchStateForTests, fetchActiveAlerts } from '../lib/sources/alertsInUa';

describe('Official alerts freshness and failure handling', () => {
  it('manual refresh performs a second real fetch instead of replaying completed cache', async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({
        alerts: [],
        meta: { last_updated_at: new Date().toISOString() }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    try {
      __resetAlertsFetchStateForTests();
      await fetchActiveAlerts('test-token');
      await fetchActiveAlerts('test-token', { force: true });
      assert.equal(calls, 2);
    } finally {
      globalThis.fetch = originalFetch;
      __resetAlertsFetchStateForTests();
    }
  });

  it('source unavailable returns no polygons and never presents stale data as current', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error('network unavailable'); }) as typeof fetch;
    try {
      __resetAlertsFetchStateForTests();
      const result = await fetchActiveAlerts('test-token', { force: true });
      assert.equal(result.status, 'ERROR');
      assert.equal(result.diagnostic.sourceOnline, false);
      assert.equal(result.diagnostic.isStale, true);
      assert.deepEqual(result.alerts, []);
    } finally {
      globalThis.fetch = originalFetch;
      __resetAlertsFetchStateForTests();
    }
  });
});
