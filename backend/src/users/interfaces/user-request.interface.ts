import { Request as ExpressRequest } from 'express';

export interface UserRequest extends ExpressRequest {
  user: {
    userId: string;
    email: string;
  };
}
