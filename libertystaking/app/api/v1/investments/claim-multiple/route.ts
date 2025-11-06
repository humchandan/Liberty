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
    const { investmentIds, txHash } = body;

    if (!investmentIds || !Array.isArray(investmentIds) || investmentIds.length === 0 || !txHash) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing or invalid fields' } },
        { status: 400 }
      );
    }

    // ✅ Get all investments
    const placeholders = investmentIds.map(() => '?').join(',');
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
       WHERE investment_id IN (${placeholders}) AND user_id = ?`,
      [...investmentIds, decoded.userId]
    );

    if (investments.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No claimable investments found' } },
        { status: 404 }
      );
    }

    // ✅ Validate all investments
    const now = new Date();
    const claimable = investments.filter(inv => {
      const maturityDate = new Date(inv.maturity_timestamp);
      return !inv.fully_paid && 
             inv.status === 'active' && 
             now >= maturityDate;
    });

    if (claimable.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NONE_CLAIMABLE', message: 'None of the selected investments are claimable' } },
        { status: 400 }
      );
    }

    const claimableIds = claimable.map(inv => inv.investment_id);
    const totalAmount = claimable.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);

    // ✅ Mark all as fully paid
    const updatePlaceholders = claimableIds.map(() => '?').join(',');
    await query(
      `UPDATE investments 
       SET fully_paid = TRUE, 
           status = 'completed',
           updated_at = NOW()
       WHERE investment_id IN (${updatePlaceholders})`,
      claimableIds
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
      ) VALUES (?, ?, 'claim_multiple', ?, ?, NOW())`,
      [
        decoded.userId,
        investments[0].wallet_address,
        JSON.stringify({
          investmentIds: claimableIds,
          count: claimableIds.length,
          totalAmount: totalAmount.toFixed(2)
        }),
        txHash
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${claimableIds.length} investments`,
      claimed: {
        count: claimableIds.length,
        totalAmount: totalAmount.toFixed(2),
        investmentIds: claimableIds
      }
    });

  } catch (error: any) {
    console.error('Batch claim error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
