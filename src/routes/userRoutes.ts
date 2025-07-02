import { Router } from 'express';
import userController, { register, verify } from '../controllers/userController';
import checkLoggedIn from '../middlewares/checkLoggedIn';

const router = Router();

router.post('/register', register);
router.post('/verify', verify);
router.get('/', checkLoggedIn, userController.getUser);
router.post('/', checkLoggedIn, userController.createUser);

export default router;
