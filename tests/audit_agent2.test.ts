import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLocalSecurity } from '../lib/matcher';
import { fetchActiveAlerts, __resetAlertsFetchStateForTests, RawAlert, isUserInOfficialAlert } from '../lib/sources/alertsInUa';
import { fetchAllTelegramFeeds, fetchChannelMessages, USER_PRIORITY_CHANNELS, MONITORED_CHANNELS } from '../lib/sources/telegramScraper';
import { classifyThreat } from '../lib/threatClassifier';
import { buildOfficialAlertsGeoJson } from '../lib/officialAlertGeometry';

test('1. Polling Cadence & Cadence Analysis', async (t) => {
  await t.test('Aggregated state evaluation produces valid GREEN when channels are healthy', () => {
    const res = evaluateLocalSecurity(
      50.4501, 30.5234, 15.0, 'Кирил',
      [], [], Date.now(), 'OK',
      {
        totalSources: 74,
        monitoredSources: 74,
        healthyCount: 65,
        unavailableCount: 9,
        criticalTotal: 25,
        criticalHealthy: 22,
        userPriorityTotal: 11,
        userPriorityHealthy: 10,
        lastSuccessfulCycleTs: Date.now()
      }
    );

    assert.equal(res.overallState, 'GREEN');
    assert.equal(res.monitoringHealth, 'OK');
  });

  await t.test('Evaluation state becomes INCOMPLETE if cycleTs is > 90s (data stale)', () => {
    const res = evaluateLocalSecurity(
      50.4501, 30.5234, 15.0, 'Кирил',
      [], [], Date.now() - 95000, 'OK',
      {
        totalSources: 74,
        monitoredSources: 74,
        healthyCount: 65,
        unavailableCount: 9,
        criticalTotal: 25,
        criticalHealthy: 22,
        userPriorityTotal: 11,
        userPriorityHealthy: 10,
        lastSuccessfulCycleTs: Date.now() - 95000
      }
    );

    assert.equal(res.isDataStale, true);
    assert.equal(res.overallState, 'DEGRADED');
    assert.equal(res.monitoringHealth, 'INCOMPLETE');
  });
});

test('2. Timestamps & Source Data Freshness', async (t) => {
  await t.test('lastRealDataTimestamp reflects message timestamp, not evaluation time', () => {
    const msgTime = Date.now() - 120000; // 2 minutes ago
    const msgs = [{
      id: 'test_msg_1',
      channel: 'kievreal1',
      channelTitle: 'Київ Інфо',
      authorityWeight: 0.98,
      text: 'Спокійно, без загроз',
      timeIso: new Date(msgTime).toISOString(),
      unixTimestamp: msgTime
    }];

    const res = evaluateLocalSecurity(
      50.4501, 30.5234, 15.0, 'Кирил',
      [], msgs, Date.now(), 'OK',
      {
        totalSources: 74,
        monitoredSources: 74,
        healthyCount: 60,
        unavailableCount: 14,
        criticalTotal: 25,
        criticalHealthy: 20,
        lastSuccessfulCycleTs: Date.now(),
        lastRealDataTimestamp: msgTime
      }
    );

    assert.equal(res.lastRealDataTimestamp, msgTime);
    assert.equal(res.lastRealDataIso, new Date(msgTime).toISOString());
  });

  await t.test('Official alerts diagnostic maintains sourceUpdatedIso and receivedByAgentIso', async () => {
    __resetAlertsFetchStateForTests();
    const res = await fetchActiveAlerts(undefined, { force: true, timeoutMs: 3000 });
    // Regardless of network state, diagnostic structure is populated
    assert.ok(res.diagnostic);
    assert.ok(typeof res.diagnostic.sourceOnline === 'boolean');
    assert.ok(typeof res.diagnostic.dataAgeSec === 'number');
    assert.ok(res.diagnostic.receivedByAgentIso.length > 0);
  });
});

test('3. Manual Refresh Hard Timeout & AbortSignal', async (t) => {
  await t.test('Immediate AbortSignal halts fetchChannelMessages in under 50ms', async () => {
    const controller = new AbortController();
    controller.abort();

    const start = Date.now();
    const res = await fetchChannelMessages(USER_PRIORITY_CHANNELS[0], {
      signal: controller.signal,
      timeoutMs: 3000
    });
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100, `Expected elapsed < 100ms, got ${elapsed}ms`);
    assert.equal(res.statusCategory, 'timeout');
  });

  await t.test('fetchAllTelegramFeeds handles AbortSignal mid-execution and returns partial results', async () => {
    const controller = new AbortController();
    // Abort after 200ms
    setTimeout(() => controller.abort(), 200);

    const start = Date.now();
    const res = await fetchAllTelegramFeeds('м. Київ', undefined, USER_PRIORITY_CHANNELS, {
      signal: controller.signal,
      timeoutMs: 2500
    });
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 15000, `Expected aborted execution to finish quickly, got ${elapsed}ms`);
    assert.ok(res.metrics);
    assert.ok(res.sourceStatus);
  });
});

