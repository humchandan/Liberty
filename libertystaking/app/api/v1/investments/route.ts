import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

interface Investment {
  investmentId: number;
  orderId: number | null;
  tokenSymbol: string;
  totalAmount: string;
  orderCount: number;
  amountPerOrder: string;
  lockedApr: number;
  lockedMaturityDuration: number;
  stakeDate: string;
  maturityDate: string;
  epochId: number;
  paidOrderCount: number;
  fullyPaid: boolean;
  isReinvestment: boolean;
  status: string;
  txHash: string;
  created_at: string;
  updated_at: string;
}

interface EnrichedInvestment extends Investment {
  lockedAprPercentage: number;
  maturityCountdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isMatured: boolean;
  };
  remainingOrders: number;
  expectedInterest: string;
  expectedPayout: string;
  canClaim: boolean;
}

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
    const statusFilter = searchParams.get('status');

    // ✅ Build query based on status filter
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

    if (statusFilter && statusFilter !== 'all') {
      sql += ' AND status = ?';
      params.push(statusFilter);
    }

    sql += ' ORDER BY created_at DESC';

    const investments = await query<Investment>(sql, params);

    // ✅ Calculate maturity countdown and expected returns
    const now = new Date();
    const enrichedInvestments: EnrichedInvestment[] = investments.map((inv: Investment) => {
      const maturityDate = new Date(inv.maturityDate);
      const stakeDate = new Date(inv.stakeDate);
      const difference = maturityDate.getTime() - now.getTime();
      
      const isMatured = difference <= 0;
      const days = Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)));
      const hours = Math.max(0, Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
      const minutes = Math.max(0, Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)));
      const seconds = Math.max(0, Math.floor((difference % (1000 * 60)) / 1000));

      const remainingOrders = inv.orderCount - inv.paidOrderCount;
      
      // ✅ Calculate expected interest (with 5% fee)
      const principal = parseFloat(inv.totalAmount);
      const aprPercentage = inv.lockedApr / 100; // Convert BP to %
      const durationDays = inv.lockedMaturityDuration / 86400; // Convert seconds to days
      const dailyRate = aprPercentage / 365 / 100;
      const interest = principal * dailyRate * durationDays;
      const interestFee = interest * 0.05; // 5% fee
      const netInterest = interest - interestFee;
      const expectedPayout = principal + netInterest;

      // ✅ Can claim if matured and not fully paid
      const canClaim = isMatured && !inv.fullyPaid && inv.status === 'active';

      return {
        ...inv,
        lockedAprPercentage: aprPercentage,
        maturityCountdown: {
          days,
          hours,
          minutes,
          seconds,
          isMatured,
        },
        remainingOrders,
        expectedInterest: netInterest.toFixed(2),
        expectedPayout: expectedPayout.toFixed(2),
        canClaim
      };
    });

    // ✅ Calculate summary stats
    const summary = {
      total: enrichedInvestments.length,
      active: enrichedInvestments.filter(i => i.status === 'active' && !i.maturityCountdown.isMatured).length,
      matured: enrichedInvestments.filter(i => i.canClaim).length,
      claimed: enrichedInvestments.filter(i => i.fullyPaid).length,
      totalStaked: enrichedInvestments
        .filter(i => i.status === 'active')
        .reduce((sum, i) => sum + parseFloat(i.totalAmount), 0)
        .toFixed(2),
      totalClaimable: enrichedInvestments
        .filter(i => i.canClaim)
        .reduce((sum, i) => sum + parseFloat(i.expectedPayout), 0)
        .toFixed(2),
    };

    return NextResponse.json({
      success: true,
      investments: enrichedInvestments,
      summary
    });
  } catch (error: any) {
    console.error('Failed to fetch investments:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
