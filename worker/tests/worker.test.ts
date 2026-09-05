import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { haversineDistanceKm, calculateBearingDegrees, degreesToCompassUk, evaluateThreatProximity, shouldReAlertMovingUser } from '../src/threatDistance.js';
import { KvStorage } from '../src/kvStorage.js';
import { ThreatEvent, LocationPayload, Env } from '../src/types.js';

const mockEnv: Env = {
  PSA_STORAGE: null as any,
  ENVIRONMENT: 'test',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'BFM9HkzYgwAYdTY5VYhj_Gfm39qhGL5vs7vy9iuj1-vBt8eXFqH9j0wh7qgh2_ScpX-LWhIKfHogc7wgSl0flRk',
  VAPID_PRIVATE_KEY: 'mock_test_vapid_private_key',
  VAPID_SUBJECT: 'mailto:security@personal-safety.app'
};

const mockCtx: ExecutionContext = {
  waitUntil: (p: Promise<any>) => {},
  passThroughOnException: () => {}
};

test('1. Worker: GET /healthz returns status ok, cycle and sources', async () => {
  const req = new Request('https://worker.local/healthz', { method: 'GET' });
  const res = await worker.fetch(req, mockEnv, mockCtx);

  assert.equal(res.status, 200);
  const data: any = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.monitoringActive, true);
  assert.ok(data.server.includes('Cloud Engine'));
  assert.ok(data.sources.officialAlerts);
  assert.ok(data.sources.telegramFeeds);
});

test('2. Worker: POST /api/device/subscribe-push stores subscription in KV', async () => {
  const payload = {
    deviceId: 'iphone-test-device',
    subscription: {
      endpoint: 'https://web.push.apple.com/test-endpoint-abc',
      keys: {
        p256dh: 'test-p256dh',
        auth: 'test-auth'
      }
    },
    location: {
      deviceId: 'iphone-test-device',
      latitude: 50.4501,
      longitude: 30.5234,
      name: 'Київ (Центр)',
      oblast: 'м. Київ'
    }
  };

  const req = new Request('https://worker.local/api/device/subscribe-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const res = await worker.fetch(req, mockEnv, mockCtx);
  assert.equal(res.status, 200);
  const data: any = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.hasWebPush, true);
  assert.equal(data.locationHealth, 'LIVE');

  // Verify stored in KvStorage
  const session = await KvStorage.getDevice(mockEnv, 'iphone-test-device');
  assert.ok(session);
  assert.equal(session.deviceId, 'iphone-test-device');
  assert.equal(session.webPushSubscription?.endpoint, 'https://web.push.apple.com/test-endpoint-abc');
  assert.equal(session.lastLocation?.name, 'Київ (Центр)');
});

test('3. Worker: GET /api/device/push-status verifies durable registration', async () => {
  const req = new Request(
    'https://worker.local/api/device/push-status?deviceId=iphone-test-device&endpoint=https://web.push.apple.com/test-endpoint-abc',
    { method: 'GET' }
  );

  const res = await worker.fetch(req, mockEnv, mockCtx);
  assert.equal(res.status, 200);
  const data: any = await res.json();
  assert.equal(data.registered, true);
  assert.equal(data.subscriptionFound, true);
  assert.equal(data.endpointMatches, true);
});

test('4. ThreatDistance: evaluates DANGER (<= 5 km) with 🚨 НЕБЕЗПЕКА ПОРУЧ', () => {
  const userLoc: LocationPayload = {
    deviceId: 'test-dev',
    latitude: 50.4501,
    longitude: 30.5234
  };

  const threat: ThreatEvent = {
    id: 'threat-danger-1',
    category: 'UAV_STRIKE',
    title: 'Шахед курсом на центр',
    description: 'БпЛА за 4 км',
    lat: 50.4850,
    lon: 30.5234, // ~3.8 km North
    radiusKm: 5.0,
    timestampIso: new Date().toISOString()
  };

  const assessment = evaluateThreatProximity(userLoc, threat);
  assert.equal(assessment.severity, 'DANGER');
  assert.equal(assessment.relevance, 'CRITICAL');
  assert.equal(assessment.alertRequired, true);
  assert.equal(assessment.alertTitle, '🚨 НЕБЕЗПЕКА ПОРУЧ');
  assert.ok(assessment.distanceKm <= 5.0);
});

