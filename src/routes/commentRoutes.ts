import { Router } from 'express';
import commentController from '../controllers/commentController';
import checkLoggedIn from '../middlewares/checkLoggedIn';

const router = Router();

router.post('/comment', checkLoggedIn, commentController.addComment);
router.get('/comment/:filesetId', commentController.getCommentsByFileset);

export default router;