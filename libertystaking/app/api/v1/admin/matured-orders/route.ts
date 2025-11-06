import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

interface MaturedOrder {
  investmentId: number;
  orderId: number | null;
  userId: number;
  walletAddress: string;
  fullName: string;
  tokenSymbol: string;
  totalAmount: string;
  orderCount: number;
  paidOrderCount: number;
  maturityDate: string;
  status: string;
  epochId: number;
  lockedAPR: number;
  daysOverdue: number;
}

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
    const userRes = await query<{ wallet_address: string }>(
      'SELECT wallet_address FROM users WHERE user_id = ?', 
      [decoded.userId]
    );
    
    if (userRes.length === 0 || userRes[0].wallet_address.toLowerCase() !== adminWallet) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // ✅ Get matured orders that haven't been fully paid
    const sql = `
      SELECT 
        i.investment_id as investmentId,
        i.order_id as orderId,
        i.user_id as userId,
        u.wallet_address as walletAddress,
        u.full_name as fullName,
        i.token_symbol as tokenSymbol,
        i.total_amount as totalAmount,
        i.order_count as orderCount,
        i.paid_order_count as paidOrderCount,
        i.maturity_timestamp as maturityDate,
        i.status,
        i.epoch_id as epochId,
        i.locked_apr as lockedAPR,
        DATEDIFF(NOW(), i.maturity_timestamp) as daysOverdue
      FROM investments i
      JOIN users u ON i.user_id = u.user_id
      WHERE i.maturity_timestamp <= NOW()
        AND i.fully_paid = FALSE
        AND i.status = 'active'
      ORDER BY i.maturity_timestamp ASC
    `;

    const orders = await query<MaturedOrder>(sql, []);

    // ✅ Calculate summary stats
    const totalMatured = orders.length;
    const totalValue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
    const byToken = orders.reduce((acc: any, order) => {
      if (!acc[order.tokenSymbol]) {
        acc[order.tokenSymbol] = { count: 0, value: 0 };
      }
      acc[order.tokenSymbol].count++;
      acc[order.tokenSymbol].value += parseFloat(order.totalAmount);
      return acc;
    }, {});

    const overdueOrders = orders.filter(o => o.daysOverdue > 7).length;
    const criticalOrders = orders.filter(o => o.daysOverdue > 30).length;

    // ✅ Group by epoch
    const byEpoch = orders.reduce((acc: any, order) => {
      const epochId = order.epochId;
      if (!acc[epochId]) {
        acc[epochId] = { epochId, orders: [], totalValue: 0, count: 0 };
      }
      acc[epochId].orders.push(order);
      acc[epochId].totalValue += parseFloat(order.totalAmount);
      acc[epochId].count++;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      summary: {
        totalMatured,
        totalValue: totalValue.toFixed(2),
        byToken: Object.entries(byToken).map(([symbol, data]: [string, any]) => ({
          tokenSymbol: symbol,
          count: data.count,
          value: data.value.toFixed(2)
        })),
        overdueOrders,
        criticalOrders
      },
      orders,
      byEpoch: Object.values(byEpoch)
    });
  } catch (error: any) {
    console.error('Failed to fetch matured orders:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
