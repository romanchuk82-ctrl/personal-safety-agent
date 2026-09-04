import { NextResponse } from 'next/server';
export const dynamic = 'force-static';
export function POST() {
  return NextResponse.json({ success: true, message: 'Test alert sent' });
}
