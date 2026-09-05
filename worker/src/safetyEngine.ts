import { Env, ThreatEvent, DeviceSession, AlertAssessment, MonitoringHealth } from './types.js';
import { KvStorage } from './kvStorage.js';
import { evaluateThreatProximity, shouldReAlertMovingUser } from './threatDistance.js';
import { sendWebPush } from './webPush.js';

export class SafetyEngine {
  /**
   * Fetches official active air-raid alerts from alerts.in.ua
   */
  public static async fetchOfficialAlerts(env: Env): Promise<{ success: boolean; alerts: any[] }> {
    const token = env.ALERTS_API_TOKEN;
    if (!token) return { success: false, alerts: [] };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('https://api.alerts.in.ua/v1/alerts/active.json', {
        headers: { 'X-API-Token': token },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[SafetyEngine] alerts.in.ua returned HTTP ${res.status}`);
        return { success: false, alerts: [] };
      }

      const data: any = await res.json();
      const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
      return { success: true, alerts };
    } catch (err: any) {
      console.warn('[SafetyEngine] alerts.in.ua fetch failed:', err?.message || err);
      return { success: false, alerts: [] };
    }
  }

  /**
   * Evaluates active threats against registered devices and dispatches necessary alerts
   */
  public static async runCycle(env: Env): Promise<{ evaluatedDevices: number; alertsSent: number }> {
    const now = Date.now();
    console.log(`[SafetyEngine] Starting autonomous cloud cycle at ${new Date(now).toISOString()}`);

    // 1. Fetch official alerts
    const officialRes = await this.fetchOfficialAlerts(env);

    // 2. Load stored threats and devices from KV
    const activeThreats = await KvStorage.getActiveThreats(env);
    const devices = await KvStorage.getAllDevices(env);

    let alertsSent = 0;

    for (const device of devices) {
      if (!device.lastLocation || !device.protectionActive) continue;

      for (const threat of activeThreats) {
        const assessment = evaluateThreatProximity(device.lastLocation, threat);

        if (assessment.alertRequired) {
          device.alertCooldowns = device.alertCooldowns || {};
          device.dangerRepeatsDispatched = device.dangerRepeatsDispatched || {};

          const prevDist = device.alertCooldowns[threat.id];
          const shouldAlert = shouldReAlertMovingUser(prevDist, assessment.distanceKm);

          if (shouldAlert && device.webPushSubscription) {
            console.log(`[SafetyEngine] Triggering Web Push to ${device.deviceId} for threat ${threat.id} (dist: ${assessment.distanceKm.toFixed(1)} km)`);

            const res = await sendWebPush(
              env,
              device.webPushSubscription,
              assessment.alertTitle,
              assessment.alertBody,
              {
                threatId: threat.id,
                severity: assessment.severity,
                distanceKm: assessment.distanceKm,
                directionCompass: assessment.directionCompass,
                isTest: threat.isSimulated
              }
            );

            if (res.success) {
              alertsSent++;
              device.alertCooldowns[threat.id] = assessment.distanceKm;
              await KvStorage.saveDevice(env, device);
            }
          } else if (assessment.severity === 'DANGER' && !device.dangerRepeatsDispatched[threat.id]) {
            // Check DANGER repeat (~25-60 sec after initial alert)
            const lastAlertDist = device.alertCooldowns[threat.id];
            if (lastAlertDist !== undefined && device.webPushSubscription) {
              console.log(`[SafetyEngine] Dispatching DANGER repeat for ${device.deviceId} (threat: ${threat.id})`);
              const repeatRes = await sendWebPush(
                env,
                device.webPushSubscription,
                '🚨 НЕБЕЗПЕКА ПОРУЧ (ПОВТОР)',
                `Увага! Загроза все ще на критичній дистанції (${assessment.distanceKm.toFixed(1)} км). Залишайтесь в укритті!`,
                {
                  threatId: threat.id,
                  severity: 'DANGER',
                  isRepeat: true
                }
              );
              if (repeatRes.success) {
                device.dangerRepeatsDispatched[threat.id] = true;
                await KvStorage.saveDevice(env, device);
              }
            }
          }
        }
      }
    }

    // Update monitoring health state in KV
    const health: MonitoringHealth = {
      lastCycleTimestamp: now,
      lastCycleAgeSec: 0,
      officialAlertsStatus: officialRes.success ? 'healthy' : 'degraded',
      telegramFeedsStatus: 'healthy',
      lastEventIngestedTs: now,
      activeThreatsCount: activeThreats.length,
      registeredDevicesCount: devices.length
    };
    await KvStorage.saveHealth(env, health);

    return { evaluatedDevices: devices.length, alertsSent };
  }
}
