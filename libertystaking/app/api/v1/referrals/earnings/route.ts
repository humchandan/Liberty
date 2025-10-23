import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getUserReferralEarnings } from '@/lib/db/referrals';

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const claimedFilter = searchParams.get('claimed');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let claimed: boolean | undefined;
    if (claimedFilter === 'true') claimed = true;
    else if (claimedFilter === 'false') claimed = false;

    const { earnings, total } = await getUserReferralEarnings(user.userId, claimed, page, limit);

    return NextResponse.json({
      success: true,
      earnings: earnings.map((earning: any) => ({
        earningId: earning.earning_id,
        refereeWallet: earning.referee_wallet,
        level: earning.level,
        amount: earning.amount,
        percentage: earning.percentage,
        investmentAmount: earning.investment_amount,
        claimed: earning.claimed,
        earnedAt: earning.earned_at,
        txHash: earning.tx_hash,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error('Earnings list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch earnings',
        },
      },
      { status: 500 }
    );
  }
});
