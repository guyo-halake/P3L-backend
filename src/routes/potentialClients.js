import { Router } from 'express';
import {
    getPotentialClients, createPotentialClient, updatePotentialClient,
    deletePotentialClient, logPotentialClientActivity, getPotentialClientHistory
} from '../controllers/potentialClientController.js';

const router = Router();

router.get('/', getPotentialClients);
router.post('/', createPotentialClient);
router.put('/:id', updatePotentialClient);
router.delete('/:id', deletePotentialClient);
router.post('/:id/activity', logPotentialClientActivity);
router.get('/:id/history', getPotentialClientHistory);

export default router;
