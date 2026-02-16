import { Router } from 'express';
import {
  getFees,
  getFeeById,
  addFee,
  updateFee,
  deleteFee
} from '../controllers/feeController.js';

const router = Router();

router.get('/', getFees);
router.get('/:id', getFeeById);
router.post('/', addFee);
router.put('/:id', updateFee);
router.delete('/:id', deleteFee);

export default router;
