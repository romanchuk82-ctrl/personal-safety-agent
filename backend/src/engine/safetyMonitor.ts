import { ThreatEvent, DeviceSession, AlertAssessment } from '../types.js';
import { deviceManager } from './deviceManager.js';
import { evaluateThreatProximity, shouldReAlertMovingUser } from './threatDistance.js';
import { apnsService } from '../services/apnsService.js';

export class SafetyMonitor {
  private activeThreats: Map<string, ThreatEvent> = new Map();
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private lastCycleTimestamp: number = 0;
  private checkIntervalMs: number = 10000; // 10 seconds background cycle

  /**
   * Starts the 24/7 independent monitoring loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[SafetyMonitor] 24/7 Autonomous Threat Engine started.');

    this.intervalTimer = setInterval(() => {
      this.runMonitoringCycle().catch((err) => {
        console.error('[SafetyMonitor] Cycle error:', err);
      });
    }, this.checkIntervalMs);
  }

  /**
   * Stops the monitoring loop.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    console.log('[SafetyMonitor] Stopped.');
  }

  /**
   * Adds or updates a tactical threat event.
   */
  public registerThreat(threat: ThreatEvent): void {
    this.activeThreats.set(threat.id, threat);
    console.log(`[SafetyMonitor] Registered threat: ${threat.id} (${threat.category}) @ ${threat.lat}, ${threat.lon}`);
    // Immediately evaluate proximity for all active devices
    this.evaluateThreatForAllDevices(threat).catch(err => {
      console.error('[SafetyMonitor] Immediate evaluation error:', err);
    });
  }

  /**
   * Clears a threat event when cleared by official sources or expired.
   */
  public clearThreat(threatId: string): void {
    this.activeThreats.delete(threatId);
    console.log(`[SafetyMonitor] Cleared threat: ${threatId}`);
  }

  /**
   * Returns all currently active threats.
   */
  public getActiveThreats(): ThreatEvent[] {
    return Array.from(this.activeThreats.values());
  }

  /**
   * Returns last cycle timestamp.
   */
  public getLastCycleTimestamp(): number {
    return this.lastCycleTimestamp;
  }

  /**
   * Runs one full monitoring cycle across all active devices.
   */
  public async runMonitoringCycle(): Promise<{ evaluatedDevices: number; alertsSent: number }> {
    this.lastCycleTimestamp = Date.now();
    const activeDevices = deviceManager.getActiveDevices();
    let alertsSent = 0;

    for (const device of activeDevices) {
      if (!device.lastLocation) continue;

      for (const threat of this.activeThreats.values()) {
        const assessment = evaluateThreatProximity(device.lastLocation, threat);

        if (assessment.alertRequired) {
          const previousDistance = device.alertCooldowns[threat.id];
          const shouldAlert = shouldReAlertMovingUser(previousDistance, assessment.distanceKm);

          if (shouldAlert && device.apnsToken) {
            console.log(`[SafetyMonitor] Alerting Device ${device.deviceId} for threat ${threat.id} (dist: ${assessment.distanceKm} km)`);
            await apnsService.sendAlert(device.apnsToken, {
              title: assessment.alertTitle,
              body: assessment.alertBody,
              isCritical: device.isCriticalAlertsEnabled,
              threatId: threat.id,
              distanceKm: assessment.distanceKm,
              category: threat.category
            });

            deviceManager.recordAlertDispatched(device.deviceId, threat.id, assessment.distanceKm);
            alertsSent++;
          }
        }
      }
    }

    return { evaluatedDevices: activeDevices.length, alertsSent };
  }

  /**
   * Immediately evaluates one specific threat against all devices.
   */
  public async evaluateThreatForAllDevices(threat: ThreatEvent): Promise<number> {
    const activeDevices = deviceManager.getActiveDevices();
    let sent = 0;

    for (const device of activeDevices) {
      if (!device.lastLocation) continue;

      const assessment = evaluateThreatProximity(device.lastLocation, threat);
      if (assessment.alertRequired) {
        const prevDist = device.alertCooldowns[threat.id];
        const shouldAlert = shouldReAlertMovingUser(prevDist, assessment.distanceKm);

        if (shouldAlert && device.apnsToken) {
          await apnsService.sendAlert(device.apnsToken, {
            title: assessment.alertTitle,
            body: assessment.alertBody,
            isCritical: device.isCriticalAlertsEnabled,
            threatId: threat.id,
            distanceKm: assessment.distanceKm,
            category: threat.category
          });

          deviceManager.recordAlertDispatched(device.deviceId, threat.id, assessment.distanceKm);
          sent++;
        }
      }
    }

    return sent;
  }

  /**
   * Helper to simulate a test threat near user's position for verification.
   */
  public simulateThreatNearLocation(
    userLat: number,
    userLon: number,
    distanceKm: number,
    title: string = 'Шахед у напрямку вашого сектора'
  ): ThreatEvent {
    // 1 degree lat is ~111km
    const deltaLat = distanceKm / 111.0;
    const threatLat = userLat + deltaLat;
    const threatLon = userLon;

    const threat: ThreatEvent = {
      id: `sim-${Date.now()}`,
      category: 'UAV_STRIKE',
      title: `[TEST] ${title}`,
      description: `[TEST] Зафіксовано рух БпЛА за ${distanceKm.toFixed(1)} км від вашої позиції`,
      lat: threatLat,
      lon: threatLon,
      radiusKm: 5.0,
      timestampIso: new Date().toISOString(),
      sourceChannel: 'simulation',
      isTacticalThreat: true,
      isSimulated: true
    };

    this.registerThreat(threat);
    return threat;
  }
}

export const safetyMonitor = new SafetyMonitor();
