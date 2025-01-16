import { NextResponse } from 'next/server';
import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.RATE_LIMIT_JWT_SECRET;
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
    
    const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - tokenPayload.requestCount);
    
    console.log('[Rate Limit] Generating headers:', {
      requestCount: tokenPayload.requestCount,
      remaining,
      windowStart: new Date(tokenPayload.windowStart).toISOString(),
      resetTime: resetTime.toISOString()
    });
    
    return {
      token: sign(tokenPayload, JWT_SECRET, { expiresIn: `${WINDOW_SIZE_IN_MINUTES}m` }),
      remaining: remaining,
      reset: resetTime.toISOString()
    };
  }

  public static async validateToken(token: string | null): Promise<TokenPayload | null> {
    console.log('[Rate Limit] Validating token:', token ? 'Token present' : 'No token');
    
    if (!token) {
      console.log('[Rate Limit] No token provided');
      return null;
    }

    try {
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }
      
      const payload = verify(token, JWT_SECRET) as unknown as TokenPayload;
      console.log('[Rate Limit] Token decoded:', {
        currentCount: payload.requestCount,
        windowStart: new Date(payload.windowStart).toISOString()
      });
      
      const windowExpired = Date.now() - payload.windowStart > WINDOW_SIZE_IN_MINUTES * 60 * 1000;
      
      if (windowExpired) {
        console.log('[Rate Limit] Window expired');
        return null;
      }

      const updatedPayload = {
        ...payload,
        requestCount: payload.requestCount + 1
      };
      
      console.log('[Rate Limit] Updated payload:', {
        newCount: updatedPayload.requestCount,
        windowStart: new Date(updatedPayload.windowStart).toISOString()
      });
      
      return updatedPayload;
    } catch (error) {
      console.error('[Rate Limit] Token validation error:', error);
      return null;
    }
  }

  public static createNewWindow(): TokenPayload {
    const newWindow = {
      requestCount: 1,
      windowStart: Date.now()
    };
    
    console.log('[Rate Limit] Created new window:', {
      requestCount: newWindow.requestCount,
      windowStart: new Date(newWindow.windowStart).toISOString()
    });
    
    return newWindow;
  }

  public static createResponse(
    originalResponse: Response, 
    headers: RateLimitHeaders
  ): Response {
    const newHeaders = new Headers(originalResponse.headers);
    newHeaders.set('x-rate-limit-token', headers.token);
    newHeaders.set('x-rate-limit-remaining', headers.remaining.toString());
    newHeaders.set('x-rate-limit-reset', headers.reset);
    
    console.log('[Rate Limit] Response headers set:', {
      remaining: headers.remaining,
      reset: headers.reset
    });
    
    return new NextResponse(originalResponse.body, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: newHeaders
    });
  }

  public static createLimitExceededResponse(resetTime: string): Response {
    console.log('[Rate Limit] Limit exceeded response:', {
      resetTime,
      retryAfter: Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000)
    });
    
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
      console.log('\n[Rate Limit] New request received');
      
      const existingToken = request.headers.get('x-rate-limit-token');
      const tokenPayload = await RateLimiter.validateToken(existingToken);

      console.log('[Rate Limit] Validation result:', tokenPayload ? {
        existingCount: tokenPayload.requestCount,
        windowStart: new Date(tokenPayload.windowStart).toISOString()
      } : 'No valid token');

      const currentPayload = tokenPayload || RateLimiter.createNewWindow();

      console.log('[Rate Limit] Current payload:', {
        requestCount: currentPayload.requestCount,
        windowStart: new Date(currentPayload.windowStart).toISOString(),
        maxRequests: MAX_REQUESTS_PER_WINDOW
      });

      if (currentPayload.requestCount > MAX_REQUESTS_PER_WINDOW) {
        console.log('[Rate Limit] Request limit exceeded');
        const resetTime = new Date(
          currentPayload.windowStart + WINDOW_SIZE_IN_MINUTES * 60 * 1000
        ).toISOString();
        return RateLimiter.createLimitExceededResponse(resetTime);
      }

      const response = await handler(request);
      const headers = RateLimiter.generateHeaders(currentPayload);
      
      console.log('[Rate Limit] Request completed successfully');
      
      return RateLimiter.createResponse(response, headers);

    } catch (error) {
      console.error('[Rate Limit] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
    }
  };
}