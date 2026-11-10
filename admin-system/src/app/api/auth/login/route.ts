import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, createSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { error: 'loginId and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { loginId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid login credentials or inactive account' },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    const sessionCookie = createSessionCookie(user);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        role: user.role,
        phoneMasked: user.phoneMasked,
        isDbReceiveOn: user.isDbReceiveOn,
        isSmsReceiveOn: user.isSmsReceiveOn,
        globalOrder: user.globalOrder,
      },
    });

    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
