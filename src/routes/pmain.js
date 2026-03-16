import { Router } from 'express';
import {
	getPMainMessages,
	getPMainThreads,
	getTelegramWebhookInfo,
	receivePMainInbound,
	sendPMainMessage,
	setupTelegramWebhook,
	telegramWebhook,
} from '../controllers/pMainController.js';

const router = Router();

router.post('/telegram/webhook', telegramWebhook);

router.get('/threads', getPMainThreads);
router.get('/messages', getPMainMessages);
router.post('/send', sendPMainMessage);
router.post('/inbound/:channel', receivePMainInbound);
router.post('/telegram/setup-webhook', setupTelegramWebhook);
router.get('/telegram/webhook-info', getTelegramWebhookInfo);

export default router;
