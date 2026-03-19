import { NextRequest, NextResponse } from 'next/server';
import { deleteEmailById } from '@/lib/db/queries';
import { getBearerToken, validateSessionToken } from '@/lib/auth';

/**
 * 删除指定邮件
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token || !validateSessionToken(token)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email ID' },
        { status: 400 }
      );
    }

    const deleted = deleteEmailById(id);

    if (deleted) {
      return NextResponse.json({
        success: true,
        message: 'Email deleted successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Delete email error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
