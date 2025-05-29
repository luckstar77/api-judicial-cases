import { Router } from 'express';
import { handleToggleLike, handleGetLikeCount, handleGetLikeStatus } from '../controllers/likeController';
import checkLoggedIn from '../middleware/checkLoggedIn';

const router = Router();

router.post('/:filesetId', checkLoggedIn, handleToggleLike);
router.get('/:filesetId', handleGetLikeCount);
router.get('/:filesetId/status', checkLoggedIn, handleGetLikeStatus);

export default router;
