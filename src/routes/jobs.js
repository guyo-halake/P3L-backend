import { Router } from 'express';
import {
  getCareerProfile,
  upsertCareerProfile,
  fetchProviderJobs,
  getJobApplications,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getJobReminders,
  createJobReminder,
} from '../controllers/jobsController.js';

const router = Router();

router.get('/profile', getCareerProfile);
router.put('/profile', upsertCareerProfile);
router.get('/providers/search', fetchProviderJobs);

router.get('/applications', getJobApplications);
router.post('/applications', createJobApplication);
router.put('/applications/:id', updateJobApplication);
router.delete('/applications/:id', deleteJobApplication);

router.get('/reminders', getJobReminders);
router.post('/reminders', createJobReminder);

export default router;
