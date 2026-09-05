import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DeviceManager } from '../src/engine/deviceManager.js';

test('Web Push registration survives a DeviceManager restart', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psa-push-'));
  const storageFile = path.join(dir, 'devices.json');
  const subscription = {
    endpoint: 'https://push.example.test/subscription-1',
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' }
  };

  const firstProcess = new DeviceManager(storageFile);
  firstProcess.registerWebPush('ios-persistent-device', subscription);
  assert.equal(firstProcess.isPersistenceReady(), true);

  const restartedProcess = new DeviceManager(storageFile);
  const restored = restartedProcess.getDevice('ios-persistent-device');
  assert.equal(restored?.webPushSubscription?.endpoint, subscription.endpoint);
  assert.equal(restored?.webPushSubscription?.keys.auth, subscription.keys.auth);
  assert.equal(restartedProcess.isPersistenceReady(), true);
});
