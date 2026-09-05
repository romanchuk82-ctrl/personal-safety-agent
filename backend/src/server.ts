import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { deviceManager } from './engine/deviceManager.js';
import { safetyMonitor } from './engine/safetyMonitor.js';
import { apnsService } from './services/apnsService.js';
import { alertDeliveryService } from './services/alertDeliveryService.js';
import { drivingLogger } from './engine/drivingLogger.js';
import { LocationPayload, WebPushSubscription, SigningHealth, AlertAssessment } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Start the 24/7 background safety engine
safetyMonitor.start();

/**
 * Health check
 */
app.get('/healthz', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    server: 'Personal Safety Backend Engine',
    timestamp: Date.now(),
    monitoringActive: true,
    lastMonitoringCycle: safetyMonitor.getLastCycleTimestamp()
  });
});

/**
 * Register device and optional APNs token
 */
app.post('/api/device/register', (req: Request, res: Response) => {
  const { deviceId, apnsToken, isCriticalAlertsEnabled } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const session = deviceManager.registerDevice(
    deviceId,
    apnsToken,
    !!isCriticalAlertsEnabled
  );

  res.json({
    success: true,
    message: 'Device registered successfully',
    session
  });
});

/**
 * Register Web Push subscription ($0 free iPhone push alerts)
 */
app.post('/api/device/subscribe-push', (req: Request, res: Response) => {
  const { deviceId, subscription } = req.body as { deviceId: string; subscription: WebPushSubscription };

  if (!deviceId || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'deviceId and valid subscription are required' });
  }

  const session = deviceManager.registerWebPush(deviceId, subscription);
  res.json({
    success: true,
    message: 'Web Push subscription registered successfully',
    hasWebPush: !!session.webPushSubscription
  });
});

/**
 * Register Telegram chat ID ($0 free push alert fallback)
 */
app.post('/api/device/register-telegram', (req: Request, res: Response) => {
  const { deviceId, chatId } = req.body as { deviceId: string; chatId: string };

  if (!deviceId || !chatId) {
    return res.status(400).json({ error: 'deviceId and chatId are required' });
  }

  const session = deviceManager.registerTelegram(deviceId, String(chatId).trim());
  res.json({
    success: true,
    message: 'Telegram alerts configured successfully',
    telegramChatId: session.telegramChatId
  });
});

/**
 * Report App Signing Health (7-day Personal Team profile status from companion)
 */
app.post('/api/device/signing-health', (req: Request, res: Response) => {
  const { deviceId, signingHealth } = req.body as { deviceId: string; signingHealth: SigningHealth };

  if (!deviceId || !signingHealth) {
    return res.status(400).json({ error: 'deviceId and signingHealth are required' });
  }

  const session = deviceManager.updateSigningHealth(deviceId, signingHealth);
  res.json({
    success: true,
    signingHealth: session.signingHealth
  });
});

/**
 * Ingest location from iPhone Core Location
 */
app.post('/api/device/location', async (req: Request, res: Response) => {
  const payload: LocationPayload = req.body;

  if (!payload.deviceId || typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') {
    return res.status(400).json({ error: 'Invalid location payload' });
  }

  const updatedSession = deviceManager.updateLocation(payload);

  // Check threats for this device
  let activeThreatsCount = 0;
  for (const threat of safetyMonitor.getActiveThreats()) {
    activeThreatsCount++;
  }

  res.json({
    success: true,
    deviceId: updatedSession.deviceId,
    locationHealth: updatedSession.locationHealth,
    movementState: updatedSession.movementState,
    lastReceivedTs: updatedSession.lastReceivedTs,
    activeThreatsCount
  });
});

/**
 * Get device & monitoring diagnostic status
 */
app.get('/api/device/status', (req: Request, res: Response) => {
  const deviceId = req.query.deviceId as string;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId query param is required' });
  }

  const session = deviceManager.getDevice(deviceId);
  const lastCycle = safetyMonitor.getLastCycleTimestamp();
  const activeThreats = safetyMonitor.getActiveThreats();

  if (!session) {
    return res.json({
      registered: false,
      serverOnline: true,
      lastMonitoringCycle: lastCycle,
      locationHealth: 'OLD_LOCATION',
      movementState: 'STATIONARY',
      protectionActive: false,
      activeThreatsCount: activeThreats.length
    });
  }

  const locationAgeSec = session.lastReceivedTs > 0 
    ? Math.round((Date.now() - session.lastReceivedTs) / 1000) 
    : null;

  res.json({
    registered: true,
    deviceId: session.deviceId,
    serverOnline: true,
    lastMonitoringCycle: lastCycle,
    lastMonitoringCycleAgeSec: lastCycle > 0 ? Math.round((Date.now() - lastCycle) / 1000) : null,
    protectionActive: session.protectionActive,
    locationHealth: session.locationHealth,
    locationAgeSec,
    movementState: session.movementState,
    hasWebPush: !!session.webPushSubscription,
    hasTelegram: !!session.telegramChatId,
    apnsRegistered: !!session.apnsToken,
    isCriticalAlertsEnabled: session.isCriticalAlertsEnabled,
    signingHealth: session.signingHealth ?? {
      isValid: true,
      expiresAt: Date.now() + 6 * 86400000,
      daysRemaining: 6,
      hoursRemaining: 18,
      autoRefreshActive: true,
      method: 'SideStore',
      lastRefreshTs: Date.now()
    },
    accuracyMeters: session.lastLocation?.horizontalAccuracy ?? null,
    speedMps: session.lastLocation?.speed ?? null,
    isLowPowerMode: session.lastLocation?.isLowPowerMode ?? false,
    activeThreatsCount: activeThreats.length
  });
});

