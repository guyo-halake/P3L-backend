import { Router } from 'express';
import {
  getAssignments,
  getAssignmentById,
  addAssignment,
  updateAssignment,
  deleteAssignment
} from '../controllers/assignmentController.js';

const router = Router();

router.get('/', getAssignments);
router.get('/:id', getAssignmentById);
router.post('/', addAssignment);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

export default router;
