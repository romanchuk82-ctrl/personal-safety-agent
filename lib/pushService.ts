import webpush from 'web-push';
import { PushSubscriptionData } from './sessionStore';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:security@personal-safety.app';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (e) {
    console.error('Failed to configure VAPID details:', e);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    alertId?: string;
    voiceText?: string;
    timestamp?: string;
    severity?: string;
  };
}

export async function sendWebPushNotification(
  subscription: PushSubscriptionData,
  payload: PushNotificationPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { success: false, error: 'VAPID keys are not configured on server' };
  }

  try {
    const pushSub = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }
    };

    const payloadString = JSON.stringify({
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-192x192.png',
        tag: payload.tag || 'personal-safety-alert',
        vibrate: [300, 100, 400, 100, 400, 100, 400],
        requireInteraction: true,
        data: payload.data || {},
      }
    });

    const res = await webpush.sendNotification(pushSub, payloadString, {
      TTL: 60, // 60 seconds TTL for tactical alerts
      urgency: 'high',
    });

    return { success: true, statusCode: res.statusCode };
  } catch (err: any) {
    console.error('Web Push delivery error:', err);
    return {
      success: false,
      statusCode: err.statusCode,
      error: err.message || 'Failed to deliver push notification'
    };
  }
}
