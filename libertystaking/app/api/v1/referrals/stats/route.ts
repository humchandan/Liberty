import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import {
  getTeamStats,
  getPendingReferralAmount,
  getTotalReferralEarned,
  getTotalReferralClaimed,
} from '@/lib/db/referrals';

export const GET = withAuth(async (request, user) => {
  try {
    const teamStats = await getTeamStats(user.userId);
    const pendingClaims = await getPendingReferralAmount(user.userId);
    const totalEarned = await getTotalReferralEarned(user.userId);
    const totalClaimed = await getTotalReferralClaimed(user.userId);

    const minClaimAmount = '500';
    const canClaim = parseFloat(pendingClaims) >= parseFloat(minClaimAmount);

    return NextResponse.json({
      success: true,
      stats: {
        totalTeamSize: teamStats?.total_team_size || 0,
        level1Count: teamStats?.level1_count || 0,
        level2Count: teamStats?.level2_count || 0,
        level3Count: teamStats?.level3_count || 0,
        activeMembers: teamStats?.active_members || 0,
        inactiveMembers: teamStats?.inactive_members || 0,
        earnings: {
          totalEarned,
          totalClaimed,
          pendingClaims,
          canClaim,
          minClaimAmount,
        },
      },
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch referral stats',
        },
      },
      { status: 500 }
    );
  }
});
