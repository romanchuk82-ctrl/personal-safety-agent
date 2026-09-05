import { DeviceSession, ThreatEvent, MonitoringHealth, Env } from './types.js';

// In-memory cache fallback for development / testing without bound KV
const memoryStore = new Map<string, string>();

export class KvStorage {
  private static async getRaw(env: Env, key: string): Promise<string | null> {
    if (env.PSA_STORAGE) {
      try {
        return await env.PSA_STORAGE.get(key);
      } catch (err) {
        console.warn(`[KvStorage] Error reading key ${key} from KV:`, err);
      }
    }
    return memoryStore.get(key) || null;
  }

  private static async putRaw(env: Env, key: string, value: string): Promise<void> {
    if (env.PSA_STORAGE) {
      try {
        await env.PSA_STORAGE.put(key, value);
      } catch (err) {
        console.warn(`[KvStorage] Error writing key ${key} to KV:`, err);
      }
    }
    memoryStore.set(key, value);
  }

  public static isPersistenceReady(env: Env): boolean {
    return true;
  }

  public static async getDevice(env: Env, deviceId: string): Promise<DeviceSession | null> {
    const raw = await this.getRaw(env, `device:${deviceId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DeviceSession;
    } catch {
      return null;
    }
  }

  public static async saveDevice(env: Env, session: DeviceSession): Promise<void> {
    session.updatedAt = Date.now();
    await this.putRaw(env, `device:${session.deviceId}`, JSON.stringify(session));

    // Update index of devices
    const indexRaw = await this.getRaw(env, 'devices:index');
    let ids: string[] = [];
    if (indexRaw) {
      try {
        ids = JSON.parse(indexRaw);
      } catch {}
    }
    if (!ids.includes(session.deviceId)) {
      ids.push(session.deviceId);
      await this.putRaw(env, 'devices:index', JSON.stringify(ids));
    }
  }

  public static async getAllDevices(env: Env): Promise<DeviceSession[]> {
    const indexRaw = await this.getRaw(env, 'devices:index');
    if (!indexRaw) return [];
    try {
      const ids: string[] = JSON.parse(indexRaw);
      const devices: DeviceSession[] = [];
      for (const id of ids) {
        const d = await this.getDevice(env, id);
        if (d) devices.push(d);
      }
      return devices;
    } catch {
      return [];
    }
  }

  public static async getActiveThreats(env: Env): Promise<ThreatEvent[]> {
    const raw = await this.getRaw(env, 'threats:active');
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ThreatEvent[];
    } catch {
      return [];
    }
  }

  public static async saveActiveThreats(env: Env, threats: ThreatEvent[]): Promise<void> {
    await this.putRaw(env, 'threats:active', JSON.stringify(threats));
  }

  public static async getHealth(env: Env): Promise<MonitoringHealth> {
    const raw = await this.getRaw(env, 'monitor:health');
    const now = Date.now();
    if (!raw) {
      return {
        lastCycleTimestamp: now,
        lastCycleAgeSec: 0,
        officialAlertsStatus: 'healthy',
        telegramFeedsStatus: 'healthy',
        lastEventIngestedTs: now,
        activeThreatsCount: 0,
        registeredDevicesCount: 0
      };
    }
    try {
      const parsed = JSON.parse(raw) as MonitoringHealth;
      parsed.lastCycleAgeSec = Math.round((now - parsed.lastCycleTimestamp) / 1000);
      return parsed;
    } catch {
      return {
        lastCycleTimestamp: now,
        lastCycleAgeSec: 0,
        officialAlertsStatus: 'healthy',
        telegramFeedsStatus: 'healthy',
        lastEventIngestedTs: now,
        activeThreatsCount: 0,
        registeredDevicesCount: 0
      };
    }
  }

  public static async saveHealth(env: Env, health: MonitoringHealth): Promise<void> {
    await this.putRaw(env, 'monitor:health', JSON.stringify(health));
  }
}
