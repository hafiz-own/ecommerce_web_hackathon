import express from 'express';
import { db } from '../utils/database';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

function getSessionId(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return `user_${(req as any).user?.userId}`;
  }

  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) {
    return sessionId;
  }

  return `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

router.post('/', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = getSessionId(req);
    const userId = (req as any).user?.userId || null;

    const { activity_type, product_id, metadata } = req.body || {};

    if (!activity_type || typeof activity_type !== 'string') {
      return res.status(400).json({ error: 'activity_type is required' });
    }

    const query = `
      INSERT INTO user_activity (session_id, user_id, activity_type, product_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [
      sessionId,
      userId,
      activity_type,
      product_id || null,
      JSON.stringify(metadata || {}),
    ]);

    res.status(201).json({ activity: result.rows[0] });
  } catch (error: any) {
    console.error('Activity tracking error:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

export default router;
