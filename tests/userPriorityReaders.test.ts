import test from 'node:test';
import assert from 'node:assert';
import {
  USER_PRIORITY_CHANNELS,
  getPrioritizedChannels,
  fetchAllTelegramFeeds,
  fetchChannelMessages,
  parseTelegramHtml,
  channelReaderStates,
  __resetTelegramScraperStateForTests,
  ChannelConfig
} from '../lib/sources/telegramScraper';
import { classifyThreat } from '../lib/threatClassifier';
import { evaluateLocalSecurity } from '../lib/matcher';

test('User Priority: default list contains valid priority channels', () => {
  assert.ok(USER_PRIORITY_CHANNELS.length >= 7, 'Should have at least 7 default priority channels');
  const seen = new Set<string>();
  for (const ch of USER_PRIORITY_CHANNELS) {
    assert.strictEqual(ch.tier, 'USER_PRIORITY');
    assert.strictEqual(ch.priority, 1);
    assert.ok(ch.username.length > 0);
    assert.ok(!seen.has(ch.username.toLowerCase()), `Duplicate priority channel: ${ch.username}`);
    seen.add(ch.username.toLowerCase());
  }
});

test('User Priority: dynamic userPriorityUsernames elevates channels to Tier 1', () => {
  const dynamicPriorities = ['vanek_nikolaev', 'air_alert_ua', 'kievreal1'];
  const prioritized = getPrioritizedChannels('Київська область', [], dynamicPriorities);

  const vanek = prioritized.find(c => c.username.toLowerCase() === 'vanek_nikolaev');
  assert.ok(vanek, 'vanek_nikolaev should be present in prioritized channels');
  assert.strictEqual(vanek.tier, 'USER_PRIORITY', 'vanek_nikolaev should be elevated to USER_PRIORITY');
  assert.strictEqual(vanek.priority, 1, 'vanek_nikolaev should have highest priority 1');

  const kievreal1 = prioritized.find(c => c.username.toLowerCase() === 'kievreal1');
  assert.ok(kievreal1);
  assert.strictEqual(kievreal1.tier, 'USER_PRIORITY');

  // Channel not in dynamic priorities is treated as non-priority (REGIONAL)
  const hajun = prioritized.find(c => c.username.toLowerCase() === 'hajun_by');
  assert.ok(hajun);
  assert.strictEqual(hajun.tier, 'REGIONAL', 'Channels deselected by user become REGIONAL');
});

test('Multi-Reader HTML Parser: parses standard t.me/s web preview HTML', () => {
  const sampleWebPreview = `
    <div class="tgme_widget_message_wrap">
      <div class="tgme_widget_message" data-post="kievreal1/1001">
        <div class="tgme_widget_message_text js-message_text" dir="auto">
          ⚠️ УВАГА! Шахед у напрямку Броварів з півночі! Перебувайте в укриттях!
        </div>
        <time class="time" datetime="2026-09-05T08:30:00+03:00">08:30</time>
      </div>
    </div>
  `;

  const dummyChannel: ChannelConfig = {
    username: 'kievreal1',
    title: 'Реальний Київ',
    category: 'user_custom',
    region: 'Київ',
    weight: 0.98,
    priority: 1,
    tier: 'USER_PRIORITY'
  };

  const messages = parseTelegramHtml(sampleWebPreview, dummyChannel);
  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0].channel, 'kievreal1');
  assert.ok(messages[0].text.includes('Шахед у напрямку Броварів'));
  assert.strictEqual(messages[0].authorityWeight, 0.98);
  assert.strictEqual(messages[0].timeIso, '2026-09-05T08:30:00+03:00');
});

test('Multi-Reader HTML Parser: parses Telegram embed widget HTML (?embed=1)', () => {
  const sampleEmbedWidget = `
    <div class="tgme_widget_message" data-post="tlknews/5432">
      <div class="tgme_widget_message_bubble">
        <div class="tgme_widget_message_text js-message_text">
          🔴 Пуски крилатих ракет стратегічною авіацією Ту-95МС.
        </div>
        <time class="tgme_widget_message_date" datetime="2026-09-05T09:15:00+03:00">09:15</time>
      </div>
    </div>
  `;

  const dummyChannel: ChannelConfig = {
    username: 'tlknews',
    title: 'ТЛК Новини',
    category: 'user_custom',
    region: 'Вся Україна',
    weight: 0.96,
    priority: 1,
    tier: 'USER_PRIORITY'
  };

  const messages = parseTelegramHtml(sampleEmbedWidget, dummyChannel);
  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0].channel, 'tlknews');
  assert.ok(messages[0].text.includes('Пуски крилатих ракет'));
  assert.strictEqual(messages[0].timeIso, '2026-09-05T09:15:00+03:00');
});

