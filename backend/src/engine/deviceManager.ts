import { DeviceSession, LocationPayload, LocationHealth, MovementState } from '../types.js';

export class DeviceManager {
  private devices: Map<string, DeviceSession> = new Map();

  /**
   * Registers or updates a device session.
   */
  public registerDevice(
    deviceId: string,
    apnsToken?: string,
    isCriticalAlertsEnabled: boolean = false
  ): DeviceSession {
    const existing = this.devices.get(deviceId);
    const now = Date.now();

    if (existing) {
      if (apnsToken) existing.apnsToken = apnsToken;
      existing.isCriticalAlertsEnabled = isCriticalAlertsEnabled;
      existing.protectionActive = true;
      existing.updatedAt = now;
      return existing;
    }

    const newSession: DeviceSession = {
      deviceId,
      apnsToken,
      isCriticalAlertsEnabled,
      lastReceivedTs: 0,
      locationHealth: 'OLD_LOCATION',
      movementState: 'STATIONARY',
      protectionActive: true,
      alertCooldowns: {},
      createdAt: now,
      updatedAt: now
    };

    this.devices.set(deviceId, newSession);
    return newSession;
  }

  /**
   * Updates location for a registered device and determines health & movement state.
   */
  public updateLocation(payload: LocationPayload): DeviceSession {
    let session = this.devices.get(payload.deviceId);
    if (!session) {
      session = this.registerDevice(payload.deviceId);
    }

    const now = Date.now();
    session.lastLocation = payload;
    session.lastReceivedTs = now;
    session.updatedAt = now;

    // Movement state classification based on speed (m/s)
    const speed = payload.speed ?? 0;
    if (speed > 4.0) {
      session.movementState = 'DRIVING';
    } else if (speed > 1.0) {
      session.movementState = 'ACTIVE';
    } else {
      session.movementState = 'STATIONARY';
    }

    // Refresh health
    session.locationHealth = this.calculateLocationHealth(session.lastReceivedTs);

    return session;
  }

  /**
   * Determines location health based on age.
   * 0..5 min -> LIVE
   * 5..15 min -> STALE
   * >15 min -> OLD_LOCATION
   */
  public calculateLocationHealth(lastReceivedTs: number): LocationHealth {
    if (!lastReceivedTs || lastReceivedTs === 0) return 'OLD_LOCATION';
    const ageMs = Date.now() - lastReceivedTs;
    if (ageMs <= 5 * 60 * 1000) return 'LIVE';
    if (ageMs <= 15 * 60 * 1000) return 'STALE';
    return 'OLD_LOCATION';
  }

  /**
   * Gets device session by ID with refreshed health.
   */
  public getDevice(deviceId: string): DeviceSession | undefined {
    const session = this.devices.get(deviceId);
    if (session) {
      session.locationHealth = this.calculateLocationHealth(session.lastReceivedTs);
    }
    return session;
  }

  /**
   * Returns all active devices for background monitoring.
   */
  public getActiveDevices(): DeviceSession[] {
    const active: DeviceSession[] = [];
    for (const session of this.devices.values()) {
      if (session.protectionActive && session.lastLocation) {
        session.locationHealth = this.calculateLocationHealth(session.lastReceivedTs);
        active.push(session);
      }
    }
    return active;
  }

  /**
   * Sets protection state (activate / deactivate).
   */
  public setProtectionActive(deviceId: string, active: boolean): DeviceSession | undefined {
    const session = this.devices.get(deviceId);
    if (session) {
      session.protectionActive = active;
      session.updatedAt = Date.now();
    }
    return session;
  }

  /**
   * Records cooldown distance and timestamp for a threat.
   */
  public recordAlertDispatched(deviceId: string, threatId: string, distanceKm: number): void {
    const session = this.devices.get(deviceId);
    if (session) {
      session.alertCooldowns[threatId] = distanceKm;
    }
  }

  /**
   * Clears cooldowns (for test resets).
   */
  public clearCooldowns(deviceId: string): void {
    const session = this.devices.get(deviceId);
    if (session) {
      session.alertCooldowns = {};
    }
  }
}

export const deviceManager = new DeviceManager();
