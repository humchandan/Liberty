import { query, queryOne, insert, update } from './queries';

export interface Investment {
  investment_id: number;
  user_id: number;
  wallet_address: string;
  order_id: number;
  token_address: string;
  token_symbol: string;
  order_count: number;
  amount_per_order: string;
  total_amount: string;
  locked_apr: number;
  locked_maturity_duration: number;
  stake_timestamp: Date;
  maturity_timestamp: Date;
  epoch_id: number;
  paid_order_count: number;
  fully_paid: boolean;
  is_reinvestment: boolean;
  status: 'active' | 'matured' | 'partially_paid' | 'completed' | 'withdrawn';
  stake_tx_hash: string;
  last_payout_tx_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get user investments with pagination
 */
export async function getUserInvestments(
  userId: number,
  status?: 'active' | 'completed' | 'all',
  page: number = 1,
  limit: number = 10
): Promise<{ investments: Investment[]; total: number }> {
  const offset = (page - 1) * limit;
  
  let sql = 'SELECT * FROM investments WHERE user_id = ?';
  let countSql = 'SELECT COUNT(*) as count FROM investments WHERE user_id = ?';
  const params: any[] = [userId];

  if (status === 'active') {
    sql += ' AND status IN ("active", "matured", "partially_paid")';
    countSql += ' AND status IN ("active", "matured", "partially_paid")';
  } else if (status === 'completed') {
    sql += ' AND status IN ("completed", "withdrawn")';
    countSql += ' AND status IN ("completed", "withdrawn")';
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  
  const investments = await query<Investment>(sql, [...params, limit, offset]);
  const countResult = await queryOne<{ count: number }>(countSql, params);
  const total = countResult?.count || 0;

  return { investments, total };
}

/**
 * Get investment by order ID
 */
export async function getInvestmentByOrderId(orderId: number): Promise<Investment | null> {
  return await queryOne<Investment>(
    'SELECT * FROM investments WHERE order_id = ?',
    [orderId]
  );
}

/**
 * Get total invested by user
 */
export async function getUserTotalInvested(userId: number): Promise<string> {
  const result = await queryOne<{ total: string }>(
    'SELECT COALESCE(SUM(total_amount), 0) as total FROM investments WHERE user_id = ?',
    [userId]
  );
  return result?.total || '0';
}

/**
 * Get active investments count
 */
export async function getUserActiveInvestmentsCount(userId: number): Promise<number> {
  const result = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM investments WHERE user_id = ? AND status IN ("active", "matured", "partially_paid")',
    [userId]
  );
  return result?.count || 0;
}

/**
 * Create investment record
 */
export async function createInvestment( data:{
  userId: number;
  walletAddress: string;
  orderId: number;
  tokenAddress: string;
  tokenSymbol: string;
  orderCount: number;
  amountPerOrder: string;
  totalAmount: string;
  lockedApr: number;
  lockedMaturityDuration: number;
  stakeTimestamp: Date;
  maturityTimestamp: Date;
  epochId: number;
  isReinvestment: boolean;
  stakeTxHash: string;
}): Promise<number> {
  return await insert(
    `INSERT INTO investments (
      user_id, wallet_address, order_id, token_address, token_symbol,
      order_count, amount_per_order, total_amount, locked_apr, locked_maturity_duration,
      stake_timestamp, maturity_timestamp, epoch_id, is_reinvestment, stake_tx_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.userId,
      data.walletAddress.toLowerCase(),
      data.orderId,
      data.tokenAddress.toLowerCase(),
      data.tokenSymbol,
      data.orderCount,
      data.amountPerOrder,
      data.totalAmount,
      data.lockedApr,
      data.lockedMaturityDuration,
      data.stakeTimestamp,
      data.maturityTimestamp,
      data.epochId,
      data.isReinvestment,
      data.stakeTxHash,
    ]
  );
}
