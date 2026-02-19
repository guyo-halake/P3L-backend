import { Router } from 'express';
import {
  getUnits,
  getUnitById,
  addUnit,
  updateUnit,
  deleteUnit
} from '../controllers/unitController.js';

const router = Router();

router.get('/', getUnits);
router.get('/:id', getUnitById);
router.post('/', addUnit);
router.put('/:id', updateUnit);
router.delete('/:id', deleteUnit);

export default router;
