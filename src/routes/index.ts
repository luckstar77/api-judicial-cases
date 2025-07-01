import { Router } from 'express';
import userRoutes from './userRoutes';
import commentRoutes from './commentRoutes';
import likeRoutes from './likeRoutes';
import caseRoutes from './caseRoutes';

const router = Router();

router.use('/user', userRoutes);
router.use(commentRoutes);
router.use('/likes', likeRoutes);
router.use('/case', caseRoutes);

export default router;
