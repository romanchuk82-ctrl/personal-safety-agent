/**
 * LOCATION CONFIDENCE & VALIDATION LAYER
 * Personal Safety Agent (Ukraine EW / GPS-Spoofing Defense)
 * 
 * CORE PRINCIPLE: NEW GPS COORDINATE != TRUSTED LOCATION.
 * 
 * Protects against:
 * 1. Rapid GPS spoofing jumps (e.g. 50-500 km within seconds due to EW/РЕБ).
 * 2. False nominal accuracy (spoofed signal claiming 5m accuracy while jumping wildly).
 * 3. Coordinates outside Ukrainian territory / unexpected coordinates.
 * 4. Inconsistent high-frequency jitter.
 * 
 * Supports:
 * - Multi-sample warmup aggregation on activation.
 * - Kinematic velocity check (max plausible ground transport speed).
 * - System Location Confidence scoring (0..100) distinct from nominal accuracy.
 * - Mode: AUTO (with EW filter), LOCKED (pinned by user), MANUAL (selected from map/search).
 * - Fail-safe continuity: Keeps monitoring the last trusted location during jamming.
 */

import { calculateDistanceKm, findNearestLocation } from './gazetteer';

export type LocationLockMode = 'AUTO' | 'LOCKED' | 'MANUAL';

export type LocationConfidenceState =
  | 'VERIFIED'    // 🟢 LOCATION VERIFIED: Stable, kinematically consistent GPS
  | 'UNCERTAIN'   // 🟡 LOCATION UNCERTAIN: Warmup / stabilizing / low accuracy
  | 'UNRELIABLE'  // 🔴 LOCATION UNRELIABLE: GPS spoofing/EW jamming detected, impossible jump
  | 'LOCKED';     // 📌 LOCATION LOCKED: User explicitly locked or manually set

export interface RawGpsMeasurement {
  lat: number;
  lng: number;
  accuracy: number;     // meters reported by device
  timestamp: number;    // epoch ms
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
}

export interface TrustedLocation {
  lat: number;
  lng: number;
  accuracyMeters: number;        // Nominal accuracy if verified, or estimated uncertainty
  name: string;                  // Resolved gazetteer location name (e.g. "Бориспіль / Аеропорт")
  oblast: string;                // Oblast name (e.g. "Київська область")
  confidenceState: LocationConfidenceState;
  lockMode: LocationLockMode;
  systemConfidenceScore: number; // 0..100
  lastVerifiedTimestamp: number; // epoch ms when last confirmed by genuine signal or user action
  firstAcquiredTimestamp: number;
  sampleCount: number;
  statusMessageUk: string;       // Primary compact status title
  subStatusUk: string;           // Secondary compact status text
  anomalyReasonUk?: string;      // Explanation if anomalous jump detected
  isManualOrLocked: boolean;
  rawGpsSample?: RawGpsMeasurement;
}

// Bounding box for Ukraine territory (including Crimea and border areas with generous margin)
const UKRAINE_BOUNDS = {
  minLat: 44.0,
  maxLat: 52.6,
  minLng: 21.8,
  maxLng: 40.5,
};

// Kinematic limits for civil transport in Ukraine
// Kinematic limits for civil transport in Ukraine
const MAX_PLAUSIBLE_SPEED_KMH = 180;  // Standard highway car / high-speed rail speed
const EXTREME_SPEED_LIMIT_KMH = 260;  // Extreme upper threshold (e.g. intercity express)
const MIN_SAMPLES_FOR_WARMUP = 3;     // Minimum samples to establish initial trusted location
const WARMUP_TIME_WINDOW_MS = 6000;   // Max time window to collect warmup samples

// Hysteresis & Expiration parameters for anomaly handling
export const ANOMALY_HYSTERESIS_THRESHOLD = 2;   // Consecutive bad fixes required before marking UNRELIABLE
export const RECOVERY_HYSTERESIS_THRESHOLD = 2;  // Consecutive stable fixes required to recover to VERIFIED
export const ANOMALY_EXPIRATION_WINDOW_MS = 35000; // 35 seconds without new anomalies -> stale warning expires
export const MAX_STABLE_ACCURACY_METERS = 80;    // Maximum accuracy (m) to consider a fix normal/stable

