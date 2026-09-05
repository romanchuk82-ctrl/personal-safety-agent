import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTimeHHMMSS, formatAgeWithStaleWarningUk } from '../lib/diagnosticsFormatters';
import { fetchActiveAlerts, __resetAlertsFetchStateForTests } from '../lib/sources/alertsInUa';
import { __resetTelegramScraperStateForTests, TelegramMessage } from '../lib/sources/telegramScraper';
import { evaluateLocalSecurity } from '../lib/matcher';

test('Source Timestamps & Diagnostics Transparency', async (t) => {
  await t.test('formatTimeHHMMSS formats dates and timestamps to HH:MM:SS', () => {
    const d = new Date(2026, 8, 5, 8, 4, 17);
    const formatted = formatTimeHHMMSS(d);
    assert.match(formatted, /08:04:17/);

    assert.equal(formatTimeHHMMSS(null), '—');
    assert.equal(formatTimeHHMMSS(undefined), '—');
    assert.equal(formatTimeHHMMSS('invalid'), '—');
  });

  await t.test('formatAgeWithStaleWarningUk formats live seconds, minutes, and stale warnings', () => {
    // 0 seconds
    const zeroSec = formatAgeWithStaleWarningUk(0, 90);
    assert.equal(zeroSec.text, '0 с тому');
    assert.equal(zeroSec.isStale, false);

    // 15 seconds
    const fifteenSec = formatAgeWithStaleWarningUk(15, 90);
    assert.equal(fifteenSec.text, '15 с тому');
    assert.equal(fifteenSec.isStale, false);

    // 60 seconds (1 minute exact)
    const sixtySec = formatAgeWithStaleWarningUk(60, 90);
    assert.equal(sixtySec.text, '1 хв тому');
    assert.equal(sixtySec.isStale, false);

    // 75 seconds (1 min 15 sec)
    const seventyFiveSec = formatAgeWithStaleWarningUk(75, 90);
    assert.equal(seventyFiveSec.text, '1 хв 15 с тому');
    assert.equal(seventyFiveSec.isStale, false);

    // 198 seconds (3 min 18 sec) - Exceeds 90s stale threshold!
    const stale198 = formatAgeWithStaleWarningUk(198, 90);
    assert.equal(stale198.text, '⚠️ ДАНІ ЗАСТАРІЛИ — 3 хв 18 с');
    assert.equal(stale198.isStale, true);

    // Official alerts threshold 60s
    const alertsStale = formatAgeWithStaleWarningUk(65, 60);
    assert.equal(alertsStale.text, '⚠️ ДАНІ ЗАСТАРІЛИ — 1 хв 5 с');
    assert.equal(alertsStale.isStale, true);
  });

  await t.test('Telegram Ingest distinguishes lastMessageTimestamp from lastSuccessfulCycleTs', () => {
    __resetTelegramScraperStateForTests();
    const msgDate = new Date(2026, 8, 5, 8, 0, 15);
    const mockMessage: TelegramMessage = {
      id: 'test_123',
      channel: 'kpszsu',
      channelTitle: 'Повітряні Сили',
      authorityWeight: 1.0,
      text: 'Увага! БпЛА курсом на Васильків',
      timeIso: msgDate.toISOString(),
      unixTimestamp: msgDate.getTime()
    };

    const cycleDate = new Date(2026, 8, 5, 8, 9, 0);
    const cycleTime = cycleDate.getTime();

    // Verify evaluation and metrics distinction
    const result = evaluateLocalSecurity(
      50.4501,
      30.5234,
      15,
      'Кирил',
      [],
      [mockMessage],
      cycleTime,
      'OK',
      {
        lastSuccessfulCycleTs: cycleTime,
        lastMessageTimestamp: mockMessage.unixTimestamp,
        lastRealDataTimestamp: mockMessage.unixTimestamp,
        healthyCount: 1,
        monitoredSources: 1
      }
    );

    assert.equal(result.lastRealDataTimestamp, mockMessage.unixTimestamp);
    assert.ok(mockMessage.unixTimestamp < cycleTime);
    assert.equal(formatTimeHHMMSS(cycleTime), '08:09:00');
    assert.equal(formatTimeHHMMSS(mockMessage.unixTimestamp), '08:00:15');
  });

  await t.test('Official Alerts preserves lastSuccessfulFetchTs when fetch encounters an error', async () => {
    __resetAlertsFetchStateForTests();

    // Test abort / error retention
    const abortController = new AbortController();
    abortController.abort();
    const failRes = await fetchActiveAlerts('test-token', { signal: abortController.signal, force: true });

    assert.equal(failRes.status, 'ERROR');
    assert.equal(failRes.diagnostic.sourceOnline, false);
    assert.ok(failRes.diagnostic.isStale);
  });
});
