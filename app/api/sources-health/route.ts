import { NextResponse } from 'next/server';
import { fetchActiveAlerts } from '@/lib/sources/alertsInUa';
import { fetchAllTelegramFeeds } from '@/lib/sources/telegramScraper';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  const [alertsRes, telegramRes] = await Promise.allSettled([
    fetchActiveAlerts(),
    fetchAllTelegramFeeds()
  ]);

  const alertsOk = alertsRes.status === 'fulfilled' && alertsRes.value.status !== 'ERROR';
  const alertsCount = alertsRes.status === 'fulfilled' ? alertsRes.value.alerts.length : 0;

  const telegramOk = telegramRes.status === 'fulfilled';
  const telegramStatus = telegramRes.status === 'fulfilled' ? telegramRes.value.sourceStatus : {};
  const telegramCount = telegramRes.status === 'fulfilled' ? telegramRes.value.messages.length : 0;

  const totalTimeMs = Date.now() - startTime;

  return NextResponse.json({
    status: alertsOk && telegramOk ? 'HEALTHY' : 'DEGRADED',
    latencyMs: totalTimeMs,
    timestamp: new Date().toISOString(),
    sources: {
      alertsInUa: {
        name: 'alerts.in.ua (Офіційний API громад/районів)',
        ok: alertsOk,
        activeAlertsCount: alertsCount,
        details: alertsRes.status === 'fulfilled' ? alertsRes.value.status : 'FAILED'
      },
      telegramFeeds: {
        name: 'Публічні радіолокаційні OSINT-канали (t.me/s/...)',
        ok: telegramOk,
        totalRecentMessages: telegramCount,
        channels: telegramStatus
      },
      virazhStatus: {
        name: 'Система «Віраж-Планшет»',
        status: 'LEGAL_OSINT_EQUIVALENTS_ACTIVE',
        note: 'Прямий доступ до військового комплексу закритий за стандартами безпеки ЗСУ. Використовуються легальні верифіковані ретранслятори та радіолокаційні OSINT-канали.'
      }
    }
  });
}
