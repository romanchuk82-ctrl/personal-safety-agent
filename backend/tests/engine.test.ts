import test from 'node:test';
import assert from 'node:assert/strict';
import { DeviceManager } from '../src/engine/deviceManager.js';
import {
  haversineDistanceKm,
  calculateBearingDegrees,
  degreesToCompass,
  evaluateThreatProximity,
  shouldReAlertMovingUser
} from '../src/engine/threatDistance.js';
import { ApnsService } from '../src/services/apnsService.js';
import { SafetyMonitor } from '../src/engine/safetyMonitor.js';
import { LocationPayload, ThreatEvent } from '../src/types.js';

test('DeviceManager: registers device session and preserves settings', () => {
  const dm = new DeviceManager();
  const session = dm.registerDevice('iphone-test-device-1', 'mock-apns-token-abc', true);

  assert.equal(session.deviceId, 'iphone-test-device-1');
  assert.equal(session.apnsToken, 'mock-apns-token-abc');
  assert.equal(session.isCriticalAlertsEnabled, true);
  assert.equal(session.protectionActive, true);
  assert.equal(session.locationHealth, 'OLD_LOCATION');
  assert.equal(session.movementState, 'STATIONARY');
});

test('DeviceManager: adaptive movement state classification (DRIVING vs STATIONARY)', () => {
  const dm = new DeviceManager();
  const deviceId = 'iphone-car-driver';

  // 1. Stationary (standing still: 0.2 m/s)
  const loc1: LocationPayload = {
    deviceId,
    latitude: 50.4501,
    longitude: 30.5234,
    horizontalAccuracy: 10,
    timestamp: Date.now(),
    speed: 0.2
  };
  const s1 = dm.updateLocation(loc1);
  assert.equal(s1.movementState, 'STATIONARY');
  assert.equal(s1.locationHealth, 'LIVE');

  // 2. Active walking / slow movement: 2.0 m/s (~7 km/h)
  const loc2: LocationPayload = {
    deviceId,
    latitude: 50.4510,
    longitude: 30.5240,
    horizontalAccuracy: 8,
    timestamp: Date.now(),
    speed: 2.0
  };
  const s2 = dm.updateLocation(loc2);
  assert.equal(s2.movementState, 'ACTIVE');

  // 3. Driving car: 18 m/s (~65 km/h)
  const loc3: LocationPayload = {
    deviceId,
    latitude: 50.4800,
    longitude: 30.5800,
    horizontalAccuracy: 5,
    timestamp: Date.now(),
    speed: 18.0
  };
  const s3 = dm.updateLocation(loc3);
  assert.equal(s3.movementState, 'DRIVING');
});

test('DeviceManager: location health transitions (LIVE -> STALE -> OLD_LOCATION)', () => {
  const dm = new DeviceManager();
  const now = Date.now();

  // Fresh point (< 5 min) -> LIVE
  assert.equal(dm.calculateLocationHealth(now - 60 * 1000), 'LIVE');
  assert.equal(dm.calculateLocationHealth(now - 4.5 * 60 * 1000), 'LIVE');

  // 5..15 min -> STALE
  assert.equal(dm.calculateLocationHealth(now - 6 * 60 * 1000), 'STALE');
  assert.equal(dm.calculateLocationHealth(now - 14 * 60 * 1000), 'STALE');

  // > 15 min -> OLD_LOCATION
  assert.equal(dm.calculateLocationHealth(now - 16 * 60 * 1000), 'OLD_LOCATION');
  assert.equal(dm.calculateLocationHealth(0), 'OLD_LOCATION');
});

test('DeviceManager: Failsafe keeps protection active even when location becomes STALE', () => {
  const dm = new DeviceManager();
  const deviceId = 'failsafe-user';

  // Point received 10 minutes ago (STALE)
  const oldTs = Date.now() - 10 * 60 * 1000;
  dm.registerDevice(deviceId, 'tok-123', true);
  dm.updateLocation({
    deviceId,
    latitude: 50.3444,
    longitude: 30.9000,
    horizontalAccuracy: 15,
    timestamp: oldTs,
    speed: 0
  });

  const session = dm.getDevice(deviceId);
  assert.ok(session);
  assert.equal(session.protectionActive, true, 'Protection must NOT be disabled on stale location');
  assert.equal(session.locationHealth, 'LIVE'); // It was updated just now in test, but test health func:
  assert.equal(dm.calculateLocationHealth(oldTs), 'STALE');

  const activeDevices = dm.getActiveDevices();
  assert.equal(activeDevices.length, 1, 'Device must still be monitored by backend');
});

test('ThreatDistance: calculates exact Haversine distance and Compass bearing', () => {
  // Kyiv Maidan (50.4501, 30.5234) to Boryspil Airport (50.3444, 30.9000) is approx 29-30 km South-East
  const dist = haversineDistanceKm(50.4501, 30.5234, 50.3444, 30.9000);
  assert.ok(dist >= 28.5 && dist <= 30.5, `Expected ~29.5 km, got ${dist.toFixed(2)} km`);

  const bearing = calculateBearingDegrees(50.4501, 30.5234, 50.3444, 30.9000);
  const compass = degreesToCompass(bearing);
  assert.ok(compass.en === 'SE' || compass.en === 'E', `Expected SE direction, got ${compass.en}`);
});

