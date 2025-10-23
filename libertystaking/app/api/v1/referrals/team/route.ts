import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db/queries';

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build query based on level filter
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
      WHERE u.referrer_wallet_address = ?
    `;

    const params: any[] = [user.walletAddress];

    // If level filter is provided (not implemented yet, but ready)
    // You would need a level field in users table to filter by level

    sql += ' GROUP BY u.user_id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get team members
    const teamMembers = await query(sql, params);

    // Get total count
    const countResult = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE referrer_wallet_address = ?',
      [user.walletAddress]
    );

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      team: teamMembers.map((member: any) => ({
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
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch team members',
        },
      },
      { status: 500 }
    );
  }
});
