import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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

    // Get team stats (fixed column names)
    const teamStats = await query<{
      level1_count: number;
      level2_count: number;
      level3_count: number;
      total_team_size: number;
      active_members: number;
      inactive_members: number;
    }>(
      `SELECT 
        COALESCE(level1_count, 0) as level1_count,
        COALESCE(level2_count, 0) as level2_count,
        COALESCE(level3_count, 0) as level3_count,
        COALESCE(total_team_size, 0) as total_team_size,
        COALESCE(active_members, 0) as active_members,
        COALESCE(inactive_members, 0) as inactive_members
      FROM team_stats
      WHERE user_id = ?`,
      [decoded.userId]
    );

    // Get earnings stats (FIXED column names)
const earnings = await query<{
  totalEarned: string;
  totalClaimed: string;
  pendingClaims: string;
}>(
  `SELECT 
    COALESCE(SUM(amount), 0) as totalEarned,
    COALESCE(SUM(CASE WHEN claimed = TRUE THEN amount ELSE 0 END), 0) as totalClaimed,
    COALESCE(SUM(CASE WHEN claimed = FALSE THEN amount ELSE 0 END), 0) as pendingClaims
  FROM referral_earnings
  WHERE referrer_user_id = ?`,
  [decoded.userId]
);


    const stats = teamStats && teamStats.length > 0 ? teamStats[0] : {
      level1_count: 0,
      level2_count: 0,
      level3_count: 0,
      total_team_size: 0,
      active_members: 0,
      inactive_members: 0
    };

    const earningStats = earnings && earnings.length > 0 ? earnings[0] : {
      totalEarned: '0',
      totalClaimed: '0',
      pendingClaims: '0'
    };

    const minClaimAmount = 500; // 500 INRT minimum
    const canClaim = parseFloat(earningStats.pendingClaims) >= minClaimAmount;

    return NextResponse.json({
      success: true,
      stats: {
        level1Count: stats.level1_count,
        level2Count: stats.level2_count,
        level3Count: stats.level3_count,
        totalTeamSize: stats.total_team_size,
        activeMembers: stats.active_members,
        inactiveMembers: stats.inactive_members,
        earnings: {
          totalEarned: earningStats.totalEarned,
          totalClaimed: earningStats.totalClaimed,
          pendingClaims: earningStats.pendingClaims,
          canClaim,
          minClaimAmount: minClaimAmount.toString()
        }
      }
    });

  } catch (error: any) {
    console.error('Referral stats error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch referral stats' } },
      { status: 500 }
    );
  }
}
