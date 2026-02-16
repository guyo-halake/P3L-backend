import express from 'express';
import {
  getExams,
  getExamById,
  addExam,
  updateExam,
  deleteExam
} from '../controllers/examController.js';

const router = express.Router();
router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', addExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

export default router;
