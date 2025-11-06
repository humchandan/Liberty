import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
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

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // ✅ Fixed: Use referred_by column (stores referrer wallet)
    let sql = `
      SELECT 
        u.user_id,
        u.wallet_address,
        u.full_name,
        u.email,
        u.created_at,
        u.is_active,
        COUNT(DISTINCT i.investment_id) as total_investments,
        COALESCE(SUM(i.total_amount), 0) as total_invested
      FROM users u
      LEFT JOIN investments i ON u.user_id = i.user_id
      WHERE u.referred_by = ?
    `;

    const params: any[] = [decoded.walletAddress];

    sql += ' GROUP BY u.user_id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get team members
    const teamMembers = await query<{
      user_id: number;
      wallet_address: string;
      full_name: string;
      email: string;
      created_at: string;
      is_active: boolean;
      total_investments: number;
      total_invested: string;
    }>(sql, params);

    // Get total count
    const countResult = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE referred_by = ?',
      [decoded.walletAddress]
    );

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      team: teamMembers.map(member => ({
        userId: member.user_id,
        walletAddress: member.wallet_address,
        fullName: member.full_name,
        email: member.email,
        joinedAt: member.created_at,
        isActive: member.is_active,
        totalInvestments: member.total_investments,
        totalInvested: member.total_invested,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error: any) {
    console.error('Get team error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Failed to fetch team members',
        },
      },
      { status: 500 }
    );
  }
}
