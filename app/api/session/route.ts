import { NextRequest, NextResponse } from 'next/server';
import { saveSession, getSession, removeSession, UserSession } from '@/lib/sessionStore';
import { findNearestLocation } from '@/lib/gazetteer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, lat, lng, accuracyMeters, radiusKm = 5.0, userName = 'Кирил', pushSubscription } = body;

    if (!id || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'id, lat, and lng are required' }, { status: 400 });
    }

    const nearest = findNearestLocation(lat, lng);
    const now = new Date().toISOString();

    const session: UserSession = {
      id,
      userName,
      lat,
      lng,
      accuracyMeters: typeof accuracyMeters === 'number' ? accuracyMeters : 15,
      radiusKm: typeof radiusKm === 'number' ? radiusKm : 5.0,
      locationName: nearest.location.name,
      oblastName: nearest.location.oblast,
      isActive: true,
      activatedAt: now,
      lastCheckedAt: now,
      pushSubscription: pushSubscription || null
    };

    saveSession(session);

    return NextResponse.json({
      success: true,
      session,
      message: `Моніторинг активовано для локації ${nearest.location.name} (${nearest.location.oblast})`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Session id is required' }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ isActive: false, session: null });
  }

  return NextResponse.json({ isActive: session.isActive, session });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    removeSession(id);
  }

  return NextResponse.json({ success: true, message: 'Моніторинг зупинено' });
}
