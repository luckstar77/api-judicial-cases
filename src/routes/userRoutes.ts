import { Router } from 'express';
import userController, { register } from '../controllers/userController';
import checkLoggedIn from '../middlewares/checkLoggedIn';

const router = Router();

router.post('/register', register);
router.get('/', checkLoggedIn, userController.getUser);
router.post('/', checkLoggedIn, userController.createUser);

export default router;
