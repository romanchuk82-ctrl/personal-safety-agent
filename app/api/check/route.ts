import { NextResponse } from 'next/server';
export const dynamic = 'force-static';
export function GET() {
  return NextResponse.json({ success: true, message: 'Check endpoint static stub' });
}
export function POST() {
  return NextResponse.json({ success: true, message: 'Check endpoint' });
}
