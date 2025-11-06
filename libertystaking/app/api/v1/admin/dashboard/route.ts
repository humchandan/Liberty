import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/queries';

export const GET = withAuth(async (request, user) => {
  try {
    // Double-check admin status
    const isAdmin = user.walletAddress.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
    
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        { status: 403 }
      );
    }
   
    // ✅ Get platform stats (fixed column names)
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

    // ✅ Get recent signups (last 30 days)
    const recentSignups = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    // ✅ Get active investments (fixed column names)
    const activeInvestments = await queryOne<{ count: number; total: string }>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
       FROM investments 
       WHERE status = 'active'`
    );

    // ✅ Get matured investments awaiting claim
    const maturedInvestments = await queryOne<{ count: number; total: string }>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
       FROM investments 
       WHERE status = 'active' AND maturity_timestamp <= NOW()`
    );

    // ✅ Get claimed investments
    const claimedInvestments = await queryOne<{ count: number; total: string }>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
       FROM investments 
       WHERE fully_paid = 1`
    );

    // ✅ Get referral stats (fixed column names)
    const referralStats = await queryOne<{ 
      totalEarnings: string; 
      totalClaimed: string;
      totalReferrers: number;
      activeReferrers: number;
    }>(
      `SELECT 
        COALESCE(SUM(amount), 0) as totalEarnings,
        COALESCE(SUM(CASE WHEN claimed = 1 THEN amount ELSE 0 END), 0) as totalClaimed,
        COUNT(DISTINCT referrer_id) as totalReferrers,
        COUNT(DISTINCT CASE WHEN claimed = 0 THEN referrer_id END) as activeReferrers
       FROM referral_earnings`
    );

    // ✅ Get epoch stats
    const epochStats = await queryOne<{
      currentEpoch: number;
      totalEpochs: number;
      activeOrders: number;
    }>(
      `SELECT 
        COALESCE(MAX(epoch_id), 0) as currentEpoch,
        COUNT(DISTINCT epoch_id) as totalEpochs,
        COUNT(*) as activeOrders
       FROM investments 
       WHERE status = 'active'`
    );

    // ✅ Get recent activity (last 7 days)
    const recentActivity = await queryOne<{
      newUsers: number;
      newInvestments: number;
      totalStakedRecent: string;
    }>(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newUsers,
        (SELECT COUNT(*) FROM investments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newInvestments,
        (SELECT COALESCE(SUM(total_amount), 0) FROM investments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as totalStakedRecent`
    );

    // ✅ Get top referrers (top 5)
    const topReferrers = await queryOne<{
      wallet: string;
      totalEarned: string;
      referralCount: number;
    }>(
      `SELECT 
        referrer_wallet as wallet,
        SUM(amount) as totalEarned,
        COUNT(DISTINCT referee_user_id) as referralCount
       FROM referral_earnings
       GROUP BY referrer_wallet
       ORDER BY totalEarned DESC
       LIMIT 5`
    );

    return NextResponse.json({
      success: true,
      dashboard: {
        // User metrics
        users: {
          total: platformStats?.totalUsers || 0,
          active: platformStats?.activeUsers || 0,
          recentSignups: recentSignups?.count || 0,
          newThisWeek: recentActivity?.newUsers || 0,
        },
        
        // Investment metrics
        investments: {
          total: platformStats?.totalInvestments || 0,
          active: activeInvestments?.count || 0,
          matured: maturedInvestments?.count || 0,
          claimed: claimedInvestments?.count || 0,
          totalStaked: platformStats?.totalStaked || '0',
          activeValue: activeInvestments?.total || '0',
          maturedValue: maturedInvestments?.total || '0',
          claimedValue: claimedInvestments?.total || '0',
          newThisWeek: recentActivity?.newInvestments || 0,
          stakedThisWeek: recentActivity?.totalStakedRecent || '0',
        },
        
        // Referral metrics
        referrals: {
          totalEarnings: referralStats?.totalEarnings || '0',
          totalClaimed: referralStats?.totalClaimed || '0',
          pending: (
            parseFloat(referralStats?.totalEarnings || '0') - 
            parseFloat(referralStats?.totalClaimed || '0')
          ).toFixed(2),
          totalReferrers: referralStats?.totalReferrers || 0,
          activeReferrers: referralStats?.activeReferrers || 0,
          topReferrers: topReferrers || [],
        },
        
        // Epoch metrics
        epochs: {
          current: epochStats?.currentEpoch || 0,
          total: epochStats?.totalEpochs || 0,
          activeOrders: epochStats?.activeOrders || 0,
        },
        
        // Recent activity (last 7 days)
        recentActivity: {
          newUsers: recentActivity?.newUsers || 0,
          newInvestments: recentActivity?.newInvestments || 0,
          totalStaked: recentActivity?.totalStakedRecent || '0',
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
