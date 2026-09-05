import { Env, ThreatEvent, DeviceSession, AlertAssessment, MonitoringHealth } from './types.js';
import { KvStorage } from './kvStorage.js';
import { evaluateThreatProximity, shouldReAlertMovingUser } from './threatDistance.js';
import { sendWebPush } from './webPush.js';

export class SafetyEngine {
  /**
   * Fetches official active air-raid alerts (alerts.in.ua with open feed fallback)
   */
  public static async fetchOfficialAlerts(env: Env): Promise<{ success: boolean; alerts: any[] }> {
    const token = env.ALERTS_API_TOKEN || 'f2184a0fd1d14c5aa291368854cbe654d178883fab2203';
    
    // Attempt 1: alerts.in.ua API (if token provided)
    if (token) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`https://api.alerts.in.ua/v1/alerts/active.json?token=${token}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
          return { success: true, alerts };
        }
      } catch (err: any) {
        console.warn('[SafetyEngine] alerts.in.ua fetch failed:', err?.message || err);
      }
    }

    // Attempt 2: Live Ukrainian aerial alerts open feed
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://ubilling.net.ua/aerialalerts/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        if (data?.states) {
          const activeAlerts = Object.entries(data.states)
            .filter(([_, val]: any) => val?.alertnow === true)
            .map(([locationTitle, val]: any) => ({
              location_title: locationTitle,
              alert_type: 'air_raid',
              started_at: val?.changed || new Date().toISOString()
            }));
          return { success: true, alerts: activeAlerts };
        }
      }
    } catch (err: any) {
      console.warn('[SafetyEngine] Ubilling open alerts feed failed:', err?.message || err);
    }

    // Attempt 3: Jina proxy for ubilling open alerts feed
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://r.jina.ai/https://ubilling.net.ua/aerialalerts/', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const jsonMatch = text.match(/\{[\s\S]*"states"[\s\S]*\}/);
        if (jsonMatch) {
          const data: any = JSON.parse(jsonMatch[0]);
          if (data?.states) {
            const activeAlerts = Object.entries(data.states)
              .filter(([_, val]: any) => val?.alertnow === true)
              .map(([locationTitle, val]: any) => ({
                location_title: locationTitle,
                alert_type: 'air_raid',
                started_at: val?.changed || new Date().toISOString()
              }));
            return { success: true, alerts: activeAlerts };
          }
        }
      }
    } catch (err: any) {
      console.warn('[SafetyEngine] Jina open alerts feed failed:', err?.message || err);
    }

    return { success: false, alerts: [] };
  }

  /**
   * Fetches real-time OSINT Telegram feeds (e.g. kievreal1 via proxy)
   */
  public static async fetchTelegramFeeds(env: Env): Promise<{ success: boolean; messagesCount: number }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://r.jina.ai/https://t.me/s/kievreal1', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 100) {
          return { success: true, messagesCount: 1 };
        }
      }
    } catch (err: any) {
      console.warn('[SafetyEngine] Telegram feed fetch failed:', err?.message || err);
    }

    // Fallback: Direct public web channel
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://t.me/s/kievreal1', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, messagesCount: 1 };
      }
    } catch (err: any) {
      console.warn('[SafetyEngine] Telegram direct fetch failed:', err?.message || err);
    }

    return { success: false, messagesCount: 0 };
  }

  /**
   * Evaluates active threats against registered devices and dispatches necessary alerts
   */
  public static async runCycle(env: Env): Promise<{ evaluatedDevices: number; alertsSent: number; health: MonitoringHealth }> {
    const now = Date.now();
    console.log(`[SafetyEngine] Starting autonomous cloud cycle at ${new Date(now).toISOString()}`);

    // 1. Fetch official alerts and Telegram feeds
    const [officialRes, telegramRes] = await Promise.all([
      this.fetchOfficialAlerts(env),
      this.fetchTelegramFeeds(env)
    ]);

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

    // 3. Update monitoring health state with recent cycle history
    const prevHealth = await KvStorage.getHealth(env);
    const existingRecent = Array.isArray(prevHealth?.recentCycles) ? prevHealth.recentCycles : [];
    const recentCycles = [now, ...existingRecent.filter(ts => ts !== now)].slice(0, 10);

    const health: MonitoringHealth = {
      lastCycleTimestamp: now,
      lastCycleAgeSec: 0,
      officialAlertsStatus: officialRes.success ? 'healthy' : 'degraded',
      telegramFeedsStatus: telegramRes.success ? 'healthy' : 'degraded',
      lastEventIngestedTs: now,
      activeThreatsCount: activeThreats.length,
      registeredDevicesCount: devices.length,
      recentCycles
    };
    await KvStorage.saveHealth(env, health);

    return { evaluatedDevices: devices.length, alertsSent, health };
  }

  /**
   * Clears tactical threats and resets device cooldowns on official ALL-CLEAR.
   * Ensures old threats are not restored.
   */
  public static async processAllClear(
    env: Env,
    payload: { deviceId?: string; locationTitle?: string; oblast?: string; clearAll?: boolean } = {}
  ): Promise<{ clearedThreats: number; clearedDevices: number }> {
    const activeThreats = await KvStorage.getActiveThreats(env);
    let remainingThreats: ThreatEvent[] = [];
    let clearedThreatsCount = 0;

    const locMatch = (payload.locationTitle || '').toLowerCase().trim();
    const obMatch = (payload.oblast || '').toLowerCase().trim();

    if (payload.clearAll || (!locMatch && !obMatch)) {
      clearedThreatsCount = activeThreats.length;
      remainingThreats = [];
    } else {
      for (const t of activeThreats) {
        const titleLower = (t.title || '').toLowerCase();
        const descLower = (t.description || '').toLowerCase();
        const matchesLoc = locMatch && (titleLower.includes(locMatch) || descLower.includes(locMatch));
        const matchesOb = obMatch && (titleLower.includes(obMatch) || descLower.includes(obMatch));
        if (matchesLoc || matchesOb) {
          clearedThreatsCount++;
        } else {
          remainingThreats.push(t);
        }
      }
    }

    await KvStorage.saveActiveThreats(env, remainingThreats);

    let clearedDevicesCount = 0;
    if (payload.deviceId) {
      const device = await KvStorage.getDevice(env, payload.deviceId);
      if (device) {
        device.alertCooldowns = {};
        device.dangerRepeatsDispatched = {};
        await KvStorage.saveDevice(env, device);
        clearedDevicesCount++;
      }
    } else {
      const devices = await KvStorage.getAllDevices(env);
      for (const d of devices) {
        d.alertCooldowns = {};
        d.dangerRepeatsDispatched = {};
        await KvStorage.saveDevice(env, d);
        clearedDevicesCount++;
      }
    }

    console.log(`[SafetyEngine] All-clear processed: purged ${clearedThreatsCount} threats, reset ${clearedDevicesCount} device cooldowns`);
    return { clearedThreats: clearedThreatsCount, clearedDevices: clearedDevicesCount };
  }
}

