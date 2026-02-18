import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  email_verified: boolean;
  google_id?: string;
  created_at: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  
  /**
   * Register a new user with email and password
   */
  static async register(email: string, password: string, name?: string): Promise<AuthTokens> {
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (id, email, password_hash, name, email_verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, email_verified, created_at
    `;
    
    const result = await db.query(query, [userId, email, hashedPassword, name, false]);
    const user = result.rows[0];
    
    return this.generateTokens(user);
  }
  
  /**
   * Login user with email and password
   */
  static async login(email: string, password: string): Promise<AuthTokens> {
    const query = `
      SELECT id, email, password_hash, name, avatar_url, email_verified, created_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await db.query(query, [email]);
    
    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }
    
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }
    
    return this.generateTokens(user);
  }
  
  /**
   * Login or register with Google OAuth
   */
  static async loginWithGoogle(googleId: string, email: string, name?: string, avatarUrl?: string): Promise<AuthTokens> {
    // Check if user exists
    const checkQuery = `
      SELECT id, email, name, avatar_url, email_verified, created_at
      FROM users 
      WHERE google_id = $1 OR email = $2
    `;
    
    const result = await db.query(checkQuery, [googleId, email]);
    
    if (result.rows.length === 0) {
      // Create new user
      const userId = uuidv4();
      const insertQuery = `
        INSERT INTO users (id, email, google_id, name, avatar_url, email_verified)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id, email, name, avatar_url, email_verified, created_at
      `;
      
      const insertResult = await db.query(insertQuery, [userId, email, googleId, name, avatarUrl]);
      const user = insertResult.rows[0];
      return this.generateTokens(user);
    } else {
      // Update existing user with Google info if needed
      const user = result.rows[0];
      if (!user.google_id) {
        const updateQuery = `
          UPDATE users 
          SET google_id = $1, avatar_url = COALESCE($2, avatar_url), email_verified = true
          WHERE id = $3
          RETURNING id, email, name, avatar_url, email_verified, created_at
        `;
        
        const updateResult = await db.query(updateQuery, [googleId, avatarUrl, user.id]);
        return this.generateTokens(updateResult.rows[0]);
      }
      
      return this.generateTokens(user);
    }
  }
  
  /**
   * Generate JWT tokens for user
   */
  private static generateTokens(user: any): AuthTokens {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name
    };
    
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'trendzone-backend',
      audience: 'trendzone-frontend'
    });
    
    return {
      accessToken,
      // Refresh token implementation can be added later
    };
  }
  
  /**
   * Verify JWT token
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'trendzone-backend',
        audience: 'trendzone-frontend'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, avatar_url, email_verified, google_id, created_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  
  /**
   * Update user profile
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return this.getUserById(userId);
    }
    
    values.push(userId);
    
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, avatar_url, email_verified, created_at
    `;
    
    const result = await db.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  
  /**
   * Change password
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get current password hash
    const query = `
      SELECT password_hash FROM users WHERE id = $1
    `;
    
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }
    
    // Update password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    const updateQuery = `
      UPDATE users SET password_hash = $1 WHERE id = $2
    `;
    
    await db.query(updateQuery, [hashedNewPassword, userId]);
  }
}
