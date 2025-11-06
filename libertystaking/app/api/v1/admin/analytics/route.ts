import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/queries';
import { verifyToken } from '@/lib/auth/jwt';

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET!.toLowerCase();

export async function GET(request: NextRequest) {
  try {
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ success: false, error: { message: 'Invalid token' } }, { status: 401 });
    }
    
    // Admin check
    const userWallet = (decoded.walletAddress || '').toLowerCase();
    if (userWallet !== ADMIN_WALLET) {
      return NextResponse.json({ success: false, error: { message: 'Admin required' } }, { status: 403 });
    }

    // Get time range query param
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceStr = sinceDate.toISOString().slice(0, 19).replace('T', ' ');

    // ✅ USERS
    const [{ count: totalUsers }] = await query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM users', []
    );
    const [{ count: newSignups }] = await query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM users WHERE created_at >= ?', [sinceStr]
    );
    const usersGrowth = await query<{ date: string; count: number }>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users WHERE created_at >= ?
       GROUP BY DATE(created_at) ORDER BY date ASC`, [sinceStr]
    );
    const [{ count: activeUsers }] = await query<{ count: number }>(
      `SELECT COUNT(DISTINCT user_id) AS count FROM investments WHERE status = 'active'`, []
    );
    const inactiveUsers = totalUsers - activeUsers;

    // ✅ INVESTMENTS (fixed column names)
    const [{ count: totalInvestments }] = await query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM investments', []
    );
    const [{ count: activeInvestments }] = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM investments WHERE status = 'active'", []
    );
    const [{ count: maturedInvestments }] = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM investments WHERE status = 'active' AND maturity_timestamp <= NOW()", []
    );
    const [{ count: paidInvestments }] = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM investments WHERE fully_paid = 1", []
    );
    const [{ sum: tvl }] = await query<{ sum: string }>(
      "SELECT COALESCE(SUM(total_amount),0) as sum FROM investments WHERE status = 'active'", []
    );
    const byToken = await query<{ token_symbol: string; count: number; sum: string }>(
      `SELECT token_symbol, COUNT(*) AS count, SUM(total_amount) AS sum 
       FROM investments WHERE status = 'active' GROUP BY token_symbol`, []
    );
    const volumeData = await query<{ date: string; volume: string; count: number }>(
      `SELECT DATE(created_at) as date, SUM(total_amount) as volume, COUNT(*) as count
       FROM investments WHERE created_at >= ?
       GROUP BY DATE(created_at) ORDER BY date ASC`, [sinceStr]
    );
    const [{ avg: avgInvestment }] = await query<{ avg: string }>(
      `SELECT COALESCE(AVG(total_amount),0) as avg FROM investments WHERE status = 'active'`, []
    );

    // ✅ PAYOUTS
    const [{ count: pending }] = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM investments WHERE status = 'active' AND maturity_timestamp <= NOW()", []
    );
    const [{ sum: pendingValue }] = await query<{ sum: string }>(
      "SELECT COALESCE(SUM(total_amount),0) as sum FROM investments WHERE status = 'active' AND maturity_timestamp <= NOW()", []
    );
    const [{ count: overdue }] = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM investments WHERE status = 'active' AND maturity_timestamp <= DATE_SUB(NOW(), INTERVAL 7 DAY)", []
    );

    // REFERRALS (fixed column names)
const [{ sum: totalRefEarnings }] = await query<{ sum: string }>(
  "SELECT COALESCE(SUM(amount),0) as sum FROM referral_earnings", []
);
const [{ sum: claimedRef }] = await query<{ sum: string }>(
  "SELECT COALESCE(SUM(amount),0) as sum FROM referral_earnings WHERE claimed = 1", []
);
const [{ sum: pendingRef }] = await query<{ sum: string }>(
  "SELECT COALESCE(SUM(amount),0) as sum FROM referral_earnings WHERE claimed = 0", []
);
const topReferrers = await query<{
  full_name: string;
  wallet_address: string;
  totalReferrals: number;
  totalEarnings: string;
}>(`
  SELECT
    u.full_name,
    re.referrer_wallet as wallet_address,
    COUNT(DISTINCT re.referee_user_id) as totalReferrals,
    COALESCE(SUM(re.amount),0) as totalEarnings
  FROM referral_earnings re
  LEFT JOIN users u ON re.referrer_user_id = u.user_id
  GROUP BY re.referrer_wallet, u.full_name
  ORDER BY totalEarnings DESC
  LIMIT 10
