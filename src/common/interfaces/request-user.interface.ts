import { Request } from 'express';

export interface RequestUser {
  uid: string;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}
