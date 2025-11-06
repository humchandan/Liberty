import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { markReferrerSetOnchain } from '@/lib/db/users';

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Transaction hash is required',
          },
        },
        { status: 422 }
      );
    }

    console.log('📝 Marking referrer as set for user:', user.userId, 'tx:', txHash);

    await markReferrerSetOnchain(user.userId, txHash);

    return NextResponse.json({
      success: true,
      message: 'Referrer marked as set on blockchain',
    });
  } catch (error) {
    console.error('❌ Mark referrer set error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to mark referrer as set',
        },
      },
      { status: 500 }
    );
  }
});
