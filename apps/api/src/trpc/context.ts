import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

export interface TrpcContext {
  req: Request;
  res: Response;
  userId?: string;
}

export function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): TrpcContext {
  let userId: string | undefined;

  const authHeader = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  if (authHeader?.startsWith('Bearer ') && secret) {
    const token = authHeader.slice(7);
    try {
      const jwt = new JwtService({});
      const payload = jwt.verify<{ sub?: string }>(token, { secret });
      if (payload.sub) {
        userId = payload.sub;
        // Attach to req for backward compatibility with protectedProcedure check
        (req as { user?: { id?: string } }).user = { id: userId };
      }
    } catch {
      // Invalid signature, expired, or malformed token — leave userId
      // undefined so protectedProcedure rejects the request.
    }
  }

  return { req, res, userId };
}
