import { NextResponse } from 'next/server';
export const dynamic = 'force-static';
export function GET() {
  return NextResponse.json({ status: 'HEALTHY', message: 'Personal Safety Agent API ready' });
}
