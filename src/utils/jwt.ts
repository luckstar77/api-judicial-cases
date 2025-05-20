import jwt from 'jsonwebtoken';

interface UserPayload {
  uid: string;
  phone: string;
  ip: string;
  name?: string;
  email?: string;
}

export function signJwt(payload: UserPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '1y',
    });
}