export class LocationValidator {
  private currentTrusted: TrustedLocation | null = null;
  private sampleBuffer: RawGpsMeasurement[] = [];
  private isWarmupComplete = false;
  private lockMode: LocationLockMode = 'AUTO';
  private consecutiveAnomalies = 0;
  private consecutiveValidSamples = 0;
  private lastAnomalyTimestamp = 0;
  private recentValidBuffer: RawGpsMeasurement[] = [];

  constructor(initialLocation?: TrustedLocation | null, lockMode: LocationLockMode = 'AUTO') {
    if (initialLocation) {
      // Clean up stale anomaly from saved state so warning does not stick across reloads
      const cleanedLocation = { ...initialLocation };
      if (cleanedLocation.confidenceState === 'UNRELIABLE') {
        cleanedLocation.confidenceState = cleanedLocation.lockMode === 'LOCKED' || cleanedLocation.lockMode === 'MANUAL' ? 'LOCKED' : 'VERIFIED';
        cleanedLocation.statusMessageUk = `📍 ${cleanedLocation.name}`;
        cleanedLocation.subStatusUk = cleanedLocation.confidenceState === 'LOCKED' ? 'Локацію зафіксовано' : `GPS ±${Math.round(cleanedLocation.accuracyMeters || 10)} м`;
        cleanedLocation.anomalyReasonUk = undefined;
        cleanedLocation.systemConfidenceScore = 90;
      }
      this.currentTrusted = cleanedLocation;
      this.lockMode = cleanedLocation.lockMode || lockMode;
      this.isWarmupComplete = cleanedLocation.confidenceState === 'VERIFIED' || cleanedLocation.confidenceState === 'LOCKED';
    } else {
      this.lockMode = lockMode;
      this.isWarmupComplete = false;
    }
  }

  public getLockMode(): LocationLockMode {
    return this.lockMode;
  }

  public getTrustedLocation(): TrustedLocation | null {
    return this.currentTrusted;
  }

  public isWarmupFinished(): boolean {
    return this.isWarmupComplete;
  }

  /**
   * Check and expire stale anomaly warning if enough time has elapsed without new anomalies.
   * Prevents warning from remaining stuck indefinitely due to a single old bad fix.
   */
  public checkAnomalyExpiration(now: number = Date.now()): boolean {
    if (!this.currentTrusted || this.currentTrusted.confidenceState !== 'UNRELIABLE') {
      return false;
    }

    if (this.lastAnomalyTimestamp > 0 && now - this.lastAnomalyTimestamp > ANOMALY_EXPIRATION_WINDOW_MS) {
      this.consecutiveAnomalies = 0;
      this.lastAnomalyTimestamp = 0;
      this.consecutiveValidSamples = 0;
      this.currentTrusted = {
        ...this.currentTrusted,
        confidenceState: this.currentTrusted.lockMode === 'LOCKED' || this.currentTrusted.lockMode === 'MANUAL' ? 'LOCKED' : 'VERIFIED',
        statusMessageUk: `📍 ${this.currentTrusted.name}`,
        subStatusUk: `GPS ±${Math.round(this.currentTrusted.accuracyMeters)} м`,
        anomalyReasonUk: undefined,
        systemConfidenceScore: 90,
      };
      return true;
    }

    return false;
  }

  public setLockMode(mode: LocationLockMode): TrustedLocation | null {
    this.lockMode = mode;
    if (!this.currentTrusted) return null;

    this.consecutiveAnomalies = 0;
    this.consecutiveValidSamples = 0;
    this.lastAnomalyTimestamp = 0;

    if (mode === 'LOCKED') {
      this.isWarmupComplete = true;
      this.currentTrusted = {
        ...this.currentTrusted,
        lockMode: 'LOCKED',
        confidenceState: 'LOCKED',
        isManualOrLocked: true,
        statusMessageUk: `📌 ${this.currentTrusted.name}`,
        subStatusUk: 'Локацію зафіксовано',
        anomalyReasonUk: undefined,
      };
    } else if (mode === 'MANUAL') {
      this.isWarmupComplete = true;
      this.currentTrusted = {
        ...this.currentTrusted,
        lockMode: 'MANUAL',
        confidenceState: 'LOCKED',
        isManualOrLocked: true,
        statusMessageUk: `📌 ${this.currentTrusted.name}`,
        subStatusUk: 'Локацію встановлено вручну',
        anomalyReasonUk: undefined,
      };
    } else {
      // AUTO MODE
      this.currentTrusted = {
        ...this.currentTrusted,
        lockMode: 'AUTO',
        confidenceState: this.currentTrusted.systemConfidenceScore >= 70 ? 'VERIFIED' : 'UNCERTAIN',
        isManualOrLocked: false,
        statusMessageUk: `📍 ${this.currentTrusted.name}`,
        subStatusUk: `GPS ±${Math.round(this.currentTrusted.accuracyMeters)} м`,
        anomalyReasonUk: undefined,
      };
      this.sampleBuffer = [];
    }

    return this.currentTrusted;
  }

