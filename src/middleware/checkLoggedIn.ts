import { Request, Response, NextFunction } from 'express';

export default function checkLoggedIn(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
}
