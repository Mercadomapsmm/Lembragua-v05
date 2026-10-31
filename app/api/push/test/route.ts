import { NextRequest, NextResponse } from 'next/server';
import { scheduleServerTestPush } from '@/lib/push-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.subscription?.endpoint) {
      return NextResponse.json({ error: 'Missing push subscription' }, { status: 400 });
    }

    const delayMs = typeof body.delayMs === 'number' ? body.delayMs : 5000;
    scheduleServerTestPush(body.subscription, delayMs);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to schedule test push' }, { status: 500 });
  }
}
