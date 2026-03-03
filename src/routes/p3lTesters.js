import express from 'express';
const router = express.Router();
import * as p3lTesterController from '../controllers/p3lTesterController.js';

router.get('/', p3lTesterController.getTesters);
router.post('/', p3lTesterController.createTester);
router.put('/:id', p3lTesterController.updateTester);
router.delete('/:id', p3lTesterController.deleteTester);
router.post('/activity', p3lTesterController.logActivity);
router.get('/:id/activity', p3lTesterController.getTesterActivities);
router.post('/invite', p3lTesterController.inviteTester);

export default router;
