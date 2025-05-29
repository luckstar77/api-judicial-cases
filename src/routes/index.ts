import { Router } from 'express';
import userRoutes from './userRoutes';
import commentRoutes from './commentRoutes';

const router = Router();

router.use(userRoutes);
router.use(commentRoutes);

export default router;
