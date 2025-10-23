import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getUserInvestments } from '@/lib/db/investments';

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'completed' | 'all' | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const { investments, total } = await getUserInvestments(
      user.userId,
      status || 'all',
      page,
      limit
    );

    // Add countdown for each investment
    const investmentsWithCountdown = investments.map((inv) => {
      const now = Date.now();
      const maturityTime = new Date(inv.maturity_timestamp).getTime();
      const remainingMs = Math.max(0, maturityTime - now);
      
      const totalSeconds = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        investmentId: inv.investment_id,
        orderId: inv.order_id,
        tokenSymbol: inv.token_symbol,
        totalAmount: inv.total_amount,
        orderCount: inv.order_count,
        lockedApr: inv.locked_apr / 100,
        stakeDate: inv.stake_timestamp,
        maturityDate: inv.maturity_timestamp,
        maturityCountdown: {
          days,
          hours,
          minutes,
          seconds,
          totalSeconds,
        },
        status: inv.status,
        paidOrderCount: inv.paid_order_count,
        remainingOrders: inv.order_count - inv.paid_order_count,
        expectedPayout: (parseFloat(inv.total_amount) * (1 + inv.locked_apr / 10000)).toFixed(2),
        txHash: inv.stake_tx_hash,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      investments: investmentsWithCountdown,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Get investments error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch investments',
        },
      },
      { status: 500 }
    );
  }
});
