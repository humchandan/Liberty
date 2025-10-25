import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { insert, query } from '@/lib/db/queries';

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

    // ✅ FIXED: Column name included, value can be 0 or NULL
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
        null, // ✅ Use 0 for now, we'll fix the unique constraint
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
