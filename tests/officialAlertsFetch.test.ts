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

  it('source unavailable returns no polygons when uninitialized and never presents stale data as current', async () => {
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

  it('transient failure after successful fetch retains last confirmed alerts to prevent false CLEAR and flicker', async () => {
    const originalFetch = globalThis.fetch;
    let shouldFail = false;
    const fakeAlert = {
      id: 123,
      location_title: 'Київська область',
      location_type: 'oblast' as const,
      started_at: new Date().toISOString(),
      finished_at: null,
      updated_at: new Date().toISOString(),
      alert_type: 'air_raid',
      location_oblast: 'Київська область',
      location_uid: '10'
    };

    globalThis.fetch = (async () => {
      if (shouldFail) {
        throw new Error('504 Gateway Timeout');
      }
      return new Response(JSON.stringify({
        alerts: [fakeAlert],
        meta: { last_updated_at: new Date().toISOString() }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;

    try {
      __resetAlertsFetchStateForTests();
      const res1 = await fetchActiveAlerts('test-token', { force: true });
      assert.equal(res1.status, 'OK');
      assert.equal(res1.alerts.length, 1);
      assert.equal(res1.alerts[0].location_uid, '10');

      // Now network drops temporarily
      shouldFail = true;
      const res2 = await fetchActiveAlerts('test-token', { force: true });
      assert.equal(res2.status, 'ERROR');
      assert.equal(res2.diagnostic.sourceOnline, false);
      assert.equal(res2.diagnostic.isStale, true);
      // Alerts must NOT be cleared to prevent false CLEAR / alert flickering
      assert.equal(res2.alerts.length, 1);
      assert.equal(res2.alerts[0].location_uid, '10');
      assert.equal(res2.diagnostic.activeAlertsCount, 1);
    } finally {
      globalThis.fetch = originalFetch;
      __resetAlertsFetchStateForTests();
    }
  });
});
