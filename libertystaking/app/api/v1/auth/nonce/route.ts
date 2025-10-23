import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from '@/lib/auth/signature';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Wallet address is required',
          },
        },
        { status: 422 }
      );
    }

    const nonce = generateNonce(walletAddress);

    return NextResponse.json({
      success: true,
      nonce,
      expiresIn: 300,
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to generate nonce',
        },
      },
      { status: 500 }
    );
  }
}
