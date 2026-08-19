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

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7); // Remove "Bearer " prefix
      // Parse JWT payload (JWT format: header.payload.signature)
      const parts = token.split('.');
      if (parts.length === 3) {
        // Decode payload (second part)
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        userId = payload.sub || payload.id;
        // Attach to req for backward compatibility with protectedProcedure check
        (req as any).user = { id: userId };
      }
    }
  } catch {
    // Invalid JWT format - will be caught by protectedProcedure
  }

  return { req, res, userId };
}
