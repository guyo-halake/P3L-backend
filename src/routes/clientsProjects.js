
import { Router } from 'express';
import {
    createClientsProject,
    getClientsProjects,
    deleteClientsProject,
    updateClientsProject,
    shareClientsProject
} from '../controllers/clientsProjectController.js';

const router = Router();

router.get('/', getClientsProjects);
router.post('/', createClientsProject);
router.put('/:id', updateClientsProject);
router.delete('/:id', deleteClientsProject);
router.post('/:id/share', shareClientsProject);

export default router;
