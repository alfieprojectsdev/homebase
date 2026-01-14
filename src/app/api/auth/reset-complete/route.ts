import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { passwordResetTokens, users } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/password';

/**
 * POST /api/auth/reset-complete
 *
 * Completes the password reset process by validating the token and updating the user's password.
 * Uses optimistic locking to prevent race conditions: token is marked as used BEFORE password update.
 * This prevents parallel request attacks where an attacker could reuse a token in flight.
 *
 * @param request - Next.js request with JSON body: { token, newPassword }
 * @returns JSON response indicating success or specific error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { token, newPassword } = body;

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { success: false, error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 8 characters)
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Lookup token in database to get userId and orgId
    const result = await db
      .select({
        userId: passwordResetTokens.userId,
        orgId: passwordResetTokens.orgId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    // Token not found
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 404 }
      );
    }

    const tokenData = result[0];

    // Check if token has already been used
    if (tokenData.usedAt !== null) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (tokenData.expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // CRITICAL SECURITY: Mark token as used BEFORE updating password (prevents race condition)
    // Uses optimistic locking to prevent parallel request attacks
    const markUsedResult = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.token, token),
          isNull(passwordResetTokens.usedAt) // Only update if not already used
        )
      )
      .returning();

    // Check if we successfully marked it (token was not already used)
    if (markUsedResult.length === 0) {
      // Token was already used by another parallel request
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Token is now marked as used - safe to update password (no race condition)
    try {
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(
          and(
            eq(users.id, tokenData.userId),
            eq(users.orgId, tokenData.orgId) // Critical for multi-tenancy
          )
        );
    } catch (error) {
      console.error('Error updating password:', error);
      // Token is already marked as used, which is correct even on failure
      throw error;
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Password updated successfully. Please log in.',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error completing password reset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
