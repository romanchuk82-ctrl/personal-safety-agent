import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessionStore';
import { sendWebPushNotification } from '@/lib/pushService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, customVoiceText, userName = 'Кирил', locationName = 'Запоріжжя' } = body;

    const voiceText = customVoiceText || `${userName}, увага. Це тестове сповіщення системи Personal Safety Agent. Голосовий синтез та зв'язок працюють у штатному режимі.`;

    let pushSent = false;
    let pushResult = null;

    if (sessionId) {
      const session = getSession(sessionId);
      if (session && session.pushSubscription) {
        pushResult = await sendWebPushNotification(session.pushSubscription, {
          title: '🔔 Тестове сповіщення: Personal Safety Agent',
          body: `Привіт, ${userName}! Перевірка зв'язку для локації ${session.locationName || locationName}. Захист активний.`,
          tag: `test_${Date.now()}`,
          data: {
            url: '/',
            alertId: `test_${Date.now()}`,
            voiceText,
            timestamp: new Date().toISOString(),
            severity: 'INFO'
          }
        });
        pushSent = pushResult.success;
      }
    }

    return NextResponse.json({
      success: true,
      voiceText,
      pushSent,
      pushResult,
      message: 'Тестовий сигнал сформовано'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Test alert failed' }, { status: 500 });
  }
}
