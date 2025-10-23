import { query, queryOne } from './queries';

/**
 * Get team stats
 */
export async function getTeamStats(userId: number) {
  return await queryOne<{
    total_team_size: number;
    level1_count: number;
    level2_count: number;
    level3_count: number;
    active_members: number;
    inactive_members: number;
  }>(
    'SELECT * FROM team_stats WHERE user_id = ?',
    [userId]
  );
}

/**
 * Get user referral earnings
 */
export async function getUserReferralEarnings(
  userId: number,
  claimed?: boolean,
  page: number = 1,
  limit: number = 10
) {
  const offset = (page - 1) * limit;
  
  let sql = 'SELECT * FROM referral_earnings WHERE referrer_user_id = ?';
  let countSql = 'SELECT COUNT(*) as count FROM referral_earnings WHERE referrer_user_id = ?';
  const params: any[] = [userId];

  if (claimed !== undefined) {
    sql += ' AND claimed = ?';
    countSql += ' AND claimed = ?';
    params.push(claimed ? 1 : 0);
  }

  sql += ' ORDER BY earned_at DESC LIMIT ? OFFSET ?';

  const earnings = await query(sql, [...params, limit, offset]);
  const countResult = await queryOne<{ count: number }>(countSql, params);
  const total = countResult?.count || 0;

  return { earnings, total };
}

/**
 * Get pending referral amount
 */
export async function getPendingReferralAmount(userId: number): Promise<string> {
  const result = await queryOne<{ total: string }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_user_id = ? AND claimed = 0',
    [userId]
  );
  return result?.total || '0';
}

/**
 * Get total referral earned
 */
export async function getTotalReferralEarned(userId: number): Promise<string> {
  const result = await queryOne<{ total: string }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_user_id = ?',
    [userId]
  );
  return result?.total || '0';
}

/**
 * Get total referral claimed
 */
export async function getTotalReferralClaimed(userId: number): Promise<string> {
  const result = await queryOne<{ total: string }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_user_id = ? AND claimed = 1',
    [userId]
  );
  return result?.total || '0';
}
