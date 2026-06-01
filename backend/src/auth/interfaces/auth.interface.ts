import { Request as ExpressRequest } from 'express';

export interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    email: string;
  };
}
