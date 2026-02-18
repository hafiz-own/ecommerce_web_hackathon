import express from 'express';
import { db } from '../utils/database';
import { optionalAuth } from '../middleware/auth';
import { vectorService } from '../services/vectorService';

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

router.get('/', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = getSessionId(req);
    const limit = Math.min(parseInt(String(req.query.limit || '4'), 10) || 4, 20);

    const activityResult = await db.query(
      `
      SELECT activity_type, product_id, metadata
      FROM user_activity
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [sessionId]
    );

    const keywords: string[] = [];
    const productIds: string[] = [];

    for (const row of activityResult.rows) {
      if (row.product_id) productIds.push(String(row.product_id));

      const meta = row.metadata || {};
      if (typeof meta.query === 'string') keywords.push(meta.query);
      if (Array.isArray(meta.keywords)) keywords.push(...meta.keywords.map((k: any) => String(k)));
      if (typeof meta.category === 'string') keywords.push(meta.category);
      if (typeof meta.sortBy === 'string') keywords.push(meta.sortBy);
    }

    const deduped = Array.from(
      new Set(
        keywords
          .join(' ')
          .toLowerCase()
          .split(/\s+/)
          .map(w => w.trim())
          .filter(w => w.length > 2)
      )
    );

    const queryText = deduped.slice(0, 8).join(' ');

    let recommendedIds: string[] = [];
    if (queryText) {
      const vectorResults = await vectorService.searchProducts(queryText, Math.max(limit * 3, 12));
      const highQuality = vectorResults.filter(r => r.score > 0.1);
      recommendedIds = highQuality.map(r => r.id);
    }

    const excludeSet = new Set(productIds);
    recommendedIds = recommendedIds.filter(id => !excludeSet.has(id));

    let products: any[] = [];
    if (recommendedIds.length > 0) {
      const finalIds = recommendedIds.slice(0, limit);
      const placeholders = finalIds.map((_, i) => `$${i + 1}`).join(',');
      const prodResult = await db.query(`SELECT * FROM products WHERE id IN (${placeholders})`, finalIds);
      products = prodResult.rows.map(p => ({ ...p, price: parseFloat(p.price) }));

      const scoreMap = new Map(recommendedIds.map((id, index) => [id, index] as const));
      products.sort((a, b) => (scoreMap.get(a.id) ?? 0) - (scoreMap.get(b.id) ?? 0));
    }

    if (products.length < limit) {
      const remaining = limit - products.length;
      const fallbackResult = await db.query(
        `
        SELECT * FROM products
        ORDER BY created_at DESC
        LIMIT $1
        `,
        [remaining]
      );

      const existing = new Set(products.map(p => p.id));
      for (const p of fallbackResult.rows) {
        if (existing.has(p.id)) continue;
        products.push({ ...p, price: parseFloat(p.price) });
        if (products.length >= limit) break;
      }
    }

    res.json({ products, sessionId, query: queryText });
  } catch (error: any) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

export default router;
