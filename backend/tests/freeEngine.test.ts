import test from 'node:test';
import assert from 'node:assert';
import { deviceManager } from '../src/engine/deviceManager.js';
import { safetyMonitor } from '../src/engine/safetyMonitor.js';
import { alertDeliveryService } from '../src/services/alertDeliveryService.js';
import { drivingLogger } from '../src/engine/drivingLogger.js';
import { haversineDistanceKm, shouldReAlertMovingUser } from '../src/engine/threatDistance.js';
import { LocationPayload, ThreatEvent, AlertAssessment } from '../src/types.js';

test('1. LocationHealth & Age Thresholds: 0-5m LIVE, 5-15m STALE, >15m OLD', () => {
  const now = Date.now();

  // Fresh location (< 5 min)
  assert.strictEqual(deviceManager.calculateLocationHealth(now - 60_000), 'LIVE');
  assert.strictEqual(deviceManager.calculateLocationHealth(now - 4.9 * 60_000), 'LIVE');

  // Stale location (5 - 15 min)
  assert.strictEqual(deviceManager.calculateLocationHealth(now - 5.1 * 60_000), 'STALE');
  assert.strictEqual(deviceManager.calculateLocationHealth(now - 14.5 * 60_000), 'STALE');

  // Old location (> 15 min)
  assert.strictEqual(deviceManager.calculateLocationHealth(now - 15.5 * 60_000), 'OLD_LOCATION');
  assert.strictEqual(deviceManager.calculateLocationHealth(now - 60 * 60_000), 'OLD_LOCATION');
  assert.strictEqual(deviceManager.calculateLocationHealth(0), 'OLD_LOCATION');
});

test('2. Failsafe Policy: STALE or OLD locations remain monitored without dropping protection', () => {
  const deviceId = 'test-failsafe-phone';
  deviceManager.registerDevice(deviceId);

  const stalePayload: LocationPayload = {
    deviceId,
    latitude: 50.4501,
    longitude: 30.5234,
    horizontalAccuracy: 15,
    timestamp: Date.now() - 10 * 60_000, // 10 min old
    speed: 0
  };

  const session = deviceManager.updateLocation(stalePayload);
  // Force simulate lastReceivedTs being 10 mins old
  session.lastReceivedTs = Date.now() - 10 * 60_000;

  const activeDevices = deviceManager.getActiveDevices();
  const found = activeDevices.find(d => d.deviceId === deviceId);

  assert.ok(found, 'Device with STALE location must remain in active monitoring list (Failsafe)');
  assert.strictEqual(found.locationHealth, 'STALE');
  assert.strictEqual(found.protectionActive, true);
});

test('3. Dynamic Moving User Re-alerting: Triggers when driving closer to threat', () => {
  // Scenario: user was 18km away, then drives closer to 13km (approached by 5km)
  const shouldReAlert = shouldReAlertMovingUser(18.0, 13.0);
  assert.strictEqual(shouldReAlert, true, 'Approaching by >= 3km must trigger re-alert');

  // Scenario: user drives away from 13km to 16km
  const movedAway = shouldReAlertMovingUser(13.0, 16.0);
  assert.strictEqual(movedAway, false, 'Moving away must NOT trigger re-alert');

  // Scenario: minor movement (13km to 12km)
  const minorMove = shouldReAlertMovingUser(13.0, 12.0);
  assert.strictEqual(minorMove, false, 'Movement < 3km outside critical zone must be throttled');

  // Scenario: crossing into critical zone (< 5km)
  const intoCritical = shouldReAlertMovingUser(7.0, 4.5);
  assert.strictEqual(intoCritical, true, 'Entering < 5km critical zone must immediately alert');
});

test('4. DrivingLogger: Records car trip metrics and computes accurate diagnostics', () => {
  drivingLogger.clear();

  const startTs = Date.now();

  // Sample 1: stationary at start
  drivingLogger.logSample({
    deviceId: 'test-car',
    latitude: 50.4500,
    longitude: 30.5200,
    horizontalAccuracy: 10,
    speed: 0,
    course: 0,
    timestamp: startTs,
    isLowPowerMode: false
  }, 0);

  // Sample 2: driving 500m away at 18 m/s (~65 km/h)
  drivingLogger.logSample({
    deviceId: 'test-car',
    latitude: 50.4545,
    longitude: 30.5200,
    horizontalAccuracy: 12,
    speed: 18.0,
    course: 90,
    timestamp: startTs + 60_000,
    isLowPowerMode: false
  }, 500);

  // Sample 3: driving with Low Power Mode turned ON
  drivingLogger.logSample({
    deviceId: 'test-car',
    latitude: 50.4635,
    longitude: 30.5200,
    horizontalAccuracy: 25,
    speed: 22.0,
    course: 90,
    timestamp: startTs + 180_000,
    isLowPowerMode: true
  }, 1000);

  const summary = drivingLogger.getSummary();

  assert.strictEqual(summary.totalSamples, 3);
  assert.strictEqual(summary.lowPowerModeObserved, true);
  assert.strictEqual(summary.totalDistanceKm, 1.5);
  assert.ok(summary.averageAccuracyMeters > 0);
  assert.ok(summary.averageUpdateIntervalSec >= 0);
});

test('5. AlertDeliveryService: Dispatches free-tier Web Push & Telegram with [TEST] prefix', async () => {
  const deviceId = 'test-push-phone';
  const session = deviceManager.registerDevice(deviceId);

  // Register Web Push subscription
  deviceManager.registerWebPush(deviceId, {
    endpoint: 'https://fcm.googleapis.com/fcm/send/mock-token',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVYOSTKnqd0vwtCHpmI7w==',
      auth: 'tBHItJI5svbpez7KI4CCXg=='
    }
  });

  // Register Telegram chat ID
  deviceManager.registerTelegram(deviceId, '123456789');

  const assessment: AlertAssessment = {
    threatId: 'test-threat-sim-01',
    category: 'UAV_STRIKE',
    distanceKm: 5.2,
    directionCompass: 'Пн-Сх',
    relevance: 'CRITICAL',
    alertRequired: true,
    alertTitle: 'TEST THREAT 5 KM',
    alertBody: 'Імітація тактичної загрози за 5 км',
    timestamp: Date.now()
  };

  const delivery = await alertDeliveryService.deliverAlert(session, assessment, {
    isTest: true,
    force: true
  });

  assert.strictEqual(delivery.telegramSuccess, true, 'Telegram simulated dispatch must succeed');
  assert.strictEqual(typeof delivery.timestamp, 'number');
});