`, []);


    // ✅ EPOCHS
    const epochHistory = await query<{ epoch_id: number; count: number; sum: string }>(
      `SELECT epoch_id, COUNT(*) as count, SUM(total_amount) as sum
       FROM investments GROUP BY epoch_id ORDER BY epoch_id DESC LIMIT 10`, []
    );
    const epochRow = await query<{ epoch_id: number }>(
      'SELECT epoch_id FROM investments ORDER BY epoch_id DESC LIMIT 1', []
    );
    const currentEpoch = epochRow.length > 0 ? epochRow[0].epoch_id : 0;

    // ✅ PLATFORM HEALTH (from platform_stats table if exists)
    let platformStats = {
      treasury_balance: '0',
      staked: tvl?.toString() || '0',
      apr: 0,
      maturity: 0,
      total_paid_out: '0',
      current_epoch_id: currentEpoch
    };

    try {
      const [platformRow] = await query<{
        treasury_balance: string;
        total_staked: string;
        current_apr: number;
        current_maturity_days: number;
        total_paid_out: string;
        current_epoch_id: number;
      }>(
        'SELECT * FROM platform_stats ORDER BY last_updated DESC LIMIT 1', []
      );

      if (platformRow) {
        platformStats = {
          treasury_balance: platformRow.treasury_balance || '0',
          staked: platformRow.total_staked || tvl?.toString() || '0',
          apr: platformRow.current_apr || 0,
          maturity: platformRow.current_maturity_days || 0,
          total_paid_out: platformRow.total_paid_out || '0',
          current_epoch_id: platformRow.current_epoch_id || currentEpoch
        };
      }
    } catch (e) {
      console.log('platform_stats table not found, using calculated values');
    }

    // ✅ Health score calculation
    let healthScore = 100;
    if (parseInt(overdue.toString()) > 0) healthScore -= 20;
    if (parseInt(pending.toString()) > 10) healthScore -= 10;
    if (parseInt(activeInvestments.toString()) === 0) healthScore -= 30;
    if (parseFloat(platformStats.treasury_balance) < 1.1 * parseFloat(platformStats.staked)) healthScore -= 15;
    
    let healthStatus = 'HEALTHY';
    if (healthScore < 70) healthStatus = 'WARNING';
    if (healthScore < 50) healthStatus = 'CRITICAL';

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalValueLocked: tvl?.toString() || '0',
          totalUsers: parseInt(totalUsers.toString()),
          activeUsers: parseInt(activeUsers.toString()),
          totalInvestments: parseInt(totalInvestments.toString()),
          activeInvestments: parseInt(activeInvestments.toString()),
          healthScore,
          healthStatus
        },
        users: {
          total: parseInt(totalUsers.toString()),
          active: parseInt(activeUsers.toString()),
          inactive: inactiveUsers,
          newSignups: parseInt(newSignups.toString()),
          growthData: usersGrowth
        },
        investments: {
          total: parseInt(totalInvestments.toString()),
          active: parseInt(activeInvestments.toString()),
          matured: parseInt(maturedInvestments.toString()),
          paid: parseInt(paidInvestments.toString()),
          averageSize: avgInvestment?.toString() || '0',
          byToken: byToken.map(row => ({
            tokenSymbol: row.token_symbol,
            count: row.count,
            totalAmount: row.sum
          })),
          volumeData: volumeData
        },
        payouts: {
          pending: parseInt(pending.toString()),
          pendingValue: pendingValue?.toString() || '0',
          overdue: parseInt(overdue.toString())
        },
        referrals: {
          totalEarnings: totalRefEarnings?.toString() || '0',
          claimed: claimedRef?.toString() || '0',
          pending: pendingRef?.toString() || '0',
          topReferrers
        },
        epochs: {
          current: currentEpoch,
          history: epochHistory.map(row => ({
            epochId: row.epoch_id,
            count: row.count,
            totalAmount: row.sum
          }))
        },
        platformStats
      }
    });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: { message: error.message || 'Failed to fetch analytics' } 
    }, { status: 500 });
  }
}
