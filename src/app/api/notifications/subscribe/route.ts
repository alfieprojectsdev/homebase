
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { getServerSession } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
    try {
        const subscription = await req.json();
        const authUser = await getServerSession();

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.userId;

        await db.insert(pushSubscriptions).values({
            userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
        }).onConflictDoNothing();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
