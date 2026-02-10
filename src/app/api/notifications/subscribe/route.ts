import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscription = await req.json();

        await db.insert(pushSubscriptions).values({
            userId: authUser.userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
        }).onConflictDoNothing();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
