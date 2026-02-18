# TrendZone Backend Setup Guide

## Prerequisites

1. **Node.js 18+** and npm
2. **PostgreSQL 12+** 
3. **Python 3.8+** (for FAISS vector search)
4. **Google OAuth Credentials** (free - see guide below)

## Quick Setup

### 1. Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install Node.js dependencies
npm install

# Install Python dependencies for FAISS
npm run setup-vectors
```

### 2. Set Up PostgreSQL

```bash
# Create database
createdb trendzone

# Or using psql
psql -c "CREATE DATABASE trendzone;"
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env
```

Required environment variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` (generate a long random string)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (see below)

### 4. Database Migration

```bash
# Run database migration
npm run migrate
```

### 5. Seed Data

```bash
# Seed with sample products
npm run seed
```

### 6. Start Development Server

```bash
# Start development server
npm run dev

# Server will run on http://localhost:3001
```

## Google OAuth Setup (Free)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create new project** or select existing
3. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Search and enable "Google+ API" and "Google OAuth2 API"
4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Select "Web application"
   - Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
   - Add authorized JavaScript origin: `http://localhost:5173`
5. **Copy credentials**:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`

## FAISS Vector Search Setup

The backend uses FAISS for local vector search:

```bash
# Install Python dependencies
python3 src/scripts/setup_faiss.py install

# Create sample index
python3 src/scripts/setup_faiss.py create

# Test search functionality
python3 src/scripts/setup_faiss.py test
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Products
- `GET /api/products` - Get products with filters
- `GET /api/products/search` - Semantic search
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin)

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove cart item

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details

## Development Workflow

1. **Make changes to TypeScript files**
2. **Auto-recompile** with `npm run dev`
3. **Test endpoints** with Postman or curl
4. **Check logs** for errors

## Deployment Options

### Vercel (Serverless)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Railway (Full Server)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway link
railway up
```

## Environment Variables for Production

- `NODE_ENV=production`
- `DB_HOST` - Railway PostgreSQL host
- `DB_PASSWORD` - Railway PostgreSQL password
- `FRONTEND_URL` - Your deployed frontend URL
- `GOOGLE_CALLBACK_URL` - Production callback URL

## Testing

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test product search
curl "http://localhost:3001/api/products/search?q=sneakers"
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check PostgreSQL is running
   - Verify .env database credentials
   - Ensure database exists

2. **FAISS import error**
   - Install Python dependencies: `pip install faiss-cpu`
   - Ensure Python 3.8+ is installed

3. **Google OAuth error**
   - Verify redirect URI matches exactly
   - Check OAuth consent screen is configured
   - Ensure APIs are enabled

4. **TypeScript compilation errors**
   - Run `npm install` to install dependencies
   - Check TypeScript version compatibility

## File Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, validation middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   ├── scripts/        # Migration and seeding
│   └── app.ts         # Express app setup
├── uploads/            # File uploads
├── data/              # FAISS vector index
├── dist/              # Compiled JavaScript
└── package.json
```

## Next Steps

1. Install dependencies and set up environment
2. Test all API endpoints
3. Update frontend to use new backend
4. Deploy to production
5. Set up monitoring and logging
# ecommerce_web_hackathon
