import express from 'express';
import {
  createOrUpdateRevision,
  getRevisionByMonth,
  getAllRevisions,
} from '../controllers/revisionController.js';
import { createRevisionSchema } from '../validations/revisionValidation.js';
import { validateBody } from '../middleware/validateBody.js';

const router = express.Router();

router.post(
  '/revision',
  validateBody(createRevisionSchema),
  createOrUpdateRevision,
);

router.get('/revision/single', getRevisionByMonth);

router.get('/revisions', getAllRevisions);

export default router;
