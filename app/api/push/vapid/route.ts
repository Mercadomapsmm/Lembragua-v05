import { NextResponse } from 'next/server';
import { getPublicVapidKey } from '@/lib/push-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = getPublicVapidKey();
  return NextResponse.json({ publicKey });
}
