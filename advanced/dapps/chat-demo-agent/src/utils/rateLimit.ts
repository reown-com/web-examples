// utils/rateLimit.ts
import { NextResponse } from 'next/server';
import { sign, verify } from 'jsonwebtoken';

// Load environment variables with validation
const JWT_SECRET = process.env.RATE_LIMIT_JWT_SECRET;


// Configuration with environment variable fallbacks
const WINDOW_SIZE_IN_MINUTES = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '60', 10);
const MAX_REQUESTS_PER_WINDOW = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '15', 10);

interface TokenPayload {
  requestCount: number;
  windowStart: number;
}

interface RateLimitHeaders {
  token: string;
  remaining: number;
  reset: string;
}

class RateLimiter {
  public static generateHeaders(tokenPayload: TokenPayload): RateLimitHeaders {
    const resetTime = new Date(tokenPayload.windowStart + WINDOW_SIZE_IN_MINUTES * 60 * 1000);
    if (!JWT_SECRET) {
      throw new Error('RATE_LIMIT_JWT_SECRET environment variable is not set');
    }
    return {
      token: sign(tokenPayload, JWT_SECRET, { expiresIn: `${WINDOW_SIZE_IN_MINUTES}m` }),
      remaining: MAX_REQUESTS_PER_WINDOW - tokenPayload.requestCount,
      reset: resetTime.toISOString()
    };
  }

  public static createNewWindow(): TokenPayload {
    return {
      requestCount: 1,
      windowStart: Date.now()
    };
  }

  public static async validateToken(token: string | null): Promise<TokenPayload> {
    if (!token) {
      return this.createNewWindow();
    }

    try {
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }
      const payload = verify(token, JWT_SECRET) as unknown as TokenPayload;
      const windowExpired = Date.now() - payload.windowStart > WINDOW_SIZE_IN_MINUTES * 60 * 1000;
      
      if (windowExpired) {
        return this.createNewWindow();
      }

      return {
        ...payload,
        requestCount: payload.requestCount + 1
      };
    } catch (error) {
      console.error('Token validation error:', error);
      // If token is invalid or expired, start new window
      return this.createNewWindow();
    }
  }

  public static createResponse(
    originalResponse: Response, 
    headers: RateLimitHeaders
  ): Response {
    const newHeaders = new Headers(originalResponse.headers);
    newHeaders.set('x-rate-limit-token', headers.token);
    newHeaders.set('x-rate-limit-remaining', headers.remaining.toString());
    newHeaders.set('x-rate-limit-reset', headers.reset);
    
    return new NextResponse(originalResponse.body, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: newHeaders
    });
  }

  public static createLimitExceededResponse(resetTime: string): Response {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        resetTime
      },
      { 
        status: 429,
        headers: {
          'x-rate-limit-reset': resetTime,
          'Retry-After': Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000).toString()
        }
      }
    );
  }
}

export function withRateLimit(handler: (request: Request) => Promise<Response>) {
  return async function rateLimit(request: Request) {
    try {
      // Validate rate limit token
      const tokenPayload = await RateLimiter.validateToken(
        request.headers.get('x-rate-limit-token')
      );

      // Check if limit exceeded
      if (tokenPayload.requestCount > MAX_REQUESTS_PER_WINDOW) {
        const resetTime = new Date(
          tokenPayload.windowStart + WINDOW_SIZE_IN_MINUTES * 60 * 1000
        ).toISOString();
        return RateLimiter.createLimitExceededResponse(resetTime);
      }

      // Execute the handler
      const response = await handler(request);

      // Generate new headers
      const headers = RateLimiter.generateHeaders(tokenPayload);

      // Return response with rate limit headers
      return RateLimiter.createResponse(response, headers);

    } catch (error) {
      console.error('Rate limit error:', error);
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
    }
  };
}