  /**
   * Set location manually (e.g. from gazetteer city search or map pin click).
   */
  public setManualLocation(lat: number, lng: number, customName?: string, customOblast?: string): TrustedLocation {
    const nearest = findNearestLocation(lat, lng);
    const resolvedName = customName || nearest.location.name;
    const resolvedOblast = customOblast || nearest.location.oblast;
    const now = Date.now();

    this.lockMode = 'MANUAL';
    this.isWarmupComplete = true;
    this.sampleBuffer = [];
    this.consecutiveAnomalies = 0;
    this.consecutiveValidSamples = 0;
    this.lastAnomalyTimestamp = 0;
    this.recentValidBuffer = [];

    const newTrusted: TrustedLocation = {
      lat,
      lng,
      accuracyMeters: 10,
      name: resolvedName,
      oblast: resolvedOblast,
      confidenceState: 'LOCKED',
      lockMode: 'MANUAL',
      systemConfidenceScore: 100,
      lastVerifiedTimestamp: now,
      firstAcquiredTimestamp: now,
      sampleCount: 1,
      statusMessageUk: `📌 ${resolvedName}`,
      subStatusUk: 'Локацію встановлено вручну',
      isManualOrLocked: true,
    };

    this.currentTrusted = newTrusted;
    return newTrusted;
  }

  /**
   * Lock current trusted position.
   */
  public lockCurrentLocation(): TrustedLocation | null {
    if (!this.currentTrusted) return null;
    return this.setLockMode('LOCKED');
  }

  /**
   * Unlock and switch back to Auto GPS mode.
   */
  public unlockToAutoMode(): TrustedLocation | null {
    return this.setLockMode('AUTO');
  }

