import express from 'express';
import {
  getClassrooms,
  getClassroomById,
  addClassroom,
  updateClassroom,
  deleteClassroom
} from '../controllers/classroomController.js';

const router = express.Router();
router.get('/', getClassrooms);
router.get('/:id', getClassroomById);
router.post('/', addClassroom);
router.put('/:id', updateClassroom);
router.delete('/:id', deleteClassroom);

export default router;
