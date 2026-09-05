import http2 from 'http2';
import { ApnsPushResult } from '../types.js';

export interface ApnsAlertOptions {
  title: string;
  body: string;
  isCritical: boolean;
  soundName?: string;
  threatId?: string;
  distanceKm?: number;
  category?: string;
  badge?: number;
}

export class ApnsService {
  private keyId: string;
  private teamId: string;
  private privateKey: string;
  private bundleId: string;
  private isProduction: boolean;

  constructor() {
    this.keyId = process.env.APNS_KEY_ID || '';
    this.teamId = process.env.APNS_TEAM_ID || '';
    this.privateKey = process.env.APNS_PRIVATE_KEY || '';
    this.bundleId = process.env.APNS_BUNDLE_ID || 'com.personalsafety.agent';
    this.isProduction = process.env.NODE_ENV === 'production' && process.env.APNS_PRODUCTION === 'true';
  }

  /**
   * Builds the official Apple Push Notification payload according to iOS Human Interface Guidelines.
   */
  public buildPayload(options: ApnsAlertOptions): Record<string, any> {
    const soundFile = options.soundName || 'danger_alarm.wav';

    const aps: Record<string, any> = {
      alert: {
        title: options.title,
        body: options.body
      },
      badge: options.badge ?? 1
    };

    if (options.isCritical) {
      aps.sound = {
        critical: 1,
        name: soundFile,
        volume: 1.0
      };
      aps['interruption-level'] = 'critical';
    } else {
      aps.sound = soundFile;
      aps['interruption-level'] = 'time-sensitive';
    }

    return {
      aps,
      threatId: options.threatId,
      distanceKm: options.distanceKm,
      category: options.category,
      timestamp: Date.now()
    };
  }

  /**
   * Sends an alert notification to an APNs device token.
   */
  public async sendAlert(
    deviceToken: string,
    options: ApnsAlertOptions
  ): Promise<ApnsPushResult> {
    const payload = this.buildPayload(options);

    // If real APNs credentials are not configured, simulate successful dispatch in dev/test mode
    if (!this.keyId || !this.teamId || !this.privateKey) {
      console.log(`[APNs Mock Dispatch] -> Token: ${deviceToken.slice(0, 10)}... | Critical: ${options.isCritical}`);
      console.log(`[APNs Payload]:`, JSON.stringify(payload, null, 2));

      return {
        success: true,
        messageId: `mock-apns-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        isCritical: options.isCritical,
        statusCode: 200,
        payload
      };
    }

    // Real HTTP/2 APNs dispatch when credentials exist
    return new Promise((resolve) => {
      try {
        const host = this.isProduction ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
        const client = http2.connect(`https://${host}`);

        client.on('error', (err) => {
          console.error('[APNs HTTP/2 Error]:', err);
          resolve({
            success: false,
            error: err.message,
            isCritical: options.isCritical,
            payload
          });
        });

        const headers: Record<string, string> = {
          ':method': 'POST',
          ':path': `/3/device/${deviceToken}`,
          'apns-topic': this.bundleId,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'apns-expiration': '0' // Immediately expire if not delivered
        };

        const req = client.request(headers);
        let responseData = '';
        let statusCode = 200;

        req.on('response', (headers) => {
          statusCode = Number(headers[':status']);
        });

        req.on('data', (chunk) => {
          responseData += chunk;
        });

        req.on('end', () => {
          client.close();
          const success = statusCode === 200;
          resolve({
            success,
            statusCode,
            error: success ? undefined : responseData,
            isCritical: options.isCritical,
            payload
          });
        });

        req.write(JSON.stringify(payload));
        req.end();
      } catch (err: any) {
        resolve({
          success: false,
          error: err.message,
          isCritical: options.isCritical,
          payload
        });
      }
    });
  }
}

export const apnsService = new ApnsService();