  /**
   * Core Validation Algorithm: Process a raw GPS measurement from the device.
   */
  public processGpsMeasurement(measurement: RawGpsMeasurement): {
    trustedLocation: TrustedLocation;
    isUpdated: boolean;
    isAnomalous: boolean;
    confidenceState: LocationConfidenceState;
    anomalyReasonUk?: string;
  } {
    const now = measurement.timestamp || Date.now();

    // 1. IF LOCKED OR MANUAL: Strictly preserve the locked location regardless of incoming GPS fixes
    if (this.lockMode === 'LOCKED' || this.lockMode === 'MANUAL') {
      if (this.currentTrusted) {
        return {
          trustedLocation: this.currentTrusted,
          isUpdated: false,
          isAnomalous: false,
          confidenceState: 'LOCKED',
        };
      }
    }

    // Check if any old anomaly warning has expired due to elapsed time
    this.checkAnomalyExpiration(now);

    // 2. SANITY CHECK: Ukraine territory bounds check
    const isInsideUkraine =
      measurement.lat >= UKRAINE_BOUNDS.minLat &&
      measurement.lat <= UKRAINE_BOUNDS.maxLat &&
      measurement.lng >= UKRAINE_BOUNDS.minLng &&
      measurement.lng <= UKRAINE_BOUNDS.maxLng &&
      !(Math.abs(measurement.lat) < 0.1 && Math.abs(measurement.lng) < 0.1);

    if (!isInsideUkraine) {
      this.consecutiveAnomalies++;
      this.consecutiveValidSamples = 0;
      this.recentValidBuffer = [];
      this.lastAnomalyTimestamp = now;
      const reason = `Координати (${measurement.lat.toFixed(2)}, ${measurement.lng.toFixed(2)}) за межами України (аномалія GPS)`;

      if (this.currentTrusted) {
        if (this.consecutiveAnomalies >= ANOMALY_HYSTERESIS_THRESHOLD) {
          this.currentTrusted = {
            ...this.currentTrusted,
            confidenceState: 'UNRELIABLE',
            systemConfidenceScore: Math.max(10, this.currentTrusted.systemConfidenceScore - 30),
            statusMessageUk: '⚠️ Геолокація нестабільна',
            subStatusUk: `Використовується остання підтверджена позиція (${this.currentTrusted.name.split(' (')[0]})`,
            anomalyReasonUk: reason,
            rawGpsSample: measurement,
          };
          return {
            trustedLocation: this.currentTrusted,
            isUpdated: false,
            isAnomalous: true,
            confidenceState: 'UNRELIABLE',
            anomalyReasonUk: reason,
          };
        } else {
          // Hysteresis: 1st anomaly discarded, retain trusted location without marking UNRELIABLE
          return {
            trustedLocation: this.currentTrusted,
            isUpdated: false,
            isAnomalous: true,
            confidenceState: this.currentTrusted.confidenceState,
            anomalyReasonUk: reason,
          };
        }
      } else {
        // Fallback to Kyiv center if no previous location exists
        const fallback = this.setManualLocation(50.4501, 30.5234, 'Київ (Центр)', 'Київська область');
        return {
          trustedLocation: fallback,
          isUpdated: true,
          isAnomalous: true,
          confidenceState: 'UNRELIABLE',
          anomalyReasonUk: reason,
        };
      }
    }

    // 3. WARMUP PHASE: Multi-sample collection until MIN_SAMPLES_FOR_WARMUP reached
    if (!this.isWarmupComplete) {
      this.sampleBuffer.push(measurement);
      this.sampleBuffer = this.sampleBuffer.filter((s) => now - s.timestamp <= WARMUP_TIME_WINDOW_MS);

      if (this.sampleBuffer.length < MIN_SAMPLES_FOR_WARMUP) {
        const nearest = findNearestLocation(measurement.lat, measurement.lng);
        const tentativeLoc: TrustedLocation = {
          lat: measurement.lat,
          lng: measurement.lng,
          accuracyMeters: measurement.accuracy,
          name: nearest.location.name,
          oblast: nearest.location.oblast,
          confidenceState: 'UNCERTAIN',
          lockMode: 'AUTO',
          systemConfidenceScore: 40,
          lastVerifiedTimestamp: now,
          firstAcquiredTimestamp: this.currentTrusted ? this.currentTrusted.firstAcquiredTimestamp : now,
          sampleCount: this.sampleBuffer.length,
          statusMessageUk: '⏳ Уточнення геолокації...',
          subStatusUk: `Збір стабільних вибірок GPS (${this.sampleBuffer.length}/${MIN_SAMPLES_FOR_WARMUP})`,
          isManualOrLocked: false,
          rawGpsSample: measurement,
        };
        this.currentTrusted = tentativeLoc;
        return {
          trustedLocation: tentativeLoc,
          isUpdated: true,
          isAnomalous: false,
          confidenceState: 'UNCERTAIN',
        };
      }

      // Check consistency across warmup samples
      const isConsistent = this.validateSampleCluster(this.sampleBuffer, 250); // 250m max cluster spread
      const nearest = findNearestLocation(measurement.lat, measurement.lng);

      this.isWarmupComplete = isConsistent;
      const confidenceState: LocationConfidenceState = isConsistent ? 'VERIFIED' : 'UNCERTAIN';

      const verifiedLoc: TrustedLocation = {
        lat: measurement.lat,
        lng: measurement.lng,
        accuracyMeters: measurement.accuracy,
        name: nearest.location.name,
        oblast: nearest.location.oblast,
        confidenceState,
        lockMode: 'AUTO',
        systemConfidenceScore: isConsistent ? 95 : 60,
        lastVerifiedTimestamp: now,
        firstAcquiredTimestamp: this.currentTrusted ? this.currentTrusted.firstAcquiredTimestamp : now,
        sampleCount: this.sampleBuffer.length,
        statusMessageUk: `📍 ${nearest.location.name}`,
        subStatusUk: `GPS ±${Math.round(measurement.accuracy)} м`,
        isManualOrLocked: false,
        rawGpsSample: measurement,
      };

      this.currentTrusted = verifiedLoc;
      return {
        trustedLocation: verifiedLoc,
        isUpdated: true,
        isAnomalous: false,
        confidenceState,
      };
    }

    if (!this.currentTrusted) {
      const nearest = findNearestLocation(measurement.lat, measurement.lng);
      const initLoc: TrustedLocation = {
        lat: measurement.lat,
        lng: measurement.lng,
        accuracyMeters: measurement.accuracy,
        name: nearest.location.name,
        oblast: nearest.location.oblast,
        confidenceState: 'VERIFIED',
        lockMode: this.lockMode,
        systemConfidenceScore: 90,
        lastVerifiedTimestamp: now,
        firstAcquiredTimestamp: now,
        sampleCount: 1,
        statusMessageUk: `📍 ${nearest.location.name}`,
        subStatusUk: `GPS ±${Math.round(measurement.accuracy)} м`,
        isManualOrLocked: false,
        rawGpsSample: measurement,
      };
      this.currentTrusted = initLoc;
      return {
        trustedLocation: initLoc,
        isUpdated: true,
        isAnomalous: false,
        confidenceState: 'VERIFIED',
      };
    }

    // 4. KINEMATIC & ANOMALY EVALUATION against current trusted location
    const distKm = calculateDistanceKm(
      this.currentTrusted.lat,
      this.currentTrusted.lng,
      measurement.lat,
      measurement.lng
    );

    const timeDeltaSec = Math.max(0.5, (now - this.currentTrusted.lastVerifiedTimestamp) / 1000);
    const speedKmh = (distKm / (timeDeltaSec / 3600));

    // CHECK A: Sudden impossible teleport / spoofing jump (> 250 km/h or > 5 km jump in < 30s)
    const isImpossibleSpeed = speedKmh > EXTREME_SPEED_LIMIT_KMH && distKm > 0.6;
    const isSuddenFarJump = distKm > 5.0 && timeDeltaSec < 45;
    const isExcessiveInaccuracy = measurement.accuracy > 1500 && distKm > 3.0;

    if (isImpossibleSpeed || isSuddenFarJump || isExcessiveInaccuracy) {
      this.consecutiveAnomalies++;
      this.consecutiveValidSamples = 0;
      this.recentValidBuffer = [];
      this.lastAnomalyTimestamp = now;
      const reason = `Виявлено аномальний стрибок: ${distKm.toFixed(1)} км за ${Math.round(timeDeltaSec)}с (${Math.round(speedKmh)} км/год). Нестабільний сигнал GPS.`;

      // Hysteresis: only mark UNRELIABLE after consecutive bad measurements
      if (this.consecutiveAnomalies >= ANOMALY_HYSTERESIS_THRESHOLD) {
        // CRITICAL: DO NOT MOVE TRUSTED LOCATION! Retain last confirmed location
        this.currentTrusted = {
          ...this.currentTrusted,
          confidenceState: 'UNRELIABLE',
          systemConfidenceScore: Math.max(15, this.currentTrusted.systemConfidenceScore - 25),
          statusMessageUk: '⚠️ Геолокація нестабільна',
          subStatusUk: `Використовується остання підтверджена позиція (${this.currentTrusted.name.split(' (')[0]})`,
          anomalyReasonUk: reason,
          rawGpsSample: measurement,
        };

        return {
          trustedLocation: this.currentTrusted,
          isUpdated: false,
          isAnomalous: true,
          confidenceState: 'UNRELIABLE',
          anomalyReasonUk: reason,
        };
      } else {
        // First anomaly: discard fix, preserve trusted location without marking UNRELIABLE
        return {
          trustedLocation: this.currentTrusted,
          isUpdated: false,
          isAnomalous: true,
          confidenceState: this.currentTrusted.confidenceState,
          anomalyReasonUk: reason,
        };
      }
    }

    // CHECK B: Real plausible movement & recovery from unstable state
    this.consecutiveAnomalies = 0;
    this.consecutiveValidSamples++;
    this.recentValidBuffer.push(measurement);
    if (this.recentValidBuffer.length > 5) {
      this.recentValidBuffer.shift();
    }

    const isAccuracyNormal = measurement.accuracy <= MAX_STABLE_ACCURACY_METERS;
    const wasUnreliable = this.currentTrusted.confidenceState === 'UNRELIABLE';

    // If previously UNRELIABLE, require consecutive stable samples to recover (hysteresis)
    if (wasUnreliable) {
      const isClusterConsistent = this.validateSampleCluster(
        this.recentValidBuffer.slice(-RECOVERY_HYSTERESIS_THRESHOLD),
        250
      );

      if (this.consecutiveValidSamples < RECOVERY_HYSTERESIS_THRESHOLD || !isAccuracyNormal || !isClusterConsistent) {
        // Still stabilizing: continue monitoring from trusted location, keep UNRELIABLE warning
        return {
          trustedLocation: this.currentTrusted,
          isUpdated: false,
          isAnomalous: false,
          confidenceState: 'UNRELIABLE',
        };
      }

      // Recovered! Multiple consecutive stable measurements agree with normal accuracy -> clear warning
      this.lastAnomalyTimestamp = 0;
    }

    const nearest = findNearestLocation(measurement.lat, measurement.lng);

    // Compute System Confidence Score:
    let score = 95;
    if (measurement.accuracy > 50) score -= 15;
    if (measurement.accuracy > 200) score -= 30;
    if (speedKmh > MAX_PLAUSIBLE_SPEED_KMH) score -= 20;

    const confidenceState: LocationConfidenceState = score >= 70 ? 'VERIFIED' : 'UNCERTAIN';

    const updatedLocation: TrustedLocation = {
      lat: measurement.lat,
      lng: measurement.lng,
      accuracyMeters: measurement.accuracy,
      name: nearest.location.name,
      oblast: nearest.location.oblast,
      confidenceState,
      lockMode: 'AUTO',
      systemConfidenceScore: score,
      lastVerifiedTimestamp: now,
      firstAcquiredTimestamp: this.currentTrusted.firstAcquiredTimestamp,
      sampleCount: this.currentTrusted.sampleCount + 1,
      statusMessageUk: `📍 ${nearest.location.name}`,
      subStatusUk: confidenceState === 'VERIFIED' ? `GPS ±${Math.round(measurement.accuracy)} м` : 'Оновлення позиції...',
      anomalyReasonUk: undefined,
      isManualOrLocked: false,
      rawGpsSample: measurement,
    };

    this.currentTrusted = updatedLocation;
    return {
      trustedLocation: updatedLocation,
      isUpdated: true,
      isAnomalous: false,
      confidenceState,
    };
  }

