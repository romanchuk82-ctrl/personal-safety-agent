import test from 'node:test';
import assert from 'node:assert';
import { evaluateLocalSecurity } from '../lib/matcher';
import { MONITORED_CHANNELS, getPrioritizedChannels, fetchAllTelegramFeeds } from '../lib/sources/telegramScraper';

test('Source Health: MONITORED_CHANNELS array has no duplicate usernames', () => {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const ch of MONITORED_CHANNELS) {
    const u = ch.username.toLowerCase();
    if (seen.has(u)) {
      duplicates.push(u);
    }
    seen.add(u);
  }

  assert.strictEqual(duplicates.length, 0, `Found duplicate usernames in MONITORED_CHANNELS: ${duplicates.join(', ')}`);
});

test('Source Health: Safety Protocol forbids "СЕКТОР ЧИСТИЙ" when monitoring is INCOMPLETE', () => {
  // Scenario: 0 telegram messages, alerts error -> should be DEGRADED / INCOMPLETE, NEVER GREEN
  const evalResult = evaluateLocalSecurity(
    50.4501,
    30.5234,
    15.0,
    'Кирил',
    [],
    [],
    undefined,
    'ERROR',
    {
      totalSources: 171,
      monitoredSources: 73,
      healthyCount: 0,
      unavailableCount: 73,
      disabledCount: 98,
      criticalTotal: 15,
      criticalHealthy: 0,
      lastSuccessfulCycleTs: 0,
      lastRealDataTimestamp: 0,
      lastRealDataIso: null
    }
  );

  assert.notStrictEqual(evalResult.overallState, 'GREEN', 'System must NEVER declare GREEN when monitoring is INCOMPLETE');
  assert.strictEqual(evalResult.overallState, 'DEGRADED');
  assert.strictEqual(evalResult.stateBadgeUk, 'МОНІТОРИНГ НЕПОВНИЙ');
  assert.strictEqual(evalResult.monitoringHealth, 'INCOMPLETE');
  assert.ok(evalResult.monitoringHealthReasonUk.length > 5);
});

test('Source Health: Stale data (>90s) triggers MONITORING INCOMPLETE with clear reason', () => {
  const oldTimestamp = Date.now() - 120 * 1000; // 2 minutes ago
  const evalResult = evaluateLocalSecurity(
    50.4501,
    30.5234,
    15.0,
    'Кирил',
    [],
    [],
    oldTimestamp,
    'OK',
    {
      totalSources: 171,
      monitoredSources: 73,
      healthyCount: 65,
      unavailableCount: 8,
      disabledCount: 98,
      criticalTotal: 15,
      criticalHealthy: 14,
      lastSuccessfulCycleTs: oldTimestamp,
      lastRealDataTimestamp: oldTimestamp,
      lastRealDataIso: new Date(oldTimestamp).toISOString()
    }
  );

  assert.strictEqual(evalResult.isDataStale, true, 'isDataStale must be true when data > 90s');
  assert.strictEqual(evalResult.overallState, 'DEGRADED');
  assert.strictEqual(evalResult.stateBadgeUk, 'МОНІТОРИНГ НЕПОВНИЙ');
  assert.ok(evalResult.stateDescriptionUk.includes('Дані застаріли'));
});

test('Source Health: Verified clean sector when critical coverage is healthy and data is fresh', () => {
  const freshTimestamp = Date.now() - 10 * 1000; // 10s ago
  const dummyMsg = {
    id: 'test_1',
    channel: 'kpszsu',
    channelTitle: 'Командування Повітряних Сил ЗСУ',
    authorityWeight: 1.0,
    text: 'Повітряний простір контролюється. Без ударних БпЛА.',
    timeIso: new Date(freshTimestamp).toISOString(),
    unixTimestamp: freshTimestamp
  };

  const evalResult = evaluateLocalSecurity(
    50.4501,
    30.5234,
    15.0,
    'Кирил',
    [],
    [dummyMsg],
    freshTimestamp,
    'OK',
    {
      totalSources: 171,
      monitoredSources: 73,
      healthyCount: 70,
      unavailableCount: 3,
      disabledCount: 98,
      criticalTotal: 15,
      criticalHealthy: 15,
      lastSuccessfulCycleTs: freshTimestamp,
      lastRealDataTimestamp: freshTimestamp,
      lastRealDataIso: new Date(freshTimestamp).toISOString()
    }
  );

  assert.strictEqual(evalResult.overallState, 'GREEN', 'When monitoring is healthy and no threats, state is GREEN');
  assert.strictEqual(evalResult.stateBadgeUk, 'СЕКТОР ЧИСТИЙ');
  assert.strictEqual(evalResult.monitoringHealth, 'OK');
  assert.ok(!evalResult.stateDescriptionUk.includes('159 радарних джерел'), 'Hardcoded 159 must be eliminated');
  assert.ok(evalResult.stateDescriptionUk.includes('73 радарних джерел'), 'Must show dynamic monitored count');
});

test('Source Health: Loss of a few secondary channels causes DEGRADED, not full INCOMPLETE', () => {
  const freshTimestamp = Date.now() - 5 * 1000;
  const dummyMsg = {
    id: 'test_kpszsu',
    channel: 'kpszsu',
    channelTitle: 'Командування Повітряних Сил ЗСУ',
    authorityWeight: 1.0,
    text: 'Чисто',
    timeIso: new Date(freshTimestamp).toISOString(),
    unixTimestamp: freshTimestamp
  };

  const evalResult = evaluateLocalSecurity(
    50.4501,
    30.5234,
    15.0,
    'Кирил',
    [],
    [dummyMsg],
    freshTimestamp,
    'OK',
    {
      totalSources: 171,
      monitoredSources: 73,
      healthyCount: 30, // less than 45% of total
      unavailableCount: 43,
      disabledCount: 98,
      criticalTotal: 15,
      criticalHealthy: 14, // critical core is still up!
      lastSuccessfulCycleTs: freshTimestamp,
      lastRealDataTimestamp: freshTimestamp,
      lastRealDataIso: new Date(freshTimestamp).toISOString()
    }
  );

  assert.strictEqual(evalResult.monitoringHealth, 'DEGRADED', 'Loss of secondary channels marks health as DEGRADED');
  // Since critical core is alive, sector can be GREEN but with degraded diagnostics
  assert.strictEqual(evalResult.overallState, 'GREEN');
});
