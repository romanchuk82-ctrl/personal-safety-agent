export type LocationHealth = 'LIVE' | 'STALE' | 'OLD_LOCATION';
export type MovementState = 'DRIVING' | 'ACTIVE' | 'STATIONARY';
export type ThreatCategory = 
  | 'UAV_STRIKE' 
  | 'BALLISTIC_MISSILE' 
  | 'CRUISE_MISSILE' 
  | 'AVIATION' 
  | 'ARTILLERY' 
  | 'GENERAL_AIR_ALARM';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  horizontalAccuracy: number;
  timestamp: number;
  speed?: number | null;
  course?: number | null;
  source?: string;
  deviceId: string;
  batteryLevel?: number | null;
  isLowPowerMode?: boolean;
}

export interface DeviceSession {
  deviceId: string;
  apnsToken?: string;
  isCriticalAlertsEnabled: boolean;
  lastLocation?: LocationPayload;
  lastReceivedTs: number;
  locationHealth: LocationHealth;
  movementState: MovementState;
  protectionActive: boolean;
  alertCooldowns: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

export interface ThreatEvent {
  id: string;
  category: ThreatCategory;
  title: string;
  description: string;
  lat: number;
  lon: number;
  radiusKm: number;
  timestampIso: string;
  sourceChannel: string;
  isTacticalThreat: boolean;
  speedKmh?: number;
  bearingDegrees?: number;
  isSimulated?: boolean;
}

export interface AlertAssessment {
  threatId: string;
  category: ThreatCategory;
  distanceKm: number;
  directionCompass: string;
  relevance: 'CRITICAL' | 'WARNING' | 'OBSERVATION' | 'IRRELEVANT';
  alertRequired: boolean;
  alertTitle: string;
  alertBody: string;
  timestamp: number;
}

export interface ApnsPushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isCritical: boolean;
  statusCode?: number;
  payload: Record<string, any>;
}
