import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getUserById } from '@/lib/db/users';

export const GET = withAuth(async (request, user) => {
  try {
    console.log('🔍 Getting profile for user:', user.userId);
    
    const userProfile = await getUserById(user.userId);

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
        referralLink: `${appUrl}/join/${userProfile.custom_referral_code}`,
        fullName: userProfile.full_name,
        email: userProfile.email,
        mobileNumber: userProfile.mobile_number,
        address: userProfile.address,
        zipCode: userProfile.zip_code,
        country: userProfile.country,
        emailVerified: userProfile.email_verified,
        mobileVerified: userProfile.mobile_verified,
        createdAt: userProfile.created_at,
        lastLogin: userProfile.last_login,
      },
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch profile',
        },
      },
      { status: 500 }
    );
  }
});
