
import express from 'express';
import { getUsers, updateWalletBalance } from '../controllers/userController.js';

const router = express.Router();

router.get('/', getUsers);
router.put('/:id/wallet', updateWalletBalance);

export default router;
