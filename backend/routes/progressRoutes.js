import express from 'express';
import { getProgress, updateProgress, clearProgress } from '../controllers/progressController.js';

const router = express.Router();

router.get('/:userId', getProgress);
router.post('/:userId', updateProgress);
router.delete('/:userId', clearProgress);

export default router;
