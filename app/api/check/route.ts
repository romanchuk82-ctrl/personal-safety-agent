import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveAlerts } from '@/lib/sources/alertsInUa';
import { fetchAllTelegramFeeds } from '@/lib/sources/telegramScraper';
import { evaluateLocalSecurity } from '@/lib/matcher';
import { getSession, saveSession } from '@/lib/sessionStore';
import { sendWebPushNotification } from '@/lib/pushService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radius');
    const sessionId = searchParams.get('sessionId');
    const userName = searchParams.get('userName') || 'Кирил';

    let lat = 47.8388; // Default Zaporizhzhia
    let lng = 35.1396;
    let radiusKm = 5.0;

    let session = null;
    if (sessionId) {
      session = getSession(sessionId);
      if (session) {
        lat = session.lat;
        lng = session.lng;
        radiusKm = session.radiusKm;
      }
    }

    if (latParam && lngParam) {
      lat = parseFloat(latParam);
      lng = parseFloat(lngParam);
    }
    if (radiusParam) {
      radiusKm = parseFloat(radiusParam);
    }

    // Parallel fetch of open sources
    const [alertsResult, telegramResult] = await Promise.all([
      fetchActiveAlerts(),
      fetchAllTelegramFeeds()
    ]);

    const evaluation = evaluateLocalSecurity(
      lat,
      lng,
      radiusKm,
      userName,
      alertsResult.alerts,
      telegramResult.messages
    );

    // If session exists, update lastCheckedAt
    if (session) {
      session.lastCheckedAt = new Date().toISOString();

      // Trigger Web Push if primary threat detected and not sent recently
      if (evaluation.hasLocalThreat && evaluation.primaryThreat && session.pushSubscription) {
        const threat = evaluation.primaryThreat;
        const now = Date.now();
        const lastSent = session.lastAlertSentAt ? new Date(session.lastAlertSentAt).getTime() : 0;
        const isNewThreat = session.lastAlertId !== threat.id;
        const cooldownPassed = (now - lastSent) > 3 * 60 * 1000; // 3 min cooldown for same threat

        if (isNewThreat || cooldownPassed) {
          session.lastAlertSentAt = new Date().toISOString();
          session.lastAlertId = threat.id;
          saveSession(session);

          // Dispatch Web Push in background
          sendWebPushNotification(session.pushSubscription, {
            title: `⚠️ УВАГА: Загроза поблизу (${threat.categoryNameUk})`,
            body: `${userName}, зафіксовано загрозу (~${threat.distanceKm} км від вас): ${threat.detectedLocation}. Терміново в укриття!`,
            tag: threat.id,
            data: {
              url: '/',
              alertId: threat.id,
              voiceText: threat.voiceAlertText,
              timestamp: threat.timestamp,
              severity: threat.severity
            }
          }).catch(err => console.error('Background WebPush error:', err));
        }
      } else {
        saveSession(session);
      }
    }

    return NextResponse.json({
      success: true,
      evaluation,
      sourcesStatus: {
        alertsInUa: {
          status: alertsResult.status,
          totalActiveCount: alertsResult.alerts.length,
          error: alertsResult.message
        },
        telegram: telegramResult.sourceStatus,
        totalRawMessages: telegramResult.messages.length
      },
      coordinates: { lat, lng, radiusKm }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Check failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng, radiusKm = 5.0, userName = 'Кирил', sessionId } = body;

    const [alertsResult, telegramResult] = await Promise.all([
      fetchActiveAlerts(),
      fetchAllTelegramFeeds()
    ]);

    const evaluation = evaluateLocalSecurity(
      lat,
      lng,
      radiusKm,
      userName,
      alertsResult.alerts,
      telegramResult.messages
    );

    return NextResponse.json({
      success: true,
      evaluation,
      sourcesStatus: {
        alertsInUa: {
          status: alertsResult.status,
          totalActiveCount: alertsResult.alerts.length
        },
        telegram: telegramResult.sourceStatus
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
