import { NextRequest, NextResponse } from 'next/server';
import { confirmSubscriberAlert } from '@/lib/push-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.alertId || !body?.alertType || !body?.time) {
      return NextResponse.json({ error: 'Missing alert fields' }, { status: 400 });
    }

    const updated = confirmSubscriberAlert({
      endpoint: body.endpoint,
      alertId: body.alertId,
      alertType: body.alertType,
      time: body.time,
      medicineId: body.medicineId,
      date: body.date,
    });

    return NextResponse.json({ ok: true, updated });
  } catch {
    return NextResponse.json({ error: 'Failed to confirm alert' }, { status: 500 });
  }
}
