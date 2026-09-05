import test from 'node:test';
import assert from 'node:assert/strict';
import { AlertDeliveryService } from '../src/services/alertDeliveryService.js';
import type { AlertAssessment, DeviceSession } from '../src/types.js';

test('DANGER schedules no more than one repeat for a device and threat', async () => {
  const service = new AlertDeliveryService(5);
  const session = {
    deviceId: 'repeat-device', isCriticalAlertsEnabled: false, lastReceivedTs: 0,
    locationHealth: 'OLD_LOCATION', movementState: 'STATIONARY', protectionActive: true,
    alertCooldowns: {}, createdAt: Date.now(), updatedAt: Date.now()
  } satisfies DeviceSession;
  const assessment = {
    threatId: 'danger-1', category: 'UAV_STRIKE', distanceKm: 3, directionCompass: 'Пн',
    relevance: 'CRITICAL', severity: 'DANGER', alertRequired: true,
    alertTitle: '🚨 НЕБЕЗПЕКА ПОРУЧ', alertBody: 'БпЛА · 3.0 км · напрямок Пн', timestamp: Date.now()
  } satisfies AlertAssessment;
  let relevanceChecks = 0;
  const resolveCurrent = async () => { relevanceChecks++; return null; };

  assert.equal(service.scheduleDangerRepeat(session, assessment, resolveCurrent), true);
  assert.equal(service.scheduleDangerRepeat(session, assessment, resolveCurrent), false);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(relevanceChecks, 1);
});
