
import express from 'express';
import { getUsers, updateWalletBalance, updatePermissions } from '../controllers/userController.js';

const router = express.Router();

router.get('/', getUsers);
router.put('/:id/wallet', updateWalletBalance);
router.put('/:id/permissions', updatePermissions);

export default router;
