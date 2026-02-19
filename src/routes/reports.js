import { Router } from 'express';
import {
  getReports,
  getReportById,
  addReport,
  updateReport,
  deleteReport
} from '../controllers/reportController.js';

const router = Router();

router.get('/', getReports);
router.get('/:id', getReportById);
router.post('/', addReport);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

export default router;
