import { NextRequest, NextResponse } from 'next/server';
import { authenticatePassword, generateSessionToken } from '@/lib/auth';

/**
 * POST /api/auth/login
 * 验证密码并返回会话令牌
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password required' },
        { status: 400 }
      );
    }

    const matchedPasswordHash = authenticatePassword(password);
    if (!matchedPasswordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // 生成签名会话令牌，并绑定到当前使用的密码哈希
    const token = generateSessionToken(matchedPasswordHash);

    return NextResponse.json({
      success: true,
      token,
      expiresIn: 86400, // 24 小时
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
