import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { passwordResetTokens, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Mask email for privacy
 * Example: "user@example.com" -> "us**@ex*****.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2
    ? local.substring(0, 2) + '*'.repeat(Math.min(local.length - 2, 2))
    : local;
  const maskedDomain = domain.length > 2
    ? domain.substring(0, 2) + '*'.repeat(Math.min(domain.length - 2, 5)) + '.' + domain.split('.').pop()
    : domain;
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * GET /api/auth/reset-validate?token=xxx
 *
 * Validates a password reset token before showing the reset form.
 * Checks if the token exists, is not expired, and has not been used.
 *
 * @param request - Next.js request with token query parameter
 * @returns JSON response with validation status and masked email (if valid)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract token from query parameters
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, reason: 'not_found' },
        { status: 400 }
      );
    }

    // Lookup token in database with user join to get email
    const result = await db
      .select({
        token: passwordResetTokens.token,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
        email: users.email,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    // Token not found
    if (result.length === 0) {
      return NextResponse.json(
        { valid: false, reason: 'not_found' },
        { status: 404 }
      );
    }

    const tokenData = result[0];

    // Check if token has already been used
    if (tokenData.usedAt !== null) {
      return NextResponse.json(
        { valid: false, reason: 'used' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (tokenData.expiresAt <= new Date()) {
      return NextResponse.json(
        { valid: false, reason: 'expired' },
        { status: 400 }
      );
    }

    // Token is valid - return success with masked email
    return NextResponse.json(
      {
        valid: true,
        email: maskEmail(tokenData.email),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error validating reset token:', error);
    return NextResponse.json(
      { valid: false, reason: 'not_found' },
      { status: 500 }
    );
  }
}
