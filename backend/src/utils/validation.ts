import Joi from 'joi';

// User validation schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Product validation schemas
export const productSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().min(10).required(),
  price: Joi.number().positive().required(),
  category: Joi.string().valid('Shoes', 'Clothes', 'Bags', 'Accessories').required(),
  sizes: Joi.array().items(Joi.string()).min(1).required(),
  colors: Joi.array().items(Joi.string()).optional(),
  stock: Joi.number().integer().min(0).default(0),
  tags: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional(),
  image_url: Joi.string().uri().required()
});

// Cart validation schemas
export const cartItemSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  size: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(99).required()
});

// Order validation schemas
export const orderSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    product_id: Joi.string().uuid().required(),
    size: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    price: Joi.number().positive().required()
  })).min(1).required(),
  shipping_address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip: Joi.string().required(),
    country: Joi.string().required()
  }).required(),
  coupon_code: Joi.string().optional()
});

// Coupon validation schemas
export const couponSchema = Joi.object({
  code: Joi.string().min(3).max(50).required(),
  discount_type: Joi.string().valid('percentage', 'fixed').required(),
  discount_value: Joi.number().positive().required(),
  min_purchase: Joi.number().min(0).optional(),
  max_discount: Joi.number().min(0).optional(),
  valid_from: Joi.date().optional(),
  valid_until: Joi.date().min('now').optional(),
  usage_limit: Joi.number().integer().min(1).optional(),
  reason: Joi.string().max(500).optional()
});

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.body = value;
    next();
  };
};
