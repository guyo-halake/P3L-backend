import { Router } from 'express';
import {
  csvUpload,
  getFinanceAccounts,
  createFinanceAccount,
  updateFinanceAccount,
  getFinanceTransactions,
  createFinanceTransaction,
  scanFinanceTransactions,
  importFinanceTransactionsCsv,
  getFinanceReconciliation,
  getPayrollRule,
  upsertPayrollRule,
  getRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  getMpesaToken,
  initiateMpesaStkPush,
  handleMpesaWebhook,
  handleMpesaValidation,
} from '../controllers/financeController.js';

const router = Router();
const publicRouter = Router();

publicRouter.post('/providers/mpesa/webhook', handleMpesaWebhook);
publicRouter.post('/providers/mpesa/validate', handleMpesaValidation);

router.get('/accounts', getFinanceAccounts);
router.post('/accounts', createFinanceAccount);
router.put('/accounts/:id', updateFinanceAccount);

router.get('/transactions', getFinanceTransactions);
router.post('/transactions', createFinanceTransaction);
router.post('/transactions/scan', scanFinanceTransactions);
router.post('/transactions/import-csv', csvUpload.single('file'), importFinanceTransactionsCsv);

router.get('/reconciliation', getFinanceReconciliation);

router.get('/payroll-rule', getPayrollRule);
router.put('/payroll-rule', upsertPayrollRule);

router.get('/recurring-rules', getRecurringRules);
router.post('/recurring-rules', createRecurringRule);
router.put('/recurring-rules/:id', updateRecurringRule);
router.delete('/recurring-rules/:id', deleteRecurringRule);

router.get('/providers/mpesa/token', getMpesaToken);
router.post('/providers/mpesa/stkpush', initiateMpesaStkPush);

export { publicRouter as financePublicRouter };
export default router;
