import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

export async function PATCH(
  req: NextRequest,
  context: { params: any }) {
  const paramsObj = context.params && typeof context.params.then === "function"
    ? await context.params
    : context.params;
  const id = paramsObj?.id;

  if (!id) {
    console.error('Announcement TOGGLE endpoint: id is missing or undefined', paramsObj);
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing announcement ID' } },
      { status: 400 }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
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

    const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
    const userRes = await query('SELECT wallet_address FROM users WHERE user_id = ?', [decoded.userId]);
    
    if (userRes.length === 0 || userRes[0].wallet_address.toLowerCase() !== adminWallet) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { isActive } = body;

    await query('UPDATE announcements SET is_active = ? WHERE announcement_id = ?', [isActive ? 1 : 0, id]);

    return NextResponse.json({ success: true, message: 'Status updated successfully' });
  } catch (error: any) {
    console.error('Toggle error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}