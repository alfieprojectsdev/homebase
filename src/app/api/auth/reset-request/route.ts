import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Lookup user by email (case-insensitive)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // If user not found, return success anyway to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiration: 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Delete any existing unused tokens for this user (cleanup)
    await db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt)
        )
      );

    // Insert new token into password_reset_tokens table
    await db.insert(passwordResetTokens).values({
      token,
      userId: user.id,
      orgId: user.orgId,
      expiresAt,
      createdAt: new Date(),
    });

    // Return response with token and reset link (Phase 1 only)
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      resetLink,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
