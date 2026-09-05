import webpush from 'web-push';
import { DeviceSession, AlertAssessment, AlertDeliveryResult, WebPushSubscription } from '../types.js';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCR9hC4I8CGfY2X5RZmR_CC8-0zi8ITFHDSzhVO4CXiVoZ-1CFrFU7m-ev6EW_FmURjacesDcojC47H6BtZSEII';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '-iJ4fJhTLRfiJ_YfkSmBzeXpPqJEP97e67Mi4lue2dY';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:security@personal-safety.app';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn('[AlertDeliveryService] VAPID configuration note:', err);
  }
}

export class AlertDeliveryService {
  private deduplicationCache = new Map<string, number>();
  private dangerRepeatKeys = new Set<string>();

  constructor(private readonly dangerRepeatDelayMs = 25_000) {}

  scheduleDangerRepeat(
    session: DeviceSession,
    assessment: AlertAssessment,
    resolveCurrent: () => Promise<{ session: DeviceSession; assessment: AlertAssessment } | null>
  ): boolean {
    if (assessment.severity !== 'DANGER') return false;
    const key = `${session.deviceId}:${assessment.threatId}`;
    if (this.dangerRepeatKeys.has(key)) return false;
    this.dangerRepeatKeys.add(key);
    setTimeout(async () => {
      try {
        const current = await resolveCurrent();
        if (!current || current.assessment.severity !== 'DANGER' || !current.assessment.alertRequired) {
          console.log(`[WebPush] DANGER repeat skipped key=${key} reason=NO_LONGER_RELEVANT`);
          return;
        }
        const result = await this.deliverAlert(current.session, current.assessment, {
          force: true,
          isTest: false,
          isRepeat: true
        });
        console.log(`[WebPush] DANGER repeat key=${key} success=${result.webPushSuccess}`);
      } catch (error: any) {
        console.error(`[WebPush] DANGER repeat key=${key} error=${error?.message || error}`);
      }
    }, this.dangerRepeatDelayMs);
    return true;
  }

  clearDangerRepeat(threatId: string): void {
    for (const key of this.dangerRepeatKeys) {
      if (key.endsWith(`:${threatId}`)) this.dangerRepeatKeys.delete(key);
    }
  }

  /**
   * Send Web Push notification to user's locked iPhone
   */
  async sendWebPush(
    subscription: WebPushSubscription,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<{ success: boolean; called: boolean; statusCode?: number; message?: string }> {
    try {
      const payload = JSON.stringify({
        web_push: 8030,
        notification: {
          title,
          body,
          lang: 'uk-UA',
          dir: 'ltr',
          navigate: 'https://romanchuk82-ctrl.github.io/personal-safety-agent/',
          silent: false,
          app_badge: data.severity === 'DANGER' ? '1' : undefined,
          icon: '/personal-safety-agent/icons/icon-192x192.png',
          badge: '/personal-safety-agent/icons/icon-192x192.png',
          vibrate: [500, 200, 500, 200, 800],
          requireInteraction: true,
          tag: data.isTest ? 'test-threat-alert' : 'tactical-threat-alert',
          data: {
            url: '/personal-safety-agent/',
            timestamp: Date.now(),
            ...data
          }
        }
      });

      const providerResult = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          }
        },
        payload,
        {
          TTL: 120,
          urgency: 'high'
        }
      );

      console.log(`[WebPush] sendNotification called=YES providerStatus=${providerResult.statusCode}`);
      return { success: true, called: true, statusCode: providerResult.statusCode, message: providerResult.body || 'Accepted by push provider' };
    } catch (err: any) {
      const statusCode = err?.statusCode;
      const message = err?.body || err?.message || String(err);
      console.error(`[WebPush] sendNotification called=YES providerStatus=${statusCode ?? 'ERROR'} error=${message}`);
      return { success: false, called: true, statusCode, message };
    }
  }

  /**
   * Send Telegram message alert directly to user's Telegram app
   */
  async sendTelegramAlert(
    chatId: string,
    messageHtml: string
  ): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
      console.log(`[AlertDeliveryService] (Telegram Simulation to ${chatId}):\n${messageHtml}`);
      return true;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });

      return response.ok;
    } catch (err: any) {
      console.error('[AlertDeliveryService] Telegram delivery error:', err?.message || err);
      return false;
    }
  }

  /**
   * Deliver threat alert via both free channels (Web Push + Telegram)
   */
  async deliverAlert(
    session: DeviceSession,
    assessment: AlertAssessment,
    options: { isTest?: boolean; force?: boolean; isRepeat?: boolean } = {}
  ): Promise<AlertDeliveryResult> {
    const dedupKey = `${session.deviceId}:${assessment.threatId}`;
    const now = Date.now();
    const lastSent = this.deduplicationCache.get(dedupKey) || 0;

    // Deduplication window: 60s cooldown unless forced or test
    if (!options.force && !options.isTest && (now - lastSent < 60_000)) {
      return {
        webPushSuccess: false,
        telegramSuccess: false,
        error: 'Suppressed by deduplication window (cooldown active)',
        timestamp: now
      };
    }

    let webPushSuccess = false;
    let webPushProvider: AlertDeliveryResult['webPushProvider'] = { called: false };
    let telegramSuccess = false;

    let title = assessment.severity === 'DANGER' ? '🚨 НЕБЕЗПЕКА ПОРУЧ' : assessment.alertTitle;
    if (assessment.severity !== 'DANGER' && !title.startsWith('🚨') && !title.startsWith('⚠️')) {
      const prefix = options.isTest ? '⚠️ [TEST] ' : '🚨 ';
      title = `${prefix}${assessment.alertTitle}`;
    }

    const isTest = options.isTest || title.includes('TEST');
    const body = assessment.severity === 'DANGER'
      ? assessment.alertBody
      : isTest && assessment.alertBody.includes('Тестове попередження')
        ? assessment.alertBody
        : `${assessment.alertBody} Дистанція: ~${assessment.distanceKm.toFixed(1)} км (${assessment.directionCompass}).`;

    // 1. Web Push Channel
    if (session.webPushSubscription) {
      const pushResult = await this.sendWebPush(
        session.webPushSubscription,
        title,
        body,
        {
          threatId: assessment.threatId,
          distanceKm: assessment.distanceKm,
          directionCompass: assessment.directionCompass,
          isTest: options.isTest,
          severity: assessment.severity,
          isRepeat: !!options.isRepeat
        }
      );
      webPushSuccess = pushResult.success;
      webPushProvider = {
        called: pushResult.called,
        statusCode: pushResult.statusCode,
        message: pushResult.message
      };
    }

    // 2. Telegram Bot Channel
    if (session.telegramChatId) {
      const telegramMsg = `<b>${title}</b>\n\n${assessment.alertBody}\n📍 <b>Дистанція:</b> ~${assessment.distanceKm.toFixed(1)} км (${assessment.directionCompass})\n⏱ <b>Час:</b> ${new Date().toLocaleTimeString('uk-UA')}\n\n<i>${options.isTest ? 'Це тестове сповіщення системи безпеки.' : 'Пройдіть в укриття або змініть курс руху!'}</i>`;
      telegramSuccess = await this.sendTelegramAlert(session.telegramChatId, telegramMsg);
    }

    if (webPushSuccess || telegramSuccess || options.isTest) {
      this.deduplicationCache.set(dedupKey, now);
    }

    return {
      webPushSuccess,
      telegramSuccess,
      webPushProvider,
      error: webPushSuccess || !session.webPushSubscription ? undefined : webPushProvider.message,
      timestamp: now
    };
  }
}

export const alertDeliveryService = new AlertDeliveryService();
