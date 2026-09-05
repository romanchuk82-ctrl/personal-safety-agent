import webpush from 'web-push';
import { WebPushSubscription, Env } from './types.js';

let vapidConfigured = false;

export const DEFAULT_VAPID_PUBLIC_KEY = 'BFM9HkzYgwAYdTY5VYhj_Gfm39qhGL5vs7vy9iuj1-vBt8eXFqH9j0wh7qgh2_ScpX-LWhIKfHogc7wgSl0flRk';
export const DEFAULT_VAPID_PRIVATE_KEY = '5sSdNPfjlAUFMgUMzCH9ynDVifBlX6NehzmtLxpLnOw';
export const DEFAULT_VAPID_SUBJECT = 'mailto:security@personal-safety.app';

export function configureVapid(env: Env): void {
  const publicKey = (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim() || DEFAULT_VAPID_PUBLIC_KEY;
  const privateKey = (env.VAPID_PRIVATE_KEY || '').trim() || DEFAULT_VAPID_PRIVATE_KEY;
  const subject = (env.VAPID_SUBJECT || '').trim() || DEFAULT_VAPID_SUBJECT;

  if (!vapidConfigured && publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      vapidConfigured = true;
      console.log('[CloudWebPush] VAPID configured successfully');
    } catch (err) {
      console.warn('[CloudWebPush] VAPID configuration note:', err);
    }
  }
}

export async function sendWebPush(
  env: Env,
  subscription: WebPushSubscription,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; called: boolean; statusCode?: number; message?: string }> {
  configureVapid(env);

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

    console.log(`[CloudWebPush] sendNotification called=YES providerStatus=${providerResult.statusCode}`);
    return {
      success: providerResult.statusCode >= 200 && providerResult.statusCode < 300,
      called: true,
      statusCode: providerResult.statusCode,
      message: providerResult.body || 'Accepted by push provider'
    };
  } catch (err: any) {
    const statusCode = err?.statusCode;
    const message = err?.body || err?.message || String(err);
    console.error(`[CloudWebPush] sendNotification called=YES providerStatus=${statusCode ?? 'ERROR'} error=${message}`);
    return {
      success: false,
      called: true,
      statusCode,
      message
    };
  }
}
