import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
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

    // Check if user is admin
    const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
    const userRes = await query('SELECT wallet_address FROM users WHERE user_id = ?', [decoded.userId]);
    
    if (userRes.length === 0 || userRes[0].wallet_address.toLowerCase() !== adminWallet) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Get matured orders that haven't been fully paid
    const sql = `
      SELECT 
        i.investment_id as investmentId,
        i.order_id as orderId,
        i.user_id as userId,
        u.wallet_address as walletAddress,
        i.token_symbol as tokenSymbol,
        i.total_amount as totalAmount,
        i.order_count as orderCount,
        i.paid_order_count as paidOrderCount,
        i.maturity_timestamp as maturityDate,
        i.status
      FROM investments i
      JOIN users u ON i.user_id = u.user_id
      WHERE i.maturity_timestamp <= NOW()
        AND i.fully_paid = FALSE
        AND i.status = 'active'
      ORDER BY i.maturity_timestamp ASC
    `;

    const orders = await query(sql);

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error('Failed to fetch matured orders:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
