import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query, insert } from '@/lib/db/queries';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { tokenSymbol, txHash } = body;

    if (!tokenSymbol) {
      return NextResponse.json(
        { success: false, error: { message: 'Token symbol is required' } },
        { status: 400 }
      );
    }

    // Validate token symbol
    if (!['INRT', 'USDT'].includes(tokenSymbol)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid token symbol. Must be INRT or USDT' } },
        { status: 400 }
      );
    }

    // Get pending earnings for this token ONLY
    const pendingEarnings = await query<{
      earning_id: number;
      amount: string;
    }>(
      `SELECT earning_id, amount
       FROM referral_earnings
       WHERE referrer_user_id = ? 
         AND claimed = FALSE 
         AND token_symbol = ?`,
      [decoded.userId, tokenSymbol]
    );

    if (!pendingEarnings || pendingEarnings.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: `No pending ${tokenSymbol} earnings to claim` } },
        { status: 400 }
      );
    }

    const totalAmount = pendingEarnings.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Check minimum claim amount
    const MIN_CLAIM_INRT = 500;
    const MIN_CLAIM_USDT = 100;
    const minAmount = tokenSymbol === 'INRT' ? MIN_CLAIM_INRT : MIN_CLAIM_USDT;

    if (totalAmount < minAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: `Minimum claim amount is ${minAmount} ${tokenSymbol}. You have ${totalAmount.toFixed(2)}` 
          } 
        },
        { status: 400 }
      );
    }

    // Mark all as claimed
    const earningIds = pendingEarnings.map(e => e.earning_id);
    const placeholders = earningIds.map(() => '?').join(',');
    await query(
      `UPDATE referral_earnings
       SET claimed = TRUE, 
           claimed_at = NOW(),
           claim_tx_hash = ?
       WHERE earning_id IN (${placeholders})`,
      [txHash || 'backend_claim', ...earningIds]
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
      ) VALUES (?, ?, 'referral_claim', ?, ?, NOW())`,
      [
        decoded.userId,
        decoded.walletAddress,
        JSON.stringify({
          tokenSymbol,
          amount: totalAmount.toFixed(6),
          earningCount: earningIds.length
        }),
        txHash || 'backend_claim'
      ]
    );

    return NextResponse.json({
      success: true,
      message: `${tokenSymbol} referral rewards claimed successfully`,
      claimed: {
        amount: totalAmount.toFixed(2),
        tokenSymbol,
        earningCount: earningIds.length
      }
    });

  } catch (error: any) {
    console.error('Claim referral error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to claim referral rewards' } },
      { status: 500 }
    );
  }
}
