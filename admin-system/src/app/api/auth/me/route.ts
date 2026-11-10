import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
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
  } catch (error: any) {
    console.error('Me endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
