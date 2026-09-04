export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface UserSession {
  id: string;
  userName: string;
  lat: number;
  lng: number;
  accuracyMeters: number;
  radiusKm: number;
  locationName: string;
  oblastName: string;
  isActive: boolean;
  activatedAt: string;
  lastCheckedAt: string;
  pushSubscription: PushSubscriptionData | null;
  lastAlertSentAt?: string;
  lastAlertId?: string;
}

// In-memory global store (preserved in node runtime)
const globalForSessions = globalThis as unknown as {
  activeSessions: Map<string, UserSession>;
};

if (!globalForSessions.activeSessions) {
  globalForSessions.activeSessions = new Map<string, UserSession>();
}

export const sessionsMap = globalForSessions.activeSessions;

export function saveSession(session: UserSession): UserSession {
  sessionsMap.set(session.id, session);
  return session;
}

export function getSession(id: string): UserSession | null {
  return sessionsMap.get(id) || null;
}

export function getAllActiveSessions(): UserSession[] {
  return Array.from(sessionsMap.values()).filter(s => s.isActive);
}

export function removeSession(id: string): boolean {
  return sessionsMap.delete(id);
}