test('Multi-Reader Fallback: automatically fails over when primary reader errors', async () => {
  __resetTelegramScraperStateForTests();

  const originalFetch = global.fetch;
  let fetchAttempts: string[] = [];

  const dummyChannel: ChannelConfig = {
    username: 'test_priority_chan',
    title: 'Test Priority Channel',
    category: 'user_custom',
    region: 'Київ',
    weight: 0.95,
    priority: 1,
    tier: 'USER_PRIORITY'
  };

  try {
    // Mock fetch: fail on first reader (r.jina.ai), succeed on second reader (corsproxy.io)
    global.fetch = (async (url: any, opts: any) => {
      const urlStr = url.toString();
      fetchAttempts.push(urlStr);

      if (urlStr.includes('r.jina.ai/https://t.me/s/')) {
        // Preferred reader fails with 502 Bad Gateway
        return new Response('Upstream error', { status: 502, statusText: 'Bad Gateway' });
      }

      if (urlStr.includes('corsproxy.io')) {
        // Fallback reader succeeds
        const html = `
          <div class="tgme_widget_message" data-post="test_priority_chan/42">
            <div class="tgme_widget_message_text js-message_text">
              🚀 Зафіксовано рух БпЛА повз Бориспіль на південь.
            </div>
            <time class="time" datetime="2026-09-05T10:00:00Z">10:00</time>
          </div>
        `;
        return new Response(html, { status: 200, statusText: 'OK' });
      }

      return new Response('Not found', { status: 404 });
    }) as any;

    const result = await fetchChannelMessages(dummyChannel, { force: true });

    assert.strictEqual(result.statusCategory, 'healthy');
    assert.strictEqual(result.health, 'ONLINE');
    assert.strictEqual(result.messages.length, 1);
    assert.ok(result.messages[0].text.includes('Бориспіль'));
    assert.strictEqual(result.isFallback, true, 'isFallback flag should be true');
    assert.strictEqual(result.readerUsed, 'CorsProxy.io');

    const state = channelReaderStates['test_priority_chan'];
    assert.ok(state, 'Reader state must be recorded for test_priority_chan');
    assert.strictEqual(state.preferredReader, 'jina_html');
    assert.strictEqual(state.activeReader, 'corsproxy_io');
    assert.strictEqual(state.fallbackReader, 'corsproxy_io');
    assert.ok(state.lastSuccessfulReadTs > 0);
    assert.strictEqual(state.failoverCount, 1);

    // Verify fetch attempts tried preferred reader first, then fallback
    assert.ok(fetchAttempts.length >= 2);
    assert.ok(fetchAttempts[0].includes('r.jina.ai'));
    assert.ok(fetchAttempts[1].includes('corsproxy.io'));
  } finally {
    global.fetch = originalFetch;
    __resetTelegramScraperStateForTests();
  }
});

test('Multi-Reader Recovery: primary reader recovery clears fallback status', async () => {
  __resetTelegramScraperStateForTests();

  const originalFetch = global.fetch;
  const dummyChannel: ChannelConfig = {
    username: 'test_recovery_chan',
    title: 'Test Recovery Channel',
    category: 'user_custom',
    region: 'Київ',
    weight: 0.95,
    priority: 1,
    tier: 'USER_PRIORITY'
  };

  try {
    // 1. Initial run: primary fails, fallback succeeds
    global.fetch = (async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('r.jina.ai/https://t.me/s/')) {
        return new Response('HTTP 500 Server Error', { status: 500 });
      }
      if (urlStr.includes('corsproxy.io')) {
        return new Response(`
          <div class="tgme_widget_message" data-post="test_recovery_chan/1">
            <div class="tgme_widget_message_text js-message_text">Повідомлення 1</div>
            <time class="time" datetime="2026-09-05T10:05:00Z">10:05</time>
          </div>
        `, { status: 200 });
      }
      return new Response('404', { status: 404 });
    }) as any;

    const res1 = await fetchChannelMessages(dummyChannel, { force: true });
    assert.strictEqual(res1.isFallback, true);
    assert.strictEqual(channelReaderStates['test_recovery_chan'].fallbackReader, 'corsproxy_io');

    // 2. Second run: primary reader (jina_html) recovers!
    global.fetch = (async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('r.jina.ai/https://t.me/s/')) {
        return new Response(`
          <div class="tgme_widget_message" data-post="test_recovery_chan/2">
            <div class="tgme_widget_message_text js-message_text">Повідомлення 2 (Відновлено)</div>
            <time class="time" datetime="2026-09-05T10:10:00Z">10:10</time>
          </div>
        `, { status: 200 });
      }
      return new Response('404', { status: 404 });
    }) as any;

    const res2 = await fetchChannelMessages(dummyChannel, { force: true });
    assert.strictEqual(res2.isFallback, false, 'Should no longer be fallback after primary recovery');
    assert.strictEqual(res2.readerUsed, 'Jina HTML Proxy');
    assert.strictEqual(channelReaderStates['test_recovery_chan'].activeReader, 'jina_html');
    assert.strictEqual(channelReaderStates['test_recovery_chan'].fallbackReader, undefined);
  } finally {
    global.fetch = originalFetch;
    __resetTelegramScraperStateForTests();
  }
});

