import { Router } from 'express';
import fs from 'fs';
import path from 'path';
const router = Router();

// Helper to read JSON file
function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'backend', file), 'utf8'));
}

router.get('/certificates', (req, res) => {
  res.json(readJson('mock_certificates.json'));
});

router.get('/api-keys', (req, res) => {
  res.json(readJson('mock_api_keys.json'));
});

router.get('/templates', (req, res) => {
  res.json(readJson('mock_templates.json'));
});

router.get('/payments', (req, res) => {
  res.json(readJson('mock_payments.json'));
});

export default router;
