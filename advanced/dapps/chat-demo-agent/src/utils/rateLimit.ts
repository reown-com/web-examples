// utils/rateLimit.ts
import { NextResponse } from 'next/server';
import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const WINDOW_SIZE_IN_MINUTES = 60;
const MAX_REQUESTS_PER_WINDOW = 15;

interface TokenPayload {
  requestCount: number;
  windowStart: number;
}

export function withRateLimit(handler: (request: Request) => Promise<Response>) {
  return async function rateLimit(request: Request) {
    try {
      const token = request.headers.get('x-rate-limit-token');
      let tokenPayload: TokenPayload;
      
      if (!token) {
        tokenPayload = {
          requestCount: 1,
          windowStart: Date.now()
        };
      } else {
        try {
          tokenPayload = verify(token, JWT_SECRET) as TokenPayload;
          
          const windowExpired = Date.now() - tokenPayload.windowStart > WINDOW_SIZE_IN_MINUTES * 60 * 1000;
          
          if (windowExpired) {
            tokenPayload = {
              requestCount: 1,
              windowStart: Date.now()
            };
          } else {
            tokenPayload.requestCount++;
            
            if (tokenPayload.requestCount > MAX_REQUESTS_PER_WINDOW) {
              return NextResponse.json(
                {
                  error: 'Rate limit exceeded',
                  resetTime: new Date(tokenPayload.windowStart + WINDOW_SIZE_IN_MINUTES * 60 * 1000)
                },
                { 
                  status: 429,
                  headers: {
                    'x-rate-limit-reset': new Date(tokenPayload.windowStart + WINDOW_SIZE_IN_MINUTES * 60 * 1000).toISOString()
                  }
                }
              );
            }
          }
        } catch (error) {
          tokenPayload = {
            requestCount: 1,
            windowStart: Date.now()
          };
        }
      }
      
      const newToken = sign(tokenPayload, JWT_SECRET);
      
      // Call the original handler
      const response = await handler(request);
      
      // Create a new response with the rate limit headers
      const headers = new Headers(response.headers);
      headers.set('x-rate-limit-token', newToken);
      headers.set('x-rate-limit-remaining', (MAX_REQUESTS_PER_WINDOW - tokenPayload.requestCount).toString());
      headers.set('x-rate-limit-reset', new Date(tokenPayload.windowStart + WINDOW_SIZE_IN_MINUTES * 60 * 1000).toISOString());
      
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
      
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}