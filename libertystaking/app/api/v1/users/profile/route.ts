import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { getUserById } from '@/lib/db/users';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid token' } },
        { status: 401 }
      );
    }

    console.log('🔍 Getting profile for user:', decoded.userId);
    
    const userProfile = await getUserById(decoded.userId);

    if (!userProfile) {
      console.error('❌ User not found in database');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    console.log('✅ User profile found:', userProfile.wallet_address);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      success: true,
      user: {
        userId: userProfile.user_id,
        walletAddress: userProfile.wallet_address,
        customReferralCode: userProfile.custom_referral_code,
        referralLink: `${appUrl}/signup?ref=${userProfile.custom_referral_code}`,
        referredBy: userProfile.referred_by,
        fullName: userProfile.full_name,
        email: userProfile.email,
        mobileNumber: userProfile.mobile_number,
        address: userProfile.address,
        zipCode: userProfile.zip_code,
        country: userProfile.country,
        emailVerified: userProfile.email_verified,
        mobileVerified: userProfile.mobile_verified,
        referrerSetOnchain: userProfile.referrer_set_onchain,
        referrerSetTxHash: userProfile.referrer_set_tx_hash,
        createdAt: userProfile.created_at,
        lastLogin: userProfile.last_login,
      },
    });
  } catch (error: any) {
    console.error('❌ Get profile error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Failed to fetch profile',
        },
      },
      { status: 500 }
    );
  }
}