test('Diagnostics Metrics: calculates userPriority metrics accurately', async () => {
  __resetTelegramScraperStateForTests();

  const originalFetch = global.fetch;

  try {
    // Mock fetch where kievreal1 succeeds directly, Hajun_BY uses fallback, and tlknews fails
    global.fetch = (async (url: any) => {
      const urlStr = url ? url.toString() : '';
      const lowerUrl = urlStr.toLowerCase();
      if (lowerUrl.includes('kievreal1')) {
        return new Response(`
          <div class="tgme_widget_message" data-post="kievreal1/1">
            <div class="tgme_widget_message_text js-message_text">Київ спокійно</div>
            <time class="time" datetime="2026-09-05T10:20:00Z">10:20</time>
          </div>
        `, { status: 200 });
      }
      if (lowerUrl.includes('hajun_by')) {
        if (lowerUrl.includes('r.jina.ai')) {
          return new Response('Error', { status: 500 });
        }
        if (lowerUrl.includes('corsproxy.io')) {
          return new Response(`
            <div class="tgme_widget_message" data-post="Hajun_BY/1">
              <div class="tgme_widget_message_text js-message_text">Авіація активна</div>
              <time class="time" datetime="2026-09-05T10:21:00Z">10:21</time>
            </div>
          `, { status: 200 });
        }
      }
      return new Response('Error', { status: 500 });
    }) as any;

    // Test with 3 priority channels: kievreal1, Hajun_BY, tlknews
    const customPriorities = ['kievreal1', 'Hajun_BY', 'tlknews'];
    const { metrics, sourceStatus } = await fetchAllTelegramFeeds(
      'Київ',
      undefined,
      [],
      { force: true },
      customPriorities
    );

    assert.strictEqual(metrics.userPriorityTotal, 3);
    assert.strictEqual(metrics.userPriorityHealthy, 2, '2 of 3 priority channels should be healthy');
    assert.strictEqual(metrics.userPriorityFallbackCount, 1, 'Hajun_BY should be counted as fallback');
    assert.strictEqual(metrics.userPriorityFailedCount, 1, 'tlknews should be counted as failed');

    // Verify sourceStatus fields
    const kiev = sourceStatus['kievreal1'];
    assert.strictEqual(kiev.ok, true);
    assert.strictEqual(kiev.isFallbackActive, false);
    assert.ok(kiev.lastSuccessfulReadTs! > 0);

    const hajun = sourceStatus['hajun_by'];
    assert.strictEqual(hajun.ok, true);
    assert.strictEqual(hajun.isFallbackActive, true);
    assert.strictEqual(hajun.fallbackReader, 'corsproxy_io');
    assert.ok(hajun.lastSuccessfulReadTs! > 0);

    const tlk = sourceStatus['tlknews'];
    assert.strictEqual(tlk.ok, false);
    assert.strictEqual(tlk.health, 'FAILED');
  } finally {
    global.fetch = originalFetch;
    __resetTelegramScraperStateForTests();
  }
});

test('End-to-End Pipeline: Priority Telegram message reaches threat classifier and security assessment', () => {
  const dummyHtml = `
    <div class="tgme_widget_message" data-post="kievreal1/9999">
      <div class="tgme_widget_message_text js-message_text">
        🔴 ТЕРМІНОВО! 2х БпЛА типу Shahed курсом на Бровари та Київ (Троєщина)! Не ігноруйте тривогу!
      </div>
      <time class="time" datetime="${new Date().toISOString()}">щойно</time>
    </div>
  `;

  const priorityChan: ChannelConfig = {
    username: 'kievreal1',
    title: 'Реальний Київ',
    category: 'user_custom',
    region: 'Київ та область',
    weight: 0.98,
    priority: 1,
    tier: 'USER_PRIORITY'
  };

  // Step 1: Ingestion & Parser
  const messages = parseTelegramHtml(dummyHtml, priorityChan);
  assert.strictEqual(messages.length, 1);
  const msg = messages[0];

  // Step 2: Standalone Threat Classification
  const classification = classifyThreat(msg.text);
  assert.strictEqual(classification.category, 'UAV_STRIKE');
  assert.strictEqual(classification.isTacticalThreat, true);

  // Step 3: Local Security Evaluation for user in Brovary (50.5113, 30.7906)
  const evalResult = evaluateLocalSecurity(
    50.5113,
    30.7906,
    15.0,
    'Користувач',
    [],
    [msg],
    undefined,
    'OK',
    {
      totalSources: 73,
      monitoredSources: 73,
      healthyCount: 70,
      unavailableCount: 3,
      disabledCount: 0,
      criticalTotal: 15,
      criticalHealthy: 15,
      lastSuccessfulCycleTs: Date.now(),
      lastRealDataTimestamp: Date.now(),
      lastRealDataIso: new Date().toISOString()
    } as any
  );

  // User is at the exact location of incoming Shahed threat -> must be RED / DANGER
  assert.strictEqual(evalResult.overallState, 'RED', 'User should be in RED state due to direct drone threat in Brovary');
  assert.ok(evalResult.threatsCount >= 1);
  assert.ok(evalResult.confirmedThreatsList.length >= 1);
  assert.ok(evalResult.stateDescriptionUk.length > 5);
});
