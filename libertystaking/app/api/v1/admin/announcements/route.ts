import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query, insert } from '@/lib/db/queries';

// GET - List all announcements (Admin)
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

    const sql = `
      SELECT 
        announcement_id as announcementId,
        title,
        message,
        image_url as imageUrl,
        is_active as isActive,
        priority,
        created_at as createdAt,
        expires_at as expiresAt
      FROM announcements
      ORDER BY priority DESC, created_at DESC
    `;

    const announcements = await query(sql);

    return NextResponse.json({
      success: true,
      announcements,
    });
  } catch (error: any) {
    console.error('Failed to fetch announcements:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

// POST - Create new announcement (Admin)
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

    // Check if user is admin
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

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title and message are required' } },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO announcements (title, message, image_url, priority, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await insert(sql, [
      title,
      message,
      imageUrl || null,
      priority || 0,
      expiresAt || null,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Announcement created successfully',
    });
  } catch (error: any) {
    console.error('Failed to create announcement:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
