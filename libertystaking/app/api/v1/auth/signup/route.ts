import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth/jwt';
import {
  createUser,
  generateUniqueReferralCode,
  userExists,
  emailExists,
  getUserByReferralCode,
  isAdmin,
} from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, referrerCode, userData } = body;

    if (!walletAddress || !userData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
          },
        },
        { status: 422 }
      );
    }

    const { fullName, email, mobileNumber, address, zipCode, country } = userData;
    if (!fullName || !email || !mobileNumber || !address || !zipCode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All user data fields are required',
          },
        },
        { status: 422 }
      );
    }

    if (await userExists(walletAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_WALLET',
            message: 'Wallet address already registered',
          },
        },
        { status: 409 }
      );
    }

    if (await emailExists(email)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'Email already registered',
          },
        },
        { status: 409 }
      );
    }

    let referrerWallet: string | null = null;
    if (referrerCode) {
      const referrer = await getUserByReferralCode(referrerCode);
      if (referrer) {
        referrerWallet = referrer.wallet_address;
      }
    }

    const customReferralCode = await generateUniqueReferralCode(fullName);

    const userId = await createUser({
      walletAddress,
      customReferralCode,
      referrerWalletAddress: referrerWallet || undefined,
      referrerCode: referrerCode || undefined,
      fullName,
      email,
      mobileNumber,
      address,
      zipCode,
      country: country || undefined,
    });

    const token = generateToken({
      userId,
      walletAddress,
      isAdmin: await isAdmin(walletAddress),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        userId,
        walletAddress,
        customReferralCode,
        referralLink: `${appUrl}/join/${customReferralCode}`,
        referrerWallet,
      },
      token,
      setReferrerRequired: referrerWallet !== null,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to create account',
        },
      },
      { status: 500 }
    );
  }
}