test('5. ThreatDistance: evaluates WARNING (5-15 km)', () => {
  const userLoc: LocationPayload = {
    deviceId: 'test-dev',
    latitude: 50.4501,
    longitude: 30.5234
  };

  const threat: ThreatEvent = {
    id: 'threat-warning-1',
    category: 'UAV_STRIKE',
    title: 'Шахед на підльоті',
    description: 'БпЛА за 11 км',
    lat: 50.5500,
    lon: 30.5234, // ~11 km North
    radiusKm: 5.0,
    timestampIso: new Date().toISOString()
  };

  const assessment = evaluateThreatProximity(userLoc, threat);
  assert.equal(assessment.severity, 'WARNING');
  assert.equal(assessment.relevance, 'TACTICAL');
  assert.equal(assessment.alertRequired, true);
  assert.equal(assessment.alertTitle, '⚠️ ПОПЕРЕДЖЕННЯ ПРО ЦІЛЬ');
});

test('6. Moving User Logic: triggers re-alert when distance shrinks', () => {
  assert.equal(shouldReAlertMovingUser(undefined, 10.0), true);
  // User stayed at same distance
  assert.equal(shouldReAlertMovingUser(10.0, 9.8), false);
  // User closed distance by 2.5 km
  assert.equal(shouldReAlertMovingUser(10.0, 7.5), true);
  // User entered DANGER zone (<= 5 km from > 5 km)
  assert.equal(shouldReAlertMovingUser(6.0, 4.8), true);
});

test('7. Worker: GET /api/alerts/active returns live or open alerts payload with CORS', async () => {
  const req = new Request('https://worker.local/api/alerts/active', { method: 'GET' });
  const res = await worker.fetch(req, mockEnv, mockCtx);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  const data: any = await res.json();
  assert.ok(Array.isArray(data.alerts));
  assert.ok(data.meta);
});

test('8. Worker: POST /api/alerts/all-clear purges tactical threats and resets cooldowns', async () => {
  // First seed an active threat and device with cooldowns
  const threat: ThreatEvent = {
    id: 'test-threat-to-clear',
    category: 'UAV_STRIKE',
    title: 'Шахед над містом',
    description: 'БпЛА в напрямку Київ',
    lat: 50.4501,
    lon: 30.5234,
    radiusKm: 5.0,
    timestampIso: new Date().toISOString()
  };
  await KvStorage.saveActiveThreats(mockEnv, [threat]);

  const session = await KvStorage.getDevice(mockEnv, 'iphone-test-device');
  if (session) {
    session.alertCooldowns = { 'test-threat-to-clear': 3.5 };
    session.dangerRepeatsDispatched = { 'test-threat-to-clear': true };
    await KvStorage.saveDevice(mockEnv, session);
  }

  // Trigger all-clear
  const req = new Request('https://worker.local/api/alerts/all-clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: 'iphone-test-device', clearAll: true })
  });
  const res = await worker.fetch(req, mockEnv, mockCtx);
  assert.equal(res.status, 200);
  const data: any = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.clearedThreats >= 1);

  // Verify threats are cleared
  const activeThreats = await KvStorage.getActiveThreats(mockEnv);
  assert.equal(activeThreats.length, 0);

  // Verify device cooldowns are cleared
  const updatedSession = await KvStorage.getDevice(mockEnv, 'iphone-test-device');
  assert.deepEqual(updatedSession?.alertCooldowns, {});
  assert.deepEqual(updatedSession?.dangerRepeatsDispatched, {});
});

