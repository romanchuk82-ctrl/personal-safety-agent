import { DrivingDiagnosticSample, DrivingSummary, LocationPayload } from '../types.js';

export class DrivingLogger {
  private samples: DrivingDiagnosticSample[] = [];
  private maxSamples = 200;

  /**
   * Log a new location sample during driving
   */
  logSample(payload: LocationPayload, distanceMovedMeters: number = 0): DrivingDiagnosticSample {
    const now = Date.now();
    const locationAgeSec = Math.max(0, Math.round((now - payload.timestamp) / 1000));

    const sample: DrivingDiagnosticSample = {
      timestamp: now,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.horizontalAccuracy,
      speed: payload.speed ?? null,
      course: payload.course ?? null,
      distanceMovedMeters,
      deviceLocationTime: payload.timestamp,
      serverReceiveTime: now,
      locationAgeSec,
      isLowPowerMode: !!payload.isLowPowerMode,
      networkState: payload.networkState || 'ONLINE'
    };

    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    return sample;
  }

  /**
   * Get all recorded samples
   */
  getSamples(): DrivingDiagnosticSample[] {
    return [...this.samples];
  }

  /**
   * Clear test samples
   */
  clear(): void {
    this.samples = [];
  }

  /**
   * Compute comprehensive driving summary metrics
   */
  getSummary(): DrivingSummary {
    if (this.samples.length === 0) {
      return {
        totalSamples: 0,
        averageUpdateIntervalSec: 0,
        maxUpdateIntervalSec: 0,
        averageLocationAgeSec: 0,
        maxLocationAgeSec: 0,
        averageAccuracyMeters: 0,
        lowPowerModeObserved: false,
        durationMinutes: 0,
        totalDistanceKm: 0
      };
    }

    let intervals: number[] = [];
    let totalAge = 0;
    let maxAge = 0;
    let totalAccuracy = 0;
    let totalDistMeters = 0;
    let lowPowerObserved = false;

    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i];
      totalAge += s.locationAgeSec;
      if (s.locationAgeSec > maxAge) maxAge = s.locationAgeSec;
      totalAccuracy += s.accuracy;
      totalDistMeters += s.distanceMovedMeters;
      if (s.isLowPowerMode) lowPowerObserved = true;

      if (i > 0) {
        const deltaSec = Math.round((s.timestamp - this.samples[i - 1].timestamp) / 1000);
        intervals.push(deltaSec);
      }
    }

    const avgInterval = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : 0;

    const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 0;
    const avgAge = Math.round(totalAge / this.samples.length);
    const avgAccuracy = Math.round(totalAccuracy / this.samples.length);
    const durationMinutes = Math.round((this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp) / 60000);

    return {
      totalSamples: this.samples.length,
      averageUpdateIntervalSec: avgInterval,
      maxUpdateIntervalSec: maxInterval,
      averageLocationAgeSec: avgAge,
      maxLocationAgeSec: maxAge,
      averageAccuracyMeters: avgAccuracy,
      lowPowerModeObserved: lowPowerObserved,
      durationMinutes,
      totalDistanceKm: Math.round((totalDistMeters / 1000) * 10) / 10
    };
  }
}

export const drivingLogger = new DrivingLogger();
