import { NextRequest, NextResponse } from 'next/server';
import { DailyBriefingService } from '@/core/application/services/DailyBriefingService';
import { BillRepository } from '@/infrastructure/adapters/neon/BillRepository';
import { UserRepository } from '@/infrastructure/adapters/neon/UserRepository';
import { CompositeNotifier } from '@/infrastructure/adapters/notifications/CompositeNotifier';
import { WebPushNotifier } from '@/infrastructure/adapters/notifications/WebPushNotifier';
import { ExpoPushNotifier } from '@/infrastructure/adapters/notifications/ExpoPushNotifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Ensure cron always runs fresh

export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Composition Root (Wiring up the Hexagon)
        const billRepo = new BillRepository();
        const userRepo = new UserRepository();
        const notifier = new CompositeNotifier(
            new WebPushNotifier(),
            new ExpoPushNotifier()
        );

        // Instantiate Service
        const briefingService = new DailyBriefingService(billRepo, userRepo, notifier);

        // Execute
        await briefingService.runSystemCheck();

        return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