  /**
   * Helper to check if a cluster of samples is geometrically tight.
   */
  private validateSampleCluster(samples: RawGpsMeasurement[], maxSpreadMeters: number): boolean {
    if (samples.length < 2) return true;
    const first = samples[0];
    for (let i = 1; i < samples.length; i++) {
      const distKm = calculateDistanceKm(first.lat, first.lng, samples[i].lat, samples[i].lng);
      if (distKm * 1000 > maxSpreadMeters) {
        return false;
      }
    }
    return true;
  }
}

// STORAGE SERIALIZATION HELPERS
const STORAGE_KEY = 'psa_trusted_location';

export function saveTrustedLocationToStorage(location: TrustedLocation): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    localStorage.setItem('psa_location_lock_mode', location.lockMode);
  } catch (e) {
    console.warn('Failed to save trusted location to localStorage:', e);
  }
}

export function loadTrustedLocationFromStorage(): TrustedLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrustedLocation;
    // CRITICAL: Do NOT restore stale anomaly warning across app reloads/restarts
    if (parsed && parsed.confidenceState === 'UNRELIABLE') {
      parsed.confidenceState = parsed.lockMode === 'LOCKED' || parsed.lockMode === 'MANUAL' ? 'LOCKED' : 'VERIFIED';
      parsed.statusMessageUk = `📍 ${parsed.name}`;
      parsed.subStatusUk = parsed.confidenceState === 'LOCKED' ? 'Локацію зафіксовано' : `GPS ±${Math.round(parsed.accuracyMeters || 10)} м`;
      parsed.anomalyReasonUk = undefined;
      parsed.systemConfidenceScore = 90;
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to load trusted location from localStorage:', e);
    return null;
  }
}
