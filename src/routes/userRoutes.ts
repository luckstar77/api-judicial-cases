import { Router } from 'express';
import userController, { register, verify, login } from '../controllers/userController';
import checkLoggedIn from '../middlewares/checkLoggedIn';

const router = Router();

router.post('/register', register);
router.post('/verify', verify);
router.post('/login', login);
router.get('/', checkLoggedIn, userController.getUser);
router.put('/', checkLoggedIn, userController.updateUser);

export default router;
