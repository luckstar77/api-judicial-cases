import { Request } from 'express';

export default function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        const ip = forwarded.split(',')[0].trim();
        if (ip) return ip;
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.length > 0) {
        return realIp;
    }
    return req.ip || req.socket.remoteAddress || '';
}
