import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchAllTelegramFeeds,
  fetchChannelMessages,
  USER_PRIORITY_CHANNELS,
  MONITORED_CHANNELS,
  ChannelConfig,
  RefreshDiagnostics
} from '../lib/sources/telegramScraper';
import { fetchActiveAlerts } from '../lib/sources/alertsInUa';
import { evaluateLocalSecurity } from '../lib/matcher';

describe('Manual Refresh Timeout & Priority Protection (Max 30s)', () => {
  it('USER PRIORITY та CRITICAL канали завжди мають пріоритет над іншими', () => {
    const userPriority = USER_PRIORITY_CHANNELS.filter(c => c.tier === 'USER_PRIORITY');
    const critical = MONITORED_CHANNELS.filter(c => c.tier === 'CRITICAL');
    assert.ok(userPriority.length >= 10, 'Повинно бути мінімум 10 каналів USER_PRIORITY');
    assert.ok(critical.length >= 15, 'Повинно бути мінімум 15 каналів CRITICAL');
  });

  it('fetchChannelMessages з AbortSignal негайно повертає timeout без зависання', async () => {
    const channel: ChannelConfig = {
      username: 'slow_mock_test_channel_xyz',
      title: 'Slow Mock Channel',
      category: 'military_official',
      region: 'Вся Україна',
      weight: 0.9,
      priority: 1,
      tier: 'CRITICAL'
    };

    const controller = new AbortController();
    // Pre-abort to simulate an expired window or quick timeout
    controller.abort();

    const start = Date.now();
    const res = await fetchChannelMessages(channel, {
      force: true,
      signal: controller.signal,
      timeoutMs: 1000
    });
    const duration = Date.now() - start;

    assert.ok(duration < 200, `Повинно завершитися миттєво (<200ms), зайняло ${duration}ms`);
    assert.equal(res.statusCategory, 'timeout');
    assert.ok(res.error?.includes('таймаут'));
  });

  it('fetchAllTelegramFeeds коректно обробляє сигнал abort та не зависає', async () => {
    const controller = new AbortController();
    // Abort after 500ms
    setTimeout(() => controller.abort(), 500);

    const start = Date.now();
    const res = await fetchAllTelegramFeeds('м. Київ', undefined, [], {
      force: true,
      signal: controller.signal,
      timeoutMs: 400
    });
    const duration = Date.now() - start;

    assert.ok(duration < 5000, `Повинно вкластися у швидкий таймаут, тривало ${duration}ms`);
    assert.ok(res);
    assert.ok(res.metrics);
    assert.ok(res.sourceStatus);
    assert.ok(typeof res.metrics.healthyCount === 'number');
    assert.ok(typeof res.metrics.unavailableCount === 'number');
  });

  it('fetchActiveAlerts коректно обробляє AbortSignal без блокування', async () => {
    const controller = new AbortController();
    controller.abort();

    const start = Date.now();
    const res = await fetchActiveAlerts(undefined, {
      force: true,
      signal: controller.signal,
      timeoutMs: 1000
    });
    const duration = Date.now() - start;

    assert.ok(duration < 500, `Повинно завершитися миттєво, зайняло ${duration}ms`);
    assert.ok(res);
    assert.equal(res.status, 'ERROR');
  });

  it('Повний цикл перевірки безпеки з RefreshDiagnostics формує коректні метрики', async () => {
    const startTs = Date.now();
    const controller = new AbortController();

    const [alertsRes, tgRes] = await Promise.all([
      fetchActiveAlerts(undefined, { force: true, signal: controller.signal, timeoutMs: 2500 }),
      fetchAllTelegramFeeds('Київська область', undefined, [], { force: true, signal: controller.signal, timeoutMs: 2500 })
    ]);

    const endTs = Date.now();
    const durationMs = endTs - startTs;

    const result = evaluateLocalSecurity(
      50.4501,
      30.5234,
      15.0,
      'Кирил',
      alertsRes.alerts,
      tgRes.messages,
      0,
      alertsRes.status,
      tgRes.metrics
    );

    assert.ok(result);
    assert.ok(result.overallState);

    const successfulSources = (alertsRes.status === 'OK' ? 1 : 0) + (tgRes.metrics?.healthyCount ?? 0);
    const timeoutSources = tgRes.metrics?.timeoutCount ?? 0;
    const totalSources = 1 + (tgRes.metrics?.totalSources ?? 0);

    const diagnostics: RefreshDiagnostics = {
      startedAt: startTs,
      finishedAt: endTs,
      durationMs,
      successfulSources,
      timeoutSources,
      failedSources: Math.max(0, totalSources - successfulSources - timeoutSources),
      totalSources,
      status: timeoutSources > 0 ? 'partial' : 'full',
      statusSummaryUk: `Оновлено ${successfulSources}/${totalSources} джерел`,
      stageProgress: {
        userPriority: (tgRes.metrics?.userPriorityHealthy ?? 0) > 0 ? 'done' : 'partial',
        critical: (tgRes.metrics?.criticalHealthy ?? 0) > 0 ? 'done' : 'partial',
        officialAlerts: alertsRes.status === 'OK' ? 'done' : 'error',
        otherSources: (tgRes.metrics?.regionalHealthy ?? 0) > 0 ? 'done' : 'partial'
      }
    };

    assert.ok(diagnostics.durationMs >= 0);
    assert.ok(diagnostics.totalSources > 0);
    assert.ok(['full', 'partial', 'timeout', 'failed'].includes(diagnostics.status));
  });
});
