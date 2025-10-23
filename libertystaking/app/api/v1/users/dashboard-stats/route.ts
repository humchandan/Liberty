import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/queries';

export const GET = withAuth(async (request, user) => {
  try {
    // Get investment stats
    const investmentStats = await queryOne<{
      totalInvested: string;
      activeInvestments: number;
    }>(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as totalInvested,
        COUNT(*) as activeInvestments
       FROM investments 
       WHERE user_id = ? AND status IN ('active', 'matured', 'partially_paid')`,
      [user.userId]
    );

    // Get referral stats
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
      [user.userId]
    );

    // Get team stats
    const teamStats = await queryOne<{
      totalSize: number;
      activeMembers: number;
    }>(
      `SELECT 
        total_team_size as totalSize,
        active_members as activeMembers
       FROM team_stats 
       WHERE user_id = ?`,
      [user.userId]
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalInvested: investmentStats?.totalInvested || '0',
        activeInvestments: investmentStats?.activeInvestments || 0,
        totalEarned: '0', // Calculate from investments
        pendingPayouts: '0', // Calculate from mature investments
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
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch dashboard stats',
        },
      },
      { status: 500 }
    );
  }
});
