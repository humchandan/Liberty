import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { queryOne } from '@/lib/db/queries';

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

    // ✅ Get investment stats (fixed status check)
    const investmentStats = await queryOne<{
      totalInvested: string;
      activeInvestments: number;
    }>(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as totalInvested,
        COUNT(*) as activeInvestments
       FROM investments 
       WHERE user_id = ? AND status = 'active'`,
      [decoded.userId]
    );

    // Get referral stats (FIXED column names)
const referralStats = await queryOne<{
  totalEarned: string;
  totalClaimed: string;
  pendingClaims: string;
}>(
  `SELECT 
    COALESCE(SUM(amount), 0) as totalEarned,
    COALESCE(SUM(CASE WHEN claimed = 1 THEN amount ELSE 0 END), 0) as totalClaimed,
    COALESCE(SUM(CASE WHEN claimed = 0 THEN amount ELSE 0 END), 0) as pendingClaims
   FROM referral_earnings 
   WHERE referrer_user_id = ?`,
  [decoded.userId]
);


    // ✅ Get team stats (fixed column names)
    const teamStats = await queryOne<{
      totalSize: number;
      activeMembers: number;
    }>(
      `SELECT 
        total_team_size as totalSize,
        active_members as activeMembers
       FROM team_stats 
       WHERE user_id = ?`,
      [decoded.userId]
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalInvested: investmentStats?.totalInvested || '0',
        activeInvestments: investmentStats?.activeInvestments || 0,
        referralEarnings: {
          total: referralStats?.totalEarned || '0',
          claimable: referralStats?.pendingClaims || '0',
          claimed: referralStats?.totalClaimed || '0',
        },
        teamStats: {
          totalSize: teamStats?.totalSize || 0,
          activeMembers: teamStats?.activeMembers || 0,
          inactiveMembers: (teamStats?.totalSize || 0) - (teamStats?.activeMembers || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Failed to fetch dashboard stats',
        },
      },
      { status: 500 }
    );
  }
}