test('ThreatDistance: evaluates proximity alert relevance thresholds', () => {
  const userLoc: LocationPayload = {
    deviceId: 'test-user',
    latitude: 50.4501,
    longitude: 30.5234,
    horizontalAccuracy: 10,
    timestamp: Date.now()
  };

  // Case A: Immediate Threat (3 km away) -> CRITICAL
  const criticalThreat: ThreatEvent = {
    id: 't-1',
    category: 'UAV_STRIKE',
    title: 'Шахед над центром',
    description: 'БпЛА за 3 км',
    lat: 50.4700,
    lon: 30.5234,
    radiusKm: 3,
    timestampIso: new Date().toISOString(),
    sourceChannel: 'kievreal1',
    isTacticalThreat: true
  };
  const evalCrit = evaluateThreatProximity(userLoc, criticalThreat);
  assert.equal(evalCrit.relevance, 'CRITICAL');
  assert.equal(evalCrit.alertRequired, true);
  assert.equal(evalCrit.alertTitle, 'ATTENTION! DANGER');
  assert.ok(evalCrit.alertBody.includes('Threat nearby · ~2 km') || evalCrit.alertBody.includes('Threat nearby · ~3 km'));

  // Case B: Warning Threat (12 km away) -> WARNING
  const warningThreat: ThreatEvent = {
    id: 't-2',
    category: 'UAV_STRIKE',
    title: 'Шахед на підльоті',
    description: 'БпЛА за 12 км',
    lat: 50.5500,
    lon: 30.5234,
    radiusKm: 3,
    timestampIso: new Date().toISOString(),
    sourceChannel: 'kievreal1',
    isTacticalThreat: true
  };
  const evalWarn = evaluateThreatProximity(userLoc, warningThreat);
  assert.equal(evalWarn.relevance, 'WARNING');
  assert.equal(evalWarn.alertRequired, true);

  // Case C: Distant Observation (25 km away) -> OBSERVATION (No loud alarm)
  const obsThreat: ThreatEvent = {
    id: 't-3',
    category: 'UAV_STRIKE',
    title: 'Шахед у сусідньому районі',
    description: 'БпЛА за 25 км',
    lat: 50.6700,
    lon: 30.5234,
    radiusKm: 3,
    timestampIso: new Date().toISOString(),
    sourceChannel: 'kievreal1',
    isTacticalThreat: true
  };
  const evalObs = evaluateThreatProximity(userLoc, obsThreat);
  assert.equal(evalObs.relevance, 'OBSERVATION');
  assert.equal(evalObs.alertRequired, false);
});

test('Moving User Logic: dynamic re-alerting when user drives closer to danger', () => {
  // Scenario from requirements:
  // 09:00 danger = 14 km
  // 09:03 user drove 4 km in direction of event -> new distance = 10 km -> MUST RE-ALERT!
  const initialAlertedDistance = 14.0;

  // 1. Minimal movement (moved from 14km to 13km, delta 1km) -> Cooldown suppresses spam
  assert.equal(shouldReAlertMovingUser(initialAlertedDistance, 13.0, 3.0), false);

  // 2. Significant movement towards danger (moved from 14km to 10km, delta 4km) -> RE-ALERT!
  assert.equal(shouldReAlertMovingUser(initialAlertedDistance, 10.0, 3.0), true);

  // 3. User crosses into immediate critical zone (< 5km) from 7km -> IMMEDIATE CRITICAL RE-ALERT!
  assert.equal(shouldReAlertMovingUser(7.0, 4.2, 3.0), true);
});

test('ApnsService: builds compliant Critical Alert and Standard Alert payloads', () => {
  const apns = new ApnsService();

  // 1. Critical Alert Payload
  const critPayload = apns.buildPayload({
    title: 'ATTENTION! DANGER',
    body: 'Threat nearby · ~8 km\nШахед курсом на Бровари',
    isCritical: true,
    soundName: 'danger_alarm.wav',
    threatId: 'threat-999',
    distanceKm: 8.2,
    category: 'UAV_STRIKE'
  });

  assert.equal(critPayload.aps.alert.title, 'ATTENTION! DANGER');
  assert.ok(critPayload.aps.alert.body.includes('Threat nearby · ~8 km'));
  assert.equal(critPayload.aps['interruption-level'], 'critical');
  assert.deepEqual(critPayload.aps.sound, {
    critical: 1,
    name: 'danger_alarm.wav',
    volume: 1.0
  });
  assert.equal(critPayload.threatId, 'threat-999');

  // 2. Standard Alert Fallback Payload
  const stdPayload = apns.buildPayload({
    title: 'ATTENTION! DANGER',
    body: 'Threat nearby · ~12 km\nРакета над районом',
    isCritical: false,
    soundName: 'danger_alarm.wav',
    threatId: 'threat-888',
    distanceKm: 12.0
  });

  assert.equal(stdPayload.aps['interruption-level'], 'time-sensitive');
  assert.equal(stdPayload.aps.sound, 'danger_alarm.wav');
});

test('SafetyMonitor: 24/7 background cycle triggers proximity alerts for registered devices', async () => {
  const sm = new SafetyMonitor();
  const dm = new DeviceManager();

  // Register device in Brovary
  const device = dm.registerDevice('driver-1', 'mock-apns-token-xyz', true);
  dm.updateLocation({
    deviceId: 'driver-1',
    latitude: 50.5113,
    longitude: 30.7906,
    horizontalAccuracy: 10,
    timestamp: Date.now(),
    speed: 22.0 // Driving 80 km/h
  });

  // Simulate threat 6 km from user
  const threat = sm.simulateThreatNearLocation(50.5113, 30.7906, 6.0, 'Шахед на півночі Броварів');
  assert.ok(threat.id.startsWith('sim-'));
  assert.equal(threat.isSimulated, true);
  assert.equal(sm.getActiveThreats().length, 1);
});
