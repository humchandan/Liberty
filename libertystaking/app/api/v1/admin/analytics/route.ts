import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/connection';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET!.toLowerCase();

export async function GET(request: NextRequest) {
  try {
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }
    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ success: false, error: { message: 'Invalid token' } }, { status: 401 });
    }
    // Admin check
    const userWallet = (decoded.walletAddress || decoded.wallet_address || '').toLowerCase();
    if (userWallet !== ADMIN_WALLET) {
      return NextResponse.json({ success: false, error: { message: 'Admin required' } }, { status: 403 });
    }

    // Get time range query param
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceStr = sinceDate.toISOString().slice(0, 19).replace('T', ' ');

    // USERS
    const [{ count: totalUsers }] = await query('SELECT COUNT(*) AS count FROM users');
    const [{ count: newSignups }] = await query('SELECT COUNT(*) AS count FROM users WHERE created_at >= ?', [sinceStr]);
    const usersGrowth = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users WHERE created_at >= ?
       GROUP BY DATE(created_at) ORDER BY date ASC`, [sinceStr]
    );
    const [{ count: activeUsers }] = await query(
      `SELECT COUNT(DISTINCT user_id) AS count FROM investments WHERE status = 'active'`
    );
    const inactiveUsers = totalUsers - activeUsers;

    // INVESTMENTS
    const [{ count: totalInvestments }] = await query('SELECT COUNT(*) AS count FROM investments');
    const [{ count: activeInvestments }] = await query("SELECT COUNT(*) as count FROM investments WHERE status = 'active'");
    const [{ count: maturedInvestments }] = await query("SELECT COUNT(*) as count FROM investments WHERE status = 'matured'");
    const [{ count: paidInvestments }] = await query("SELECT COUNT(*) as count FROM investments WHERE status IN ('completed', 'withdrawn')");
    const [{ sum: tvl }] = await query("SELECT COALESCE(SUM(total_amount),0) as sum FROM investments WHERE status = 'active'");
    const byToken = await query(
      `SELECT token_symbol, COUNT(*) AS count, SUM(total_amount) AS sum FROM investments WHERE status = 'active' GROUP BY token_symbol`
    );
    const volumeData = await query(
      `SELECT DATE(created_at) as date, SUM(total_amount) as volume, COUNT(*) as count
       FROM investments WHERE created_at >= ?
       GROUP BY DATE(created_at) ORDER BY date ASC`, [sinceStr]
    );
    const [{ avg }] = await query(
      `SELECT COALESCE(AVG(total_amount),0) as avg FROM investments WHERE status = 'active'`
    );

    // PAYOUTS
    const [{ count: pending }] = await query(
      "SELECT COUNT(*) as count FROM investments WHERE status = 'matured' AND maturity_timestamp <= NOW()"
    );
    const [{ sum: pendingValue }] = await query(
      "SELECT COALESCE(SUM(total_amount),0) as sum FROM investments WHERE status = 'matured'"
    );
    const [{ count: overdue }] = await query(
      "SELECT COUNT(*) as count FROM investments WHERE status = 'matured' AND maturity_timestamp <= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );

    // REFERRALS
    const [{ sum: totalRefEarnings }] = await query("SELECT COALESCE(SUM(amount),0) as sum FROM referral_earnings");
    const [{ sum: claimed }] = await query("SELECT COALESCE(SUM(amount),0) as sum FROM referral_earnings WHERE claimed = 1");
    const [{ sum: pendingRef }] = await query("SELECT COALESCE(SUM(amount),0) as sum FROM referral_earnings WHERE claimed = 0");
    const topReferrers = await query(`
      SELECT
        ru.full_name,
        re.referrer_wallet as wallet_address,
        COUNT(DISTINCT re.referee_investment_id) as totalReferrals,
        COALESCE(SUM(re.amount),0) as totalEarnings
      FROM referral_earnings re
      LEFT JOIN users ru ON re.referrer_user_id = ru.user_id
      GROUP BY re.referrer_wallet, ru.full_name
      ORDER BY totalEarnings DESC
      LIMIT 10
    `);

    // EPOCHS
    const epochHistory = await query(
      `SELECT epoch_id, COUNT(*) as count, SUM(total_amount) as sum
       FROM investments GROUP BY epoch_id ORDER BY epoch_id DESC LIMIT 10`
    );
    const epochRow = await query(
      'SELECT epoch_id FROM epochs ORDER BY epoch_id DESC LIMIT 1'
    );
    const currentEpoch = epochRow.length > 0 ? epochRow[0].epoch_id : 0;

    // PLATFORM HEALTH
    const [platformRow] = await query(
      'SELECT * FROM platform_stats ORDER BY last_updated DESC LIMIT 1'
    );
    const platformStats = {
      treasury_balance: platformRow?.treasury_balance || '0',
      staked: platformRow?.total_staked || '0',
      apr: platformRow?.current_apr || 0,
      maturity: platformRow?.current_maturity_days || 0,
      total_paid_out: platformRow?.total_paid_out || '0',
      current_epoch_id: platformRow?.current_epoch_id || currentEpoch
    };

    // Health score calculation
    let healthScore = 100;
    if (parseInt(overdue) > 0) healthScore -= 20;
    if (parseInt(pending) > 10) healthScore -= 10;
    if (parseInt(activeInvestments) === 0) healthScore -= 30;
    if (parseFloat(platformStats.treasury_balance) < 1.1 * parseFloat(platformStats.staked)) healthScore -= 15;
    let healthStatus = 'HEALTHY';
    if (healthScore < 70) healthStatus = 'WARNING';
    if (healthScore < 50) healthStatus = 'CRITICAL';

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalValueLocked: tvl?.toString() || '0',
          totalUsers: parseInt(totalUsers),
          activeUsers: parseInt(activeUsers),
          totalInvestments: parseInt(totalInvestments),
          activeInvestments: parseInt(activeInvestments),
          healthScore,
          healthStatus
        },
        users: {
          total: parseInt(totalUsers),
          active: parseInt(activeUsers),
          inactive: inactiveUsers, // already number, no parseInt
          newSignups: parseInt(newSignups),
          growthData: usersGrowth
        },
        investments: {
          total: parseInt(totalInvestments),
          active: parseInt(activeInvestments),
          matured: parseInt(maturedInvestments),
          paid: parseInt(paidInvestments),
          averageSize: avg?.toString() || '0',
          byToken: byToken.map((row: any) => ({
            tokenSymbol: row.token_symbol,
            _count: row.count,
            _sum: { amount: row.sum }
          })),
          volumeData: volumeData
        },
        payouts: {
          pending: parseInt(pending),
          pendingValue: pendingValue?.toString() || '0',
          overdue: parseInt(overdue)
        },
        referrals: {
          totalEarnings: totalRefEarnings?.toString() || '0',
          claimed: claimed?.toString() || '0',
          pending: pendingRef?.toString() || '0',
          topReferrers
        },
        epochs: {
          current: currentEpoch,
          history: epochHistory.map((row: any) => ({
            epochId: row.epoch_id,
            _count: row.count,
            _sum: { amount: row.sum }
          }))
        },
        platformStats
      }
    });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ success: false, error: { message: error.message || 'Failed to fetch analytics' } }, { status: 500 });
  }
}
