import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { deviceManager } from './engine/deviceManager.js';
import { safetyMonitor } from './engine/safetyMonitor.js';
import { apnsService } from './services/apnsService.js';
import { LocationPayload } from './types.js';

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
 * Register device and APNs token
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
    apnsRegistered: !!session.apnsToken,
    isCriticalAlertsEnabled: session.isCriticalAlertsEnabled,
    accuracyMeters: session.lastLocation?.horizontalAccuracy ?? null,
    speedMps: session.lastLocation?.speed ?? null,
    isLowPowerMode: session.lastLocation?.isLowPowerMode ?? false,
    activeThreatsCount: activeThreats.length
  });
});

/**
 * Trigger Real End-to-End Test Alarm
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

  const token = session.apnsToken || 'test-mock-token-0001';

  const result = await apnsService.sendAlert(token, {
    title: 'ATTENTION! DANGER',
    body: 'TEST ALARM · Proximity simulation active · All systems operational',
    isCritical: session.isCriticalAlertsEnabled,
    soundName: 'danger_alarm.wav',
    threatId: `test-${Date.now()}`,
    distanceKm: 0.1,
    category: 'UAV_STRIKE'
  });

  res.json({
    success: result.success,
    message: 'Test alarm dispatched',
    isCritical: session.isCriticalAlertsEnabled,
    result
  });
});

/**
 * Simulate tactical threat at specified distance (e.g. 10km)
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
