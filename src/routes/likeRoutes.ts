import { Router } from 'express';
import { handleToggleLike, handleGetLikeCount } from '../controllers/likeController';
import checkLoggedIn from '../middleware/checkLoggedIn';

const router = Router();

router.post('/:filesetId', checkLoggedIn, handleToggleLike);
router.get('/:filesetId', handleGetLikeCount);

export default router;