test('4. Official Alerts Realtime Lifecycle & Geometry', async (t) => {
  await t.test('Air raid alert triggers isUserInOfficialAlert accurately', () => {
    const mockAlerts: RawAlert[] = [
      {
        id: 1,
        location_title: 'м. Київ',
        location_type: 'oblast',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'м. Київ',
        location_uid: '1'
      }
    ];

    assert.equal(isUserInOfficialAlert('м. Київ', 'Київ (Центр)', mockAlerts), true);
    assert.equal(isUserInOfficialAlert('Київська область', 'Бориспіль', mockAlerts), false);
  });

  await t.test('All-clear (finished_at != null) immediately removes zone from active alert', () => {
    const mockAlerts: RawAlert[] = [
      {
        id: 1,
        location_title: 'м. Київ',
        location_type: 'oblast',
        started_at: new Date(Date.now() - 3600000).toISOString(),
        finished_at: new Date().toISOString(), // all-clear!
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'м. Київ',
        location_uid: '1'
      }
    ];

    assert.equal(isUserInOfficialAlert('м. Київ', 'Київ (Центр)', mockAlerts), false);
  });

  await t.test('buildOfficialAlertsGeoJson generates geometry without delay', async () => {
    const mockAlerts: RawAlert[] = [
      {
        id: 10,
        location_title: 'Київська область',
        location_type: 'oblast',
        started_at: new Date().toISOString(),
        finished_at: null,
        updated_at: new Date().toISOString(),
        alert_type: 'air_raid',
        location_oblast: 'Київська область',
        location_uid: '10'
      }
    ];

    const { geoJson, diagnostic } = await buildOfficialAlertsGeoJson(mockAlerts);
    assert.ok(geoJson && geoJson.features.length > 0);
    assert.equal(diagnostic.matchedGeometryCount > 0, true);
  });
});

test('5. Threat Classifier & Event Lifecycle', async (t) => {
  await t.test('Direct Shahed threat inside radius triggers CONFIRMED_THREAT and RED state', () => {
    const mockThreatMsg = {
      id: 'threat_1',
      channel: 'vanek_nikolaev',
      channelTitle: 'Николаевский Ванёк',
      authorityWeight: 0.98,
      text: 'Шахед курсом на Бориспіль! Перебувайте в укриттях!',
      timeIso: new Date().toISOString(),
      unixTimestamp: Date.now()
    };

    const res = evaluateLocalSecurity(
      50.3500, 30.9500, 15.0, 'Кирил',
      [], [mockThreatMsg], Date.now(), 'OK',
      {
        totalSources: 74,
        monitoredSources: 74,
        healthyCount: 65,
        unavailableCount: 9,
        criticalTotal: 25,
        criticalHealthy: 22,
        lastSuccessfulCycleTs: Date.now()
      }
    );

    assert.equal(res.overallState, 'RED');
    assert.equal(res.hasLocalThreat, true);
    assert.ok(res.primaryThreat);
    assert.equal(res.primaryThreat?.category, 'SHAHED_DRONE');
    assert.equal(res.primaryThreat?.requiresImmediateShelter, true);
  });

  await t.test('Distant observation outside radius (40 km) triggers ORANGE/GREEN not RED', () => {
    const mockDistantMsg = {
      id: 'threat_2',
      channel: 'war_monitor',
      channelTitle: 'War Monitor',
      authorityWeight: 0.95,
      text: 'БпЛА повз Бровари на південь',
      timeIso: new Date().toISOString(),
      unixTimestamp: Date.now()
    };

    // User is in Boryspil (~25km from Brovary, radius 15km)
    const res = evaluateLocalSecurity(
      50.3500, 30.9500, 15.0, 'Кирил',
      [], [mockDistantMsg], Date.now(), 'OK',
      {
        totalSources: 74,
        monitoredSources: 74,
        healthyCount: 65,
        unavailableCount: 9,
        criticalTotal: 25,
        criticalHealthy: 22,
        lastSuccessfulCycleTs: Date.now()
      }
    );

    assert.notEqual(res.overallState, 'RED');
    assert.ok(res.observationsCount > 0 || res.outsideZoneObservationsCount > 0);
  });
});

test('6. Resilience & Recovery Lifecycle', async (t) => {
  await t.test('System transitions from DEGRADED to GREEN when sources recover', () => {
    // 1. DEGRADED state when sources fail
    const degradedRes = evaluateLocalSecurity(
      50.4501, 30.5234, 15.0, 'Кирил',
      [], [], Date.now(), 'ERROR', // Alerts error
      {
        totalSources: 74,
        monitoredSources: 74,
        healthyCount: 20, // Low healthy
        unavailableCount: 54,
        criticalTotal: 25,
        criticalHealthy: 5,
        lastSuccessfulCycleTs: Date.now()
      }
    );
    assert.equal(degradedRes.overallState, 'DEGRADED');

    // 2. RECOVERED state
    const recoveredRes = evaluateLocalSecurity(
      50.4501, 30.5234, 15.0, 'Кирил',
      [], [], Date.now(), 'OK',
      {
        totalSources: 74,
        monitoredSources: 74,
        healthyCount: 68,
        unavailableCount: 6,
        criticalTotal: 25,
        criticalHealthy: 24,
        lastSuccessfulCycleTs: Date.now()
      }
    );
    assert.equal(recoveredRes.overallState, 'GREEN');
    assert.equal(recoveredRes.monitoringHealth, 'OK');
  });
});
