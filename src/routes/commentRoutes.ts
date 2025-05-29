import { Router } from 'express';
import commentController from '../controllers/commentController';
import checkLoggedIn from '../middleware/checkLoggedIn';

const router = Router();

router.post('/comment', checkLoggedIn, commentController.addComment);
router.get('/comment/:filesetId', checkLoggedIn, commentController.getCommentsByFileset);

export default router;