import express from 'express';
import {
  createOrUpdateRevision,
  getRevisionByMonth,
  getAllRevisions,
} from '../controllers/revisionController.js';

const router = express.Router();

router.post('/revision', createOrUpdateRevision);

router.get('/revision/single', getRevisionByMonth);

router.get('/revisions', getAllRevisions);

export default router;
