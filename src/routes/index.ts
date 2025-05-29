import { Router } from 'express';
import userRoutes from './userRoutes';
import commentRoutes from './commentRoutes';
import likeRoutes from './likeRoutes';

const router = Router();

router.use(userRoutes);
router.use(commentRoutes);
router.use('/likes', likeRoutes);

export default router;
