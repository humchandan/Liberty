import { NextResponse } from 'next/server';
import { query } from '@/lib/db/queries';

export async function GET() {
  try {
    const sql = `
      SELECT 
        announcement_id as announcementId,
        title,
        message,
        image_url as imageUrl,
        priority
      FROM announcements
      WHERE is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY priority DESC, created_at DESC
      LIMIT 1
    `;

    const results = await query(sql);
    
    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        announcement: null,
      });
    }

    return NextResponse.json({
      success: true,
      announcement: results[0],
    });
  } catch (error: any) {
    console.error('Failed to fetch announcement:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
