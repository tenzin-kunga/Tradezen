import { Request, Response } from 'express';

export interface TrpcContext {
  req: Request;
  res: Response;
  userId?: number;
}

export function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): TrpcContext {
  return { req, res };
}
