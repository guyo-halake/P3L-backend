import express from 'express';
import {
  getClassTimes,
  getClassTimeById,
  addClassTime,
  updateClassTime,
  deleteClassTime
} from '../controllers/classTimeController.js';

const router = express.Router();
router.get('/', getClassTimes);
router.get('/:id', getClassTimeById);
router.post('/', addClassTime);
router.put('/:id', updateClassTime);
router.delete('/:id', deleteClassTime);

export default router;
