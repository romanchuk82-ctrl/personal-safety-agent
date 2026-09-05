import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllTelegramFeeds, USER_PRIORITY_CHANNELS, MONITORED_CHANNELS } from '../lib/sources/telegramScraper';
import { fetchActiveAlerts } from '../lib/sources/alertsInUa';
import { getOfficialGeometryDescriptor } from '../lib/officialAlertGeometry';

describe('Manual Refresh & Tactical Map Styling', () => {
  it('USER PRIORITY та CRITICAL канали завжди входять до опитування', () => {
    assert.ok(USER_PRIORITY_CHANNELS.length >= 10);
    const criticalChannels = MONITORED_CHANNELS.filter(c => c.tier === 'CRITICAL');
    assert.ok(criticalChannels.length >= 4);
  });

  it('fetchAllTelegramFeeds підтримує options.force без помилок', async () => {
    const res = await fetchAllTelegramFeeds('Київська область', undefined, [], { force: true });
    assert.ok(res);
    assert.ok(res.metrics);
    assert.ok(res.sourceStatus);
    assert.ok(res.metrics.userPriorityTotal > 0);
    assert.ok(res.metrics.criticalTotal > 0);
  });

  it('fetchActiveAlerts підтримує options.force без помилок', async () => {
    const res = await fetchActiveAlerts(undefined, { force: true });
    assert.ok(res);
    assert.ok(res.diagnostic);
    assert.equal(typeof res.diagnostic.sourceOnline, 'boolean');
  });
});
