import { Env, DeviceSession, WebPushSubscription, LocationPayload, AlertAssessment } from './types.js';
import { KvStorage } from './kvStorage.js';
import { SafetyEngine } from './safetyEngine.js';
import { sendWebPush } from './webPush.js';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Monitoring-Secret, X-Cron-Token',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(data: any, status: number = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
      ...extraHeaders
    }
  });
}

export default {
  /**
   * HTTP Request Handler
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    try {
      // 1. Health Check
      if (url.pathname === '/healthz' || url.pathname === '/api/health') {
        const health = await KvStorage.getHealth(env);
        return jsonResponse({
          status: 'ok',
          server: 'Personal Safety Cloud Engine (Cloudflare Worker)',
          environment: env.ENVIRONMENT || 'production',
          timestamp: Date.now(),
          monitoringActive: true,
          lastMonitoringCycle: health.lastCycleTimestamp,
          lastMonitoringCycleAgeSec: health.lastCycleAgeSec,
          sources: {
            officialAlerts: health.officialAlertsStatus,
            telegramFeeds: health.telegramFeedsStatus
          },
          activeThreatsCount: health.activeThreatsCount,
          registeredDevicesCount: health.registeredDevicesCount,
          persistenceReady: KvStorage.isPersistenceReady(env),
          recentCycles: health.recentCycles || []
        });
      }

      // 1.1 Trigger On-Demand Monitoring Cycle
      if (url.pathname === '/api/monitoring/cycle') {
        const result = await SafetyEngine.runCycle(env);
        return jsonResponse({
          success: true,
          message: 'Autonomous monitoring cycle executed',
          timestamp: Date.now(),
          ...result
        });
      }

      // 1.2 Dedicated Production M2M Endpoint for cron-job.org (24/7 External Scheduler)
      if (url.pathname === '/api/m2m/monitoring/cycle' || url.pathname === '/api/cron/cycle') {
        const authHeader = request.headers.get('Authorization') || '';
        const cronHeader = request.headers.get('X-Monitoring-Secret') || request.headers.get('X-Cron-Token') || '';
        const querySecret = url.searchParams.get('secret') || url.searchParams.get('token') || '';

        const token = authHeader.replace(/^Bearer\s+/i, '').trim() || cronHeader.trim() || querySecret.trim();
        const expectedSecret = env.CRON_SECRET || 'psa_cron_8f9c1b2e3d4a5e6f7a8b9c0d1e2f3a4b';

        if (!token || token !== expectedSecret) {
          return jsonResponse({ error: 'Unauthorized: invalid or missing cron secret token' }, 401);
        }

        const result = await SafetyEngine.runCycle(env);
        return jsonResponse({
          success: true,
          message: 'Autonomous M2M monitoring cycle executed',
          scheduler: 'cron-job.org',
          timestamp: Date.now(),
          ...result
        }, 200, {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Robots-Tag': 'noindex, nofollow'
        });
      }
      if (url.pathname === '/api/device/subscribe-push' && request.method === 'POST') {
        const body: any = await request.json().catch(() => ({}));
        const { deviceId, subscription, location } = body as {
          deviceId: string;
          subscription: WebPushSubscription;
          location?: LocationPayload;
        };

        if (!deviceId || !subscription || !subscription.endpoint) {
          return jsonResponse({ error: 'deviceId and valid subscription are required' }, 400);
        }

        let session = await KvStorage.getDevice(env, deviceId);
        const now = Date.now();

        if (!session) {
          session = {
            deviceId,
            webPushSubscription: subscription,
            lastReceivedTs: location ? now : 0,
            locationHealth: location ? 'LIVE' : 'OLD_LOCATION',
            movementState: 'STATIONARY',
            protectionActive: true,
            updatedAt: now,
            alertCooldowns: {},
            dangerRepeatsDispatched: {}
          };
        } else {
          session.webPushSubscription = subscription;
          session.protectionActive = true;
          session.updatedAt = now;
        }

        if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
          session.lastLocation = location;
          session.lastReceivedTs = now;
          session.locationHealth = 'LIVE';
        }

        await KvStorage.saveDevice(env, session);

        return jsonResponse({
          success: true,
          message: 'Web Push subscription registered in Cloudflare KV',
          deviceId: session.deviceId,
          hasWebPush: !!session.webPushSubscription,
          locationHealth: session.locationHealth,
          hasLocation: !!session.lastLocation,
          persisted: true,
          endpointAcknowledged: true
        });
      }

      // 3. Push status check
      if (url.pathname === '/api/device/push-status') {
        const deviceId = url.searchParams.get('deviceId') || '';
        const endpoint = url.searchParams.get('endpoint') || '';
        const session = await KvStorage.getDevice(env, deviceId);

        const subscriptionFound = !!session?.webPushSubscription;
        const endpointMatches = subscriptionFound && (!endpoint || session!.webPushSubscription!.endpoint === endpoint);

        return jsonResponse({
          registered: !!session && endpointMatches,
          deviceId,
          sessionFound: !!session,
          subscriptionFound,
          endpointMatches,
          persisted: KvStorage.isPersistenceReady(env)
        });
      }

      // 4. Ingest device location
      if (url.pathname === '/api/device/location' && request.method === 'POST') {
        const payload: LocationPayload = await request.json().catch(() => ({}));
        if (!payload.deviceId || typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') {
          return jsonResponse({ error: 'Invalid location payload' }, 400);
        }

        let session = await KvStorage.getDevice(env, payload.deviceId);
        const now = Date.now();

        if (!session) {
          session = {
            deviceId: payload.deviceId,
            lastLocation: payload,
            lastReceivedTs: now,
            locationHealth: 'LIVE',
            movementState: (payload.speed || 0) > 4.5 ? 'DRIVING' : 'STATIONARY',
            protectionActive: true,
            updatedAt: now,
            alertCooldowns: {},
            dangerRepeatsDispatched: {}
          };
        } else {
          session.lastLocation = payload;
          session.lastReceivedTs = now;
          session.locationHealth = 'LIVE';
          session.movementState = (payload.speed || 0) > 4.5 ? 'DRIVING' : 'STATIONARY';
          session.updatedAt = now;
        }

        await KvStorage.saveDevice(env, session);

        return jsonResponse({
          success: true,
          deviceId: session.deviceId,
          locationHealth: session.locationHealth,
          movementState: session.movementState,
          lastReceivedTs: session.lastReceivedTs
        });
      }

      // 5. Device Status Query
      if (url.pathname === '/api/device/status') {
        const deviceId = url.searchParams.get('deviceId') || '';
        if (!deviceId) {
          return jsonResponse({ error: 'deviceId query param is required' }, 400);
        }

        const session = await KvStorage.getDevice(env, deviceId);
        const health = await KvStorage.getHealth(env);

        if (!session) {
          return jsonResponse({
            registered: false,
            serverOnline: true,
            lastMonitoringCycle: health.lastCycleTimestamp,
            locationHealth: 'OLD_LOCATION',
            movementState: 'STATIONARY',
            protectionActive: false
          });
        }

        const locationAgeSec = session.lastReceivedTs > 0 
          ? Math.round((Date.now() - session.lastReceivedTs) / 1000) 
          : null;

        return jsonResponse({
          registered: true,
          deviceId: session.deviceId,
          serverOnline: true,
          lastMonitoringCycle: health.lastCycleTimestamp,
          lastMonitoringCycleAgeSec: health.lastCycleAgeSec,
          protectionActive: session.protectionActive,
          locationHealth: session.locationHealth,
          locationAgeSec,
          movementState: session.movementState,
          hasWebPush: !!session.webPushSubscription,
          hasTelegram: !!session.telegramChatId,
          accuracyMeters: session.lastLocation?.horizontalAccuracy ?? null,
          speedMps: session.lastLocation?.speed ?? null
        });
      }

      // 6. TEST DANGER Web Push Trigger (with delayed lock screen test)
      if ((url.pathname === '/api/alerts/test-push' || url.pathname === '/api/alerts/test-channel') && request.method === 'POST') {
        const body: any = await request.json().catch(() => ({}));
        const { deviceId, delaySec } = body as { deviceId: string; delaySec?: number };

        if (!deviceId) {
          return jsonResponse({ error: 'deviceId is required' }, 400);
        }

        const session = await KvStorage.getDevice(env, deviceId);
        if (!session) {
          return jsonResponse({ error: 'Device session not found. Please activate Web Push first.' }, 404);
        }

        if (!session.webPushSubscription) {
          return jsonResponse({ error: 'Web Push subscription not found on server for this device.' }, 400);
        }

        const parsedDelay = delaySec === undefined ? 15 : Number(delaySec);
        const delaySeconds = Math.max(0, Math.min(60, Number.isFinite(parsedDelay) ? parsedDelay : 15));

        console.log(`[CloudTestPush] Scheduling TEST DANGER for ${deviceId} in ${delaySeconds}s...`);

        if (delaySeconds > 0) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }

        const result = await sendWebPush(
          env,
          session.webPushSubscription,
          '🚨 НЕБЕЗПЕКА ПОРУЧ',
          '[TEST] БпЛА · 5.0 км · напрямок Пн-Сх',
          {
            threatId: `test-danger-${Date.now()}`,
            category: 'UAV_STRIKE',
            distanceKm: 5.0,
            directionCompass: 'Пн-Сх',
            severity: 'DANGER',
            isTest: true
          }
        );

        if (!result.success && result.statusCode !== 201 && result.statusCode !== 200) {
          const isVapidMismatch = typeof result.message === 'string' && result.message.includes('VapidPkHashMismatch');
          return jsonResponse({
            success: false,
            error: isVapidMismatch ? 'VapidPkHashMismatch' : (result.message || 'Web Push provider rejected the notification'),
            reason: isVapidMismatch ? 'VapidPkHashMismatch' : undefined,
            delivery: {
              webPushSuccess: false,
              webPushProvider: result,
              error: isVapidMismatch ? 'VapidPkHashMismatch' : result.message
            },
            diagnostics: result
          }, 502);
        }

        return jsonResponse({
          success: true,
          sent: true,
          delaySec: delaySeconds,
          message: 'Web Push accepted by Apple Push Service provider.',
          deviceId: session.deviceId,
          hasWebPush: true,
          delivery: {
            webPushSuccess: true,
            webPushProvider: result
          },
          provider: result
        });
      }

      // 7. Simulate threat near user location
      if (url.pathname === '/api/alerts/simulate' && request.method === 'POST') {
        const body: any = await request.json().catch(() => ({}));
        const { deviceId, distanceKm, title } = body as { deviceId: string; distanceKm?: number; title?: string };

        if (!deviceId) {
          return jsonResponse({ error: 'deviceId is required' }, 400);
        }

        const session = await KvStorage.getDevice(env, deviceId);
        if (!session || !session.lastLocation) {
          return jsonResponse({ error: 'Device has no recorded location. Send location first.' }, 400);
        }

        const dist = typeof distanceKm === 'number' ? distanceKm : 5.0;
        const deltaLat = dist / 111.0;

        const threat = {
          id: `sim-${Date.now()}`,
          category: 'UAV_STRIKE',
          title: `[TEST] ${title || 'Імітація БпЛА курсом на ваш район'}`,
          description: `[TEST] Зафіксовано рух БпЛА за ${dist.toFixed(1)} км від вашої позиції`,
          lat: session.lastLocation.latitude + deltaLat,
          lon: session.lastLocation.longitude,
          radiusKm: 5.0,
          timestampIso: new Date().toISOString(),
          sourceChannel: 'simulation',
          isTacticalThreat: true,
          isSimulated: true
        };

        const threats = await KvStorage.getActiveThreats(env);
        threats.push(threat);
        await KvStorage.saveActiveThreats(env, threats);

        // Run cycle immediately in background
        ctx.waitUntil(SafetyEngine.runCycle(env));

        return jsonResponse({
          success: true,
          message: `Simulated threat created at ~${dist} km from user location`,
          threat
        });
      }

      return jsonResponse({ error: 'Not Found', path: url.pathname }, 404);
    } catch (err: any) {
      console.error('[Worker Error]', err);
      return jsonResponse({ error: 'Internal Cloud Engine Error', details: err?.message || String(err) }, 500);
    }
  },

  /**
   * Cron Trigger Scheduled Handler (Runs every 1 minute 24/7 on Cloudflare global edge)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Scheduled] Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);
    ctx.waitUntil(SafetyEngine.runCycle(env));
  }
};
