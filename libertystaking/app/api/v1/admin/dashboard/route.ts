import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/queries';

export const GET = withAdminAuth(async (request, user) => {
  try {
    // Get platform stats
    const platformStats = await queryOne<{
      totalUsers: number;
      activeUsers: number;
      totalStaked: string;
      totalInvestments: number;
    }>(
      `SELECT 
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as activeUsers,
        (SELECT COALESCE(SUM(total_amount), 0) FROM investments) as totalStaked,
        (SELECT COUNT(*) FROM investments) as totalInvestments`
    );

    // Get recent signups (last 30 days)
    const recentSignups = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    // Get active investments
    const activeInvestments = await queryOne<{ count: number; total: string }>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
       FROM investments 
       WHERE status IN ('active', 'matured', 'partially_paid')`
    );

    // Get referral stats
    const referralStats = await queryOne<{ totalEarnings: string; totalClaimed: string }>(
      `SELECT 
        COALESCE(SUM(amount), 0) as totalEarnings,
        COALESCE(SUM(CASE WHEN claimed = 1 THEN amount ELSE 0 END), 0) as totalClaimed
       FROM referral_earnings`
    );

    return NextResponse.json({
      success: true,
      dashboard: {
        users: {
          total: platformStats?.totalUsers || 0,
          active: platformStats?.activeUsers || 0,
          recentSignups: recentSignups?.count || 0,
        },
        investments: {
          total: platformStats?.totalInvestments || 0,
          active: activeInvestments?.count || 0,
          totalStaked: platformStats?.totalStaked || '0',
          activeValue: activeInvestments?.total || '0',
        },
        referrals: {
          totalEarnings: referralStats?.totalEarnings || '0',
          totalClaimed: referralStats?.totalClaimed || '0',
          pending: (parseFloat(referralStats?.totalEarnings || '0') - parseFloat(referralStats?.totalClaimed || '0')).toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch dashboard data',
        },
      },
      { status: 500 }
    );
  }
});
