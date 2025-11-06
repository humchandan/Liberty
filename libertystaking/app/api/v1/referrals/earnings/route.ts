import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const earnings = await query<{
  earning_id: number;
  referee_wallet: string;
  level: number;
  amount: string;
  percentage: number;
  investment_amount: string;
  claimed: boolean;
  earned_at: string;
  tx_hash: string;
}>(
  `SELECT 
    earning_id,
    referee_wallet,
    level,
    amount,
    percentage,
    investment_amount,
    claimed,
    earned_at,
    tx_hash
  FROM referral_earnings
  WHERE referrer_user_id = ?
  ORDER BY earned_at DESC
  LIMIT ? OFFSET ?`,
  [decoded.userId, limit, offset]
);

// Transform to match frontend interface
const transformedEarnings = earnings.map(e => ({
  earningId: e.earning_id,
  refereeWallet: e.referee_wallet,
  level: e.level,
  amount: e.amount,
  percentage: e.percentage,
  investmentAmount: e.investment_amount,
  claimed: e.claimed,
  earnedAt: e.earned_at,
  txHash: e.tx_hash
}));


    return NextResponse.json({
      success: true,
      earnings: transformedEarnings
    });

  } catch (error: any) {
    console.error('Referral earnings error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch referral earnings' } },
      { status: 500 }
    );
  }
}
