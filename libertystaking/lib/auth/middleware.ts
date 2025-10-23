import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt';
import { query } from '../db/queries';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Authenticate user
 */
export async function authenticate(
  request: NextRequest
): Promise<{ authenticated: true; user: JWTPayload } | { authenticated: false; error: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return {
        authenticated: false,
        error: 'Authentication token is required',
      };
    }

    const payload = verifyToken(token);

    if (!payload) {
      return {
        authenticated: false,
        error: 'Invalid or expired token',
      };
    }

    const userExists = await query(
      'SELECT user_id FROM users WHERE wallet_address = ? AND is_active = TRUE',
      [payload.walletAddress]
    );

    if (!userExists || userExists.length === 0) {
      return {
        authenticated: false,
        error: 'User not found or inactive',
      };
    }

    return {
      authenticated: true,
      user: payload,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message,
      },
    },
    { status: 401 }
  );
}

/**
 * Higher-order function to protect routes
 */
export function withAuth(
  handler: (request: AuthenticatedRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticate(request);

    if (!authResult.authenticated) {
      return unauthorizedResponse(authResult.error);
    }

    (request as AuthenticatedRequest).user = authResult.user;

    return handler(request as AuthenticatedRequest, authResult.user);
  };
}
/**
 * Admin authentication
 */
export async function authenticateAdmin(
  request: NextRequest
): Promise<{ authenticated: true; user: JWTPayload } | { authenticated: false; error: string }> {
  const authResult = await authenticate(request);
  
  if (!authResult.authenticated) {
    return authResult;
  }

  if (!authResult.user.isAdmin) {
    return {
      authenticated: false,
      error: 'Admin access required',
    };
  }

  return authResult;
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message: string = 'Access forbidden') {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
      },
    },
    { status: 403 }
  );
}

/**
 * Higher-order function for admin routes
 */
export function withAdminAuth(
  handler: (request: AuthenticatedRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticateAdmin(request);

    if (!authResult.authenticated) {
      if (authResult.error === 'Admin access required') {
        return forbiddenResponse(authResult.error);
      }
      return unauthorizedResponse(authResult.error);
    }

    (request as AuthenticatedRequest).user = authResult.user;

    return handler(request as AuthenticatedRequest, authResult.user);
  };
}