/**
 * Get real-world driving test diagnostics summary & samples
 */
app.get('/api/device/driving-diagnostics', (_req: Request, res: Response) => {
  const summary = drivingLogger.getSummary();
  const samples = drivingLogger.getSamples().slice(-50);
  res.json({
    success: true,
    summary,
    samples
  });
});

/**
 * Trigger Real End-to-End Test Alert ($0 Free Channels: Web Push + Telegram)
 */
app.post('/api/alerts/test-channel', async (req: Request, res: Response) => {
  const { deviceId, testType } = req.body as { deviceId: string; testType?: string };
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const session = deviceManager.getDevice(deviceId);
  if (!session) {
    return res.status(404).json({ error: 'Device session not found. Send location or register first.' });
  }

  let distanceKm = 5.0;
  let title = 'TEST THREAT 5 KM';
  let body = 'Імітація цілі за 5 км. Негайне тестування замкненого екрана.';

  if (testType === 'TEST_THREAT_15KM') {
    distanceKm = 15.0;
    title = 'TEST THREAT 15 KM';
    body = 'Імітація цілі на межі зони захисту (15 км).';
  } else if (testType === 'TEST_MOVING_THREAT') {
    distanceKm = 3.2;
    title = 'TEST MOVING THREAT (3.2 KM)';
    body = 'Імітація зближення в русі: ви наблизились на критичну відстань 3.2 км!';
  }

  const assessment: AlertAssessment = {
    threatId: `test-${Date.now()}`,
    category: 'UAV_STRIKE',
    distanceKm,
    directionCompass: 'Пн-Сх',
    relevance: 'CRITICAL',
    alertRequired: true,
    alertTitle: title,
    alertBody: body,
    timestamp: Date.now()
  };

  const delivery = await alertDeliveryService.deliverAlert(session, assessment, {
    isTest: true,
    force: true
  });

  // Also send APNs if token exists
  if (session.apnsToken) {
    apnsService.sendAlert(session.apnsToken, {
      title: `⚠️ [TEST] ${title}`,
      body,
      isCritical: session.isCriticalAlertsEnabled,
      soundName: 'danger_alarm.wav',
      threatId: assessment.threatId,
      distanceKm,
      category: 'UAV_STRIKE'
    }).then(res => {
      delivery.apnsSuccess = res.success;
    }).catch(() => {});
  }

  res.json({
    success: true,
    message: 'Test alert delivered via active channels',
    testType: testType || 'TEST_THREAT_5KM',
    delivery
  });
});

/**
 * Legacy test endpoint
 */
app.post('/api/alerts/test', async (req: Request, res: Response) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const session = deviceManager.getDevice(deviceId);
  if (!session) {
    return res.status(404).json({ error: 'Device session not found' });
  }

  const assessment: AlertAssessment = {
    threatId: `test-${Date.now()}`,
    category: 'UAV_STRIKE',
    distanceKm: 4.8,
    directionCompass: 'Пн-Сх',
    relevance: 'CRITICAL',
    alertRequired: true,
    alertTitle: 'TEST ALARM',
    alertBody: 'Перевірка системи безпеки: сповіщення на замкнений екран доставлено.',
    timestamp: Date.now()
  };

  const delivery = await alertDeliveryService.deliverAlert(session, assessment, { isTest: true, force: true });

  res.json({
    success: true,
    message: 'Test alarm dispatched via free channels',
    delivery
  });
});

/**
 * Simulate tactical threat at specified distance
 */
app.post('/api/alerts/simulate', async (req: Request, res: Response) => {
  const { deviceId, distanceKm, title } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const session = deviceManager.getDevice(deviceId);
  if (!session || !session.lastLocation) {
    return res.status(400).json({ error: 'Device has no recorded location. Send location first.' });
  }

  const dist = typeof distanceKm === 'number' ? distanceKm : 10.0;
  const threat = safetyMonitor.simulateThreatNearLocation(
    session.lastLocation.latitude,
    session.lastLocation.longitude,
    dist,
    title || 'Імітація БпЛА курсом на ваш район'
  );

  res.json({
    success: true,
    message: `Simulated threat created at ~${dist} km from user location`,
    threat
  });
});

// Start listening if not imported as module
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Personal Safety Engine] Backend running on port ${PORT}`);
  });
}

export { app };
