import { Router } from 'express';
import {
  getLabs,
  getLabById,
  addLab,
  updateLab,
  deleteLab
} from '../controllers/labController.js';

const router = Router();

router.get('/', getLabs);
router.get('/:id', getLabById);
router.post('/', addLab);
router.put('/:id', updateLab);
router.delete('/:id', deleteLab);

export default router;
