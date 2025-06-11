import { Router } from 'express';
import userController from '../controllers/userController';
import checkLoggedIn from '../middlewares/checkLoggedIn';

const router = Router();

router.get('/user', checkLoggedIn, userController.getUser);
router.post('/user', checkLoggedIn, userController.createUser);

export default router;
