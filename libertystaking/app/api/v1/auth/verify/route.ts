import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/auth/signature';
import { generateToken } from '@/lib/auth/jwt';
import { getUserByWallet, updateLastLogin, isAdmin } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, signature, nonce } = body;

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Wallet address, signature, and nonce are required',
          },
        },
        { status: 422 }
      );
    }

    const isValid = await verifySignature(walletAddress, signature, nonce);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid signature',
          },
        },
        { status: 401 }
      );
    }

    const user = await getUserByWallet(walletAddress);
    const isNewUser = !user;

    if (user) {
      await updateLastLogin(user.user_id);
    }

    const token = generateToken({
      userId: user?.user_id || 0,
      walletAddress: walletAddress,
      isAdmin: await isAdmin(walletAddress),
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        userId: user?.user_id || 0,
        walletAddress,
        isNewUser,
        profileCompleted: user?.profile_completed || false,
        isAdmin: await isAdmin(walletAddress),
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Authentication failed',
        },
      },
      { status: 500 }
    );
  }
}
