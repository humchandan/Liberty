import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/queries';

export async function PUT(req: NextRequest, context: { params: any }) {
  const paramsObj = context.params && typeof context.params.then === "function"
    ? await context.params
    : context.params;
  const id = paramsObj?.id;

  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing announcement ID' } },
      { status: 400 }
    );
  }  try {
    const { id } = context.params;
    
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
    const { title, message, imageUrl, priority, expiresAt } = body;

    await query(
      'UPDATE announcements SET title = ?, message = ?, image_url = ?, priority = ?, expires_at = ? WHERE announcement_id = ?',
      [title, message, imageUrl || null, priority || 0, expiresAt || null, id]
    );

    return NextResponse.json({ success: true, message: 'Announcement updated successfully' });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: { params: any }) {
  // Ensure params object is properly awaited as per Next.js guidance
  const paramsObj = context.params && typeof context.params.then === "function"
      ? await context.params    // if it's a Promise, await it
      : context.params;         // otherwise it's already an object
  const id = paramsObj?.id;

  if (!id) {
    console.error('Announcement DELETE endpoint: id param is missing or undefined', paramsObj);
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing announcement ID' } },
      { status: 400 }
    );
  }

  try {
    // Do NOT destructure id again below; use the validated version above only!
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

    await query('DELETE FROM announcements WHERE announcement_id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
