import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
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

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/try-on/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Ensure uploads/try-on directory exists
async function ensureUploadDir() {
  const dir = path.join(process.cwd(), 'uploads', 'try-on');
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Helper to get file path for cached model try-on
function getModelTryOnPath(productId: string): string {
  return path.join(process.cwd(), 'uploads', 'try-on', `model-${productId}.jpg`);
}

// Helper to get file path for user try-on
function getUserTryOnPath(sessionId: string, productId: string): string {
  return path.join(process.cwd(), 'uploads', 'try-on', `user-${sessionId}-${productId}.jpg`);
}

// Helper to get public URL for a file
function getPublicUrl(filename: string): string {
  return `${process.env.FRONTEND_URL || 'http://localhost:8080'}/uploads/try-on/${filename}`;
}

// Helper to fetch product by ID
async function getProductById(id: string) {
  const query = 'SELECT * FROM products WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function ensureCouponSessionColumn(): Promise<void> {
  await db.query('ALTER TABLE coupons ADD COLUMN IF NOT EXISTS session_id VARCHAR(255)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_coupons_session_id ON coupons(session_id)');
}

function generateCouponCode(prefix: string, discountValue: number): string {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${discountValue}${suffix}`;
}

router.post('/coupons', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    await ensureCouponSessionColumn();

    const sessionId = getSessionId(req);
    const { reason, discount_percent } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const validDiscounts: Record<string, { discount: number; prefix: string; reasonText: string }> = {
      birthday: { discount: 15, prefix: 'BDAY', reasonText: 'Birthday celebration' },
      wedding: { discount: 20, prefix: 'WEDDING', reasonText: 'Wedding celebration' },
      student: { discount: 10, prefix: 'STUDENT', reasonText: 'Student discount' },
      first_purchase: { discount: 10, prefix: 'WELCOME', reasonText: 'First-time customer' },
      bulk_order: { discount: 12, prefix: 'BULK', reasonText: 'Bulk purchase' },
      valentines: { discount: 10, prefix: 'LOVE', reasonText: "Valentine's Day" },
      loyal_customer: { discount: 10, prefix: 'LOYAL', reasonText: 'Loyal customer' },
    };

    const normalizedReason = String(reason).toLowerCase();
    const selected = validDiscounts[normalizedReason] || {
      discount: Math.min(Math.max(Number(discount_percent) || 10, 5), 20),
      prefix: 'SPECIAL',
      reasonText: String(reason),
    };

    const couponId = uuidv4();
    const code = generateCouponCode(selected.prefix, selected.discount);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const query = `
      INSERT INTO coupons (id, code, discount_type, discount_value, valid_until, usage_limit, used_count, created_by_agent, reason, session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, code, discount_type, discount_value, valid_until, usage_limit, used_count, created_by_agent, reason
    `;

    const result = await db.query(query, [
      couponId,
      code,
      'percentage',
      selected.discount,
      validUntil.toISOString(),
      1,
      0,
      true,
      selected.reasonText,
      sessionId,
    ]);

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon: result.rows[0],
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Coupon code collision, please try again' });
    }

    console.error('AI coupon creation error:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

/**
 * POST /api/ai/try-on
 * Generate virtual try-on image
 * Body: multipart/form-data
 * - product_id (string)
 * - use_model (boolean, optional)
 * - user_photo (file, optional)
 */
router.post('/try-on', upload.single('user_photo'), async (req, res) => {
  try {
    const { product_id, use_model } = req.body;
    const userPhotoFile = req.file;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    // Load product and verify try-on is enabled
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.metadata?.try_on_enabled) {
      return res.status(400).json({ error: 'Virtual try-on is not enabled for this product' });
    }

    await ensureUploadDir();

    let resultUrl: string;
    let resultFilename: string;

    if (use_model === 'true') {
      // Check for cached model try-on
      const modelPath = getModelTryOnPath(product_id);
      resultFilename = `model-${product_id}.jpg`;

      try {
        await fs.access(modelPath);
        // Return cached result
        resultUrl = getPublicUrl(resultFilename);
        return res.json({ try_on_url: resultUrl, cached: true });
      } catch {
        // Generate new model try-on
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
Generate a realistic try-on image of a person wearing this clothing item.
Use the provided product image as reference for style, color, and fit.
Return only the generated image.
`;

        const imageUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/${product.image_url.startsWith('/') ? product.image_url.slice(1) : product.image_url}`;
        const productImageBuffer = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
        const productImageBase64 = productImageBuffer.toString('base64');

        const imageParts = [
          {
            inlineData: {
              data: productImageBase64,
              mimeType: 'image/jpeg',
            },
          },
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const base64Data = response.text();
        const imageBuffer = Buffer.from(base64Data, 'base64');

        await fs.writeFile(modelPath, imageBuffer);
        resultUrl = getPublicUrl(resultFilename);
      }
    } else {
      // User photo try-on
      if (!userPhotoFile) {
        return res.status(400).json({ error: 'user_photo is required when use_model is false' });
      }

      const sessionId = getSessionId(req);
      resultFilename = `user-${sessionId}-${product_id}.jpg`;
      const userPath = getUserTryOnPath(sessionId, product_id);

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are a virtual try-on generator.
Given:
- User photo (selfie)
- Product image (clothing)

Generate a realistic try-on image where the user is wearing the clothing item.
Maintain the user's facial features and body shape.
Use the product's color/style as shown.
Return only the generated image.
`;

      const imageUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/${product.image_url.startsWith('/') ? product.image_url.slice(1) : product.image_url}`;
      const productImageBuffer = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
      const productImageBase64 = productImageBuffer.toString('base64');

      const imageParts = [
        {
          inlineData: {
            data: userPhotoFile.buffer.toString('base64'),
            mimeType: userPhotoFile.mimetype,
          },
        },
        {
          inlineData: {
            data: productImageBase64,
            mimeType: 'image/jpeg',
          },
        },
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const base64Data = response.text();
      const tryOnImageBuffer = Buffer.from(base64Data, 'base64');

      await fs.writeFile(userPath, tryOnImageBuffer);
      resultUrl = getPublicUrl(resultFilename);
    }

    res.json({ try_on_url: resultUrl, cached: false });
  } catch (error) {
    console.error('[AI Try-On] Error:', error);
    res.status(500).json({ error: 'Failed to generate try-on image' });
  }
});

export default router;
