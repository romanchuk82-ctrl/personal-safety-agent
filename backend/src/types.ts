export type LocationHealth = 'LIVE' | 'STALE' | 'OLD_LOCATION';
export type MovementState = 'DRIVING' | 'ACTIVE' | 'STATIONARY';
export type ThreatCategory = 
  | 'UAV_STRIKE' 
  | 'BALLISTIC_MISSILE' 
  | 'CRUISE_MISSILE' 
  | 'AVIATION' 
  | 'ARTILLERY' 
  | 'GENERAL_AIR_ALARM';

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SigningHealth {
  isValid: boolean;
  expiresAt: number;
  daysRemaining: number;
  hoursRemaining: number;
  autoRefreshActive: boolean;
  method: 'SideStore' | 'AltServer' | 'Manual';
  lastRefreshTs: number;
}

export interface DrivingDiagnosticSample {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  course: number | null;
  distanceMovedMeters: number;
  deviceLocationTime: number;
  serverReceiveTime: number;
  locationAgeSec: number;
  isLowPowerMode: boolean;
  networkState?: string;
}

export interface DrivingSummary {
  totalSamples: number;
  averageUpdateIntervalSec: number;
  maxUpdateIntervalSec: number;
  averageLocationAgeSec: number;
  maxLocationAgeSec: number;
  averageAccuracyMeters: number;
  lowPowerModeObserved: boolean;
  durationMinutes: number;
  totalDistanceKm: number;
}

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
  networkState?: string;
}

export interface DeviceSession {
  deviceId: string;
  apnsToken?: string;
  isCriticalAlertsEnabled: boolean;
  webPushSubscription?: WebPushSubscription;
  telegramChatId?: string;
  signingHealth?: SigningHealth;
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

export interface AlertDeliveryResult {
  webPushSuccess: boolean;
  telegramSuccess: boolean;
  apnsSuccess?: boolean;
  error?: string;
  webPushProvider?: {
    called: boolean;
    statusCode?: number;
    message?: string;
  };
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

