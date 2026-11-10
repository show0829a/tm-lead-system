import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'tm-lead-system-super-secret-jwt-token-key-2026-secure';
export const SESSION_COOKIE_NAME = 'tm_session';

export interface SessionPayload {
  userId: string;
  role: 'ADMIN' | 'TM';
  loginId: string;
  name: string;
}

export interface SessionUser {
  id: string;
  loginId: string;
  name: string;
  role: 'ADMIN' | 'TM';
  phoneEncrypted: string;
  phoneMasked: string;
  globalOrder: number | null;
  isDbReceiveOn: boolean;
  isSmsReceiveOn: boolean;
  isActive: boolean;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

/**
 * Hashes a plaintext password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a signed JWT session token for an authenticated user.
 */
export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a JWT session token and returns the decoded payload.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Builds cookie definition for setting the session cookie.
 */
export function createSessionCookie(user: { id: string; role: 'ADMIN' | 'TM'; loginId: string; name: string }) {
  const token = signSessionToken({
    userId: user.id,
    role: user.role,
    loginId: user.loginId,
    name: user.name,
  });

  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  };
}

/**
 * Builds cookie definition for clearing the session cookie on logout.
 */
export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    },
  };
}

/**
 * Parses raw Cookie header string into an object.
 */
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [name, ...rest] = part.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });
  return cookies;
}

/**
 * Extracts and verifies session token from Request (via Cookie or Authorization header),
 * then fetches active user from DB.
 */
export async function getSessionUser(request: Request | { headers: Headers }): Promise<SessionUser | null> {
  let token: string | null = null;

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies[SESSION_COOKIE_NAME]) {
      token = cookies[SESSION_COOKIE_NAME];
    }
  }

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload || !payload.userId) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!dbUser || !dbUser.isActive) return null;

  return {
    id: dbUser.id,
    loginId: dbUser.loginId,
    name: dbUser.name,
    role: dbUser.role as 'ADMIN' | 'TM',
    phoneEncrypted: dbUser.phoneEncrypted,
    phoneMasked: dbUser.phoneMasked,
    globalOrder: dbUser.globalOrder,
    isDbReceiveOn: dbUser.isDbReceiveOn,
    isSmsReceiveOn: dbUser.isSmsReceiveOn,
    isActive: dbUser.isActive,
  };
}

/**
 * RBAC Guard: Requires authenticated session with ADMIN role.
 * Throws AuthError(401) if unauthenticated, AuthError(403) if not ADMIN.
 */
export async function requireAdmin(request: Request | { headers: Headers }): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  if (user.role !== 'ADMIN') {
    throw new AuthError('Forbidden: Admin access required', 403);
  }
  return user;
}

/**
 * RBAC Guard: Requires authenticated session with TM or ADMIN role.
 * Throws AuthError(401) if unauthenticated.
 */
export async function requireTmOrAdmin(request: Request | { headers: Headers }): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  return user;
}

/**
 * Helper to catch AuthError and return standardized JSON response.
 */
export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message, code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' },
      { status: error.statusCode }
    );
  }
  console.error('Unhandled request error:', error);
  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
}
