import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { insert, query } from '@/lib/db/queries';

// ✅ Type definitions
interface UserData {
  user_id: number;
  wallet_address: string;
  referred_by: string | null;
}

interface ReferralConfig {
  level: number;
  bp: number;
  percentage: number;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization token',
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const walletAddress = decoded.walletAddress;

    const body = await req.json();
    const { 
      txHash, 
      tokenAddress, 
      tokenSymbol, 
      amount, 
      epochId,
      currentAPR,
      maturityDuration
    } = body;

    if (!txHash || !tokenAddress || !tokenSymbol || !amount || !epochId || !currentAPR || !maturityDuration) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
          },
        },
        { status: 400 }
      );
    }

    // Check if transaction already exists
    const existingTx = await query<{ investment_id: number }>(
      'SELECT investment_id FROM investments WHERE stake_tx_hash = ?',
      [txHash]
    );

    if (existingTx.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Investment already recorded',
        investmentId: existingTx[0].investment_id,
        alreadyExists: true,
      });
    }

    const stakeTimestamp = new Date();
    const maturityTimestamp = new Date(stakeTimestamp.getTime() + (maturityDuration * 1000));

    // Insert investment
    const investmentId = await insert(
      `INSERT INTO investments (
        user_id,
        wallet_address,
        order_id,
        token_address,
        token_symbol,
        order_count,
        amount_per_order,
        total_amount,
        locked_apr,
        locked_maturity_duration,
        stake_timestamp,
        maturity_timestamp,
        epoch_id,
        paid_order_count,
        fully_paid,
        is_reinvestment,
        status,
        stake_tx_hash,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, 0, 0, 0, 'active', ?, NOW(), NOW())`,
      [
        userId,
        walletAddress,
        null,
        tokenAddress,
        tokenSymbol,
        1,
        amount,
        amount,
        currentAPR * 100,
        maturityDuration,
        maturityTimestamp,
        epochId,
        txHash,
      ]
    );

    // ✅✅ PROCESS REFERRAL EARNINGS ✅✅
    await processReferralEarnings(
      userId,
      walletAddress,
      amount,
      tokenSymbol,
      txHash,
      investmentId
    );

    // Log activity
    await insert(
      `INSERT INTO activity_logs (
        user_id,
        wallet_address,
        activity_type,
        description,
        tx_hash,
        created_at
      ) VALUES (?, ?, 'stake', ?, ?, NOW())`,
      [
        userId,
        walletAddress,
        JSON.stringify({
          tokenSymbol,
          amount,
          epochId,
          investmentId,
        }),
        txHash,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Investment created successfully',
      investmentId,
    });
  } catch (error: any) {
    console.error('Investment creation error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_TRANSACTION',
            message: 'This transaction has already been recorded',
          },
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to create investment',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * ✅✅ PROCESS REFERRAL EARNINGS FOR UP TO 3 LEVELS ✅✅
 */
async function processReferralEarnings(
  userId: number,
  userWallet: string,
  stakeAmount: string,
  tokenSymbol: string,
  txHash: string,
  investmentId: number
): Promise<void> {
  try {
    // Get user's referrer
    const users: UserData[] = await query<UserData>(
      'SELECT user_id, wallet_address, referred_by FROM users WHERE user_id = ?',
      [userId]
    );

    if (!users || users.length === 0) {
      console.log('User not found for referral processing:', userId);
      return;
    }

    const user: UserData = users[0];
    let referrerWallet: string | null = user.referred_by;

    if (!referrerWallet || referrerWallet === '0x0000000000000000000000000000000000000000') {
      console.log('No referrer for user:', userId);
      return;
    }

    const amount: number = parseFloat(stakeAmount);
    
    // Referral percentages matching contract (basis points)
    // L1: 300 BP (3%), L2: 150 BP (1.5%), L3: 50 BP (0.5%)
    const REFERRAL_CONFIG: ReferralConfig[] = [
      { level: 1, bp: 300, percentage: 3.0 },
      { level: 2, bp: 150, percentage: 1.5 },
      { level: 3, bp: 50, percentage: 0.5 }
    ];

    let currentReferrerWallet: string | null = referrerWallet;
    let level: number = 1;

    while (currentReferrerWallet && level <= 3) {
      // Get referrer details
      const referrers: UserData[] = await query<UserData>(
        'SELECT user_id, wallet_address, referred_by FROM users WHERE wallet_address = ?',
        [currentReferrerWallet]
      );

      if (!referrers || referrers.length === 0) {
        console.log(`Level ${level} referrer not found:`, currentReferrerWallet);
        break;
      }

      const referrer: UserData = referrers[0];
      const config: ReferralConfig | undefined = REFERRAL_CONFIG.find(r => r.level === level);
      
      if (!config) {
        console.log(`No config for level ${level}`);
        break;
      }

      // Calculate earnings
      const earnings: number = (amount * config.percentage) / 100;

      // ✅ Insert referral earning (FIXED column names)
      try {
        await insert(
          `INSERT INTO referral_earnings (
            referrer_user_id,
            referrer_wallet,
            referee_user_id,
            referee_wallet,
            referee_investment_id,
            level,
            investment_amount,
            amount,
            percentage,
            tx_hash,
            block_number,
            earned_at,
            claimed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), FALSE)`,
          [
            referrer.user_id,
            referrer.wallet_address,
            userId,
            userWallet,
            investmentId,
            level,
            amount.toString(),
            earnings.toString(),
            config.percentage,
            txHash
          ]
        );

        console.log(`✅ Level ${level} earning recorded: ${earnings} ${tokenSymbol} for ${referrer.wallet_address}`);

        // ✅ Update team stats
        await updateTeamStats(referrer.user_id, level);

      } catch (earningError) {
        console.error(`Error inserting earning for level ${level}:`, earningError);
      }

      // Move to next level
      currentReferrerWallet = referrer.referred_by;
      level++;
    }

  } catch (error) {
    console.error('Error processing referral earnings:', error);
    // Don't throw - let investment continue even if referral fails
  }
}

/**
 * ✅ Update team_stats table
 */
async function updateTeamStats(referrerId: number, level: number): Promise<void> {
  try {
    // ✅ FIXED: stat_id is the primary key
    const existing = await query<{ stat_id: number }>(
      'SELECT stat_id FROM team_stats WHERE user_id = ?',
      [referrerId]
    );

    if (!existing || existing.length === 0) {
      // ✅ Get user's wallet address
      const user = await query<{ wallet_address: string }>(
        'SELECT wallet_address FROM users WHERE user_id = ?',
        [referrerId]
      );

      if (!user || user.length === 0) {
        console.error(`User ${referrerId} not found for team stats`);
        return;
      }

      // ✅ Create new stats with wallet_address
      await insert(
        `INSERT INTO team_stats (
          user_id,
          wallet_address,
          level1_count,
          level2_count,
          level3_count,
          total_team_size,
          active_members
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          referrerId,
          user[0].wallet_address,
          level === 1 ? 1 : 0,
          level === 2 ? 1 : 0,
          level === 3 ? 1 : 0,
          1,
          1
        ]
      );
    } else {
      // Update existing stats
      const updateField: string = level === 1 ? 'level1_count' : level === 2 ? 'level2_count' : 'level3_count';
      await query(
        `UPDATE team_stats 
         SET ${updateField} = ${updateField} + 1,
             total_team_size = total_team_size + 1,
             active_members = active_members + 1
         WHERE user_id = ?`,
        [referrerId]
      );
    }

    console.log(`✅ Team stats updated for user ${referrerId}, level ${level}`);

  } catch (error) {
    console.error('Error updating team stats:', error);
  }
}


