import { Router } from 'express';
import userController, { register } from '../controllers/userController';
import checkLoggedIn from '../middlewares/checkLoggedIn';

const router = Router();

router.post('/register', register);
router.get('/user', checkLoggedIn, userController.getUser);
router.post('/user', checkLoggedIn, userController.createUser);

export default router;
