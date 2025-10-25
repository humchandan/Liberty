import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization token' } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build query based on status filter
    let sql = `
      SELECT 
        investment_id as investmentId,
        order_id as orderId,
        token_symbol as tokenSymbol,
        total_amount as totalAmount,
        order_count as orderCount,
        amount_per_order as amountPerOrder,
        locked_apr as lockedApr,
        locked_maturity_duration as lockedMaturityDuration,
        stake_timestamp as stakeDate,
        maturity_timestamp as maturityDate,
        epoch_id as epochId,
        paid_order_count as paidOrderCount,
        fully_paid as fullyPaid,
        is_reinvestment as isReinvestment,
        status,
        stake_tx_hash as txHash,
        created_at,
        updated_at
      FROM investments
      WHERE user_id = ?
    `;

    const params: any[] = [userId];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const investments = await query(sql, params);

    // Calculate maturity countdown for each investment
    const now = new Date();
    const enrichedInvestments = investments.map((inv: any) => {
      const maturityDate = new Date(inv.maturityDate);
      const difference = maturityDate.getTime() - now.getTime();
      
      const isMatured = difference <= 0;
      const days = Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)));
      const hours = Math.max(0, Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
      const minutes = Math.max(0, Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)));
      const seconds = Math.max(0, Math.floor((difference % (1000 * 60)) / 1000));

      const remainingOrders = inv.orderCount - inv.paidOrderCount;
      const expectedInterest = (parseFloat(inv.totalAmount) * (inv.lockedApr / 10000) * (inv.lockedMaturityDuration / 31536000)).toFixed(2);
      const expectedPayout = (parseFloat(inv.totalAmount) + parseFloat(expectedInterest)).toFixed(2);

      return {
        ...inv,
        lockedApr: inv.lockedApr / 100, // Convert basis points to percentage
        maturityCountdown: {
          days,
          hours,
          minutes,
          seconds,
          isMatured,
        },
        remainingOrders,
        expectedInterest,
        expectedPayout,
      };
    });

    return NextResponse.json({
      success: true,
      investments: enrichedInvestments,
    });
  } catch (error: any) {
    console.error('Failed to fetch investments:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
