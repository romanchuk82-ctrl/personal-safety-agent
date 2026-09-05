export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface LocationPayload {
  deviceId: string;
  latitude: number;
  longitude: number;
  horizontalAccuracy?: number;
  name?: string;
  oblast?: string;
  lockMode?: string;
  speed?: number;
  timestamp?: number;
}

export type LocationHealth = 'LIVE' | 'STALE' | 'OLD_LOCATION';
export type MovementState = 'STATIONARY' | 'ACTIVE' | 'DRIVING';

export interface SigningHealth {
  isValid: boolean;
  expiresAt: number;
  daysRemaining: number;
  hoursRemaining: number;
  autoRefreshActive: boolean;
  method: string;
  lastRefreshTs: number;
}

export interface DeviceSession {
  deviceId: string;
  webPushSubscription?: WebPushSubscription;
  telegramChatId?: string;
  apnsToken?: string;
  isCriticalAlertsEnabled?: boolean;
  lastLocation?: LocationPayload;
  lastReceivedTs: number;
  locationHealth: LocationHealth;
  movementState: MovementState;
  protectionActive: boolean;
  signingHealth?: SigningHealth;
  updatedAt: number;
  alertCooldowns: Record<string, number>;
  dangerRepeatsDispatched: Record<string, boolean>;
}

export interface ThreatEvent {
  id: string;
  category: string;
  title: string;
  description: string;
  lat: number;
  lon: number;
  radiusKm: number;
  timestampIso: string;
  sourceChannel?: string;
  isTacticalThreat?: boolean;
  isSimulated?: boolean;
}

export type ThreatSeverity = 'INFO' | 'WARNING' | 'DANGER';

export interface AlertAssessment {
  threatId: string;
  category: string;
  distanceKm: number;
  directionCompass: string;
  relevance: 'NONE' | 'OBSERVATION' | 'TACTICAL' | 'CRITICAL';
  severity: ThreatSeverity;
  alertRequired: boolean;
  alertTitle: string;
  alertBody: string;
  timestamp: number;
}

export interface MonitoringHealth {
  lastCycleTimestamp: number;
  lastCycleAgeSec: number;
  officialAlertsStatus: 'healthy' | 'degraded' | 'error';
  telegramFeedsStatus: 'healthy' | 'degraded' | 'error';
  lastEventIngestedTs: number;
  activeThreatsCount: number;
  registeredDevicesCount: number;
}

export interface Env {
  PSA_STORAGE: KVNamespace;
  ENVIRONMENT?: string;
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  ALERTS_API_TOKEN?: string;
  TELEGRAM_BOT_TOKEN?: string;
}
