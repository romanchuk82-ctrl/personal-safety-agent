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

  /**
   * Send Web Push notification to user's locked iPhone
   */
  async sendWebPush(
    subscription: WebPushSubscription,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const payload = JSON.stringify({
        notification: {
          title,
          body,
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

      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          }
        },
        payload,
        {
          TTL: 60,
          urgency: 'high'
        }
      );

      return true;
    } catch (err: any) {
      console.error('[AlertDeliveryService] Web Push delivery error:', err?.message || err);
      return false;
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
    options: { isTest?: boolean; force?: boolean } = {}
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
    let telegramSuccess = false;

    let title = assessment.alertTitle;
    if (!title.startsWith('🚨') && !title.startsWith('⚠️')) {
      const prefix = options.isTest ? '⚠️ [TEST] ' : '🚨 ';
      title = `${prefix}${assessment.alertTitle}`;
    }

    const isTest = options.isTest || title.includes('TEST');
    const body = isTest && assessment.alertBody.includes('Тестове попередження')
      ? assessment.alertBody
      : `${assessment.alertBody} Дистанція: ~${assessment.distanceKm.toFixed(1)} км (${assessment.directionCompass}).`;

    // 1. Web Push Channel
    if (session.webPushSubscription) {
      webPushSuccess = await this.sendWebPush(
        session.webPushSubscription,
        title,
        body,
        {
          threatId: assessment.threatId,
          distanceKm: assessment.distanceKm,
          directionCompass: assessment.directionCompass,
          isTest: options.isTest
        }
      );
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
      timestamp: now
    };
  }
}

export const alertDeliveryService = new AlertDeliveryService();
