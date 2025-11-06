import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query, insert } from '@/lib/db/queries';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization token' } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { investmentId, txHash } = body;

    if (!investmentId || !txHash) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // ✅ Get investment details
    const investments = await query<{
      investment_id: number;
      user_id: number;
      wallet_address: string;
      total_amount: string;
      token_symbol: string;
      maturity_timestamp: string;
      fully_paid: boolean;
      status: string;
    }>(
      `SELECT investment_id, user_id, wallet_address, total_amount, token_symbol, 
              maturity_timestamp, fully_paid, status
       FROM investments 
       WHERE investment_id = ? AND user_id = ?`,
      [investmentId, decoded.userId]
    );

    if (investments.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Investment not found' } },
        { status: 404 }
      );
    }

    const investment = investments[0];

    // ✅ Validate claim eligibility
    if (investment.fully_paid) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_CLAIMED', message: 'Investment already claimed' } },
        { status: 400 }
      );
    }

    if (investment.status !== 'active') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_STATUS', message: 'Investment is not active' } },
        { status: 400 }
      );
    }

    const maturityDate = new Date(investment.maturity_timestamp);
    const now = new Date();
    if (now < maturityDate) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_MATURED', message: 'Investment has not matured yet' } },
        { status: 400 }
      );
    }

    // ✅ Mark as fully paid
    await query(
      `UPDATE investments 
       SET fully_paid = TRUE, 
           status = 'completed',
           updated_at = NOW()
       WHERE investment_id = ?`,
      [investmentId]
    );

    // ✅ Log activity
    await insert(
      `INSERT INTO activity_logs (
        user_id,
        wallet_address,
        activity_type,
        description,
        tx_hash,
        created_at
      ) VALUES (?, ?, 'claim', ?, ?, NOW())`,
      [
        decoded.userId,
        investment.wallet_address,
        JSON.stringify({
          investmentId,
          tokenSymbol: investment.token_symbol,
          amount: investment.total_amount
        }),
        txHash
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Investment claimed successfully',
      claimed: {
        investmentId,
        amount: investment.total_amount,
        tokenSymbol: investment.token_symbol
      }
    });

  } catch (error: any) {
    console.error('Claim investment error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}