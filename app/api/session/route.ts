import { NextResponse } from 'next/server';
export const dynamic = 'force-static';
export function GET() {
  return NextResponse.json({ success: true });
}
export function POST() {
  return NextResponse.json({ success: true });
}
export function DELETE() {
  return NextResponse.json({ success: true });
}
