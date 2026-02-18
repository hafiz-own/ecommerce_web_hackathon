import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AuthService } from '../services/authService';
import { validate, registerSchema, loginSchema } from '../utils/validation';

const router = express.Router();

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const tokens = await AuthService.loginWithGoogle(
      profile.id,
      profile.emails?.[0]?.value || '',
      profile.displayName,
      profile.photos?.[0]?.value
    );
    return done(null, tokens);
  } catch (error) {
    return done(error as Error, null);
  }
}));

// Serialize/deserialize user for passport
passport.serializeUser((tokens: any, done) => {
  done(null, tokens);
});

passport.deserializeUser((tokens: any, done) => {
  done(null, tokens);
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access   Public
 */
router.post('/register', validate(registerSchema), async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, name } = req.body;
    const tokens = await AuthService.register(email, password, name);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: { email, name },
      tokens
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Registration failed'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access   Public
 */
router.post('/login', validate(loginSchema), async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    const tokens = await AuthService.login(email, password);
    
    res.json({
      message: 'Login successful',
      tokens
    });
  } catch (error: any) {
    res.status(401).json({
      error: error.message || 'Login failed'
    });
  }
});

/**
 * @route   GET /api/auth/google
 * @desc    Google OAuth login
 * @access   Public
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access   Public
 */
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  (req: express.Request, res: express.Response) => {
    const tokens = (req as any).user;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Redirect to frontend with token
    res.redirect(`${frontendUrl}/auth/callback?token=${tokens.accessToken}`);
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access   Private
 */
router.get('/me', async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Token required'
      });
    }

    const decoded = AuthService.verifyToken(token);
    const user = await AuthService.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified
      }
    });
  } catch (error: any) {
    res.status(401).json({
      error: error.message || 'Invalid token'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access   Private
 */
router.put('/profile', async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Token required'
      });
    }

    const decoded = AuthService.verifyToken(token);
    const { name, avatar_url } = req.body;
    
    const updatedUser = await AuthService.updateUser(decoded.userId, {
      name,
      avatar_url
    });

    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar_url: updatedUser.avatar_url,
        email_verified: updatedUser.email_verified
      }
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Profile update failed'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access   Private
 */
router.post('/change-password', async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Token required'
      });
    }

    const decoded = AuthService.verifyToken(token);
    const { currentPassword, newPassword } = req.body;
    
    await AuthService.changePassword(decoded.userId, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Password change failed'
    });
  }
});

export default router;
