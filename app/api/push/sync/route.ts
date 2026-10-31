import { NextRequest, NextResponse } from 'next/server';
import {
  upsertPushSubscriber,
  removePushSubscriber,
} from '@/lib/push-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    upsertPushSubscriber({
      subscription: body.subscription,
      notificationsEnabled: Boolean(body.notificationsEnabled),
      timeZone: body.timeZone,
      timezoneOffsetMinutes: body.timezoneOffsetMinutes,
      water: body.water,
      medicine: body.medicine,
      clientActiveAlertIds: body.clientActiveAlertIds,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to sync push schedule' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.endpoint) {
      removePushSubscriber(body.endpoint);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove push subscription' }, { status: 500 });
  }
}
