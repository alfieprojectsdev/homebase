
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

// Hacky auth retrieval for MVP (ideally usage middleware or session helper)
function getUserId() {
    // For now, assuming first user or extracting from header if passed.
    // In real app, verify JWT from cookie.
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    try {
        const decoded: any = verify(token, process.env.JWT_SECRET!);
        return decoded.userId;
    } catch {
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const subscription = await req.json();
        const userId = getUserId();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
