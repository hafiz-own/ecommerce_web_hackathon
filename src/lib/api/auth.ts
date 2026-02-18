import ApiClient from './client';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

/**
 * Register a new user
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await ApiClient.post<{ message: string; user: User; tokens: AuthTokens }>(
    '/auth/register',
    credentials
  );
  
  // Store token in localStorage
  localStorage.setItem('auth_token', response.tokens.accessToken);
  
  return {
    user: response.user,
    tokens: response.tokens
  };
}

/**
 * Login user
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await ApiClient.post<{ message: string; tokens: AuthTokens }>(
    '/auth/login',
    credentials
  );

  // Store token in localStorage
  localStorage.setItem('auth_token', response.tokens.accessToken);

  // Get user details
  const user = await getCurrentUser();
  
  return {
    user: user!,
    tokens: response.tokens
  };
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return null;
    }
    
    const response = await ApiClient.get<{ user: User }>('/auth/me', true);
    return response.user;
  } catch (error) {
    console.error('[Auth API] Error getting current user:', error);
    // Clear invalid token
    localStorage.removeItem('auth_token');
    return null;
  }
}

/**
 * Initiate Google OAuth login
 */
export function loginWithGoogle(): void {
  try {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/google`;
  } catch (error) {
    console.error('[Auth API] Error initiating Google OAuth:', error);
  }
}

/**
 * Handle Google OAuth callback
 * This function should be called on the OAuth callback page
 */
export async function handleGoogleCallback(): Promise<AuthResponse | null> {
  try {
    // Get the token from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Store the token
    localStorage.setItem('auth_token', token);
    
    // Get user info
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Failed to get user information');
    }

    return {
      user,
      tokens: {
        accessToken: token,
        refreshToken: token // Backend uses same token for now
      }
    };
  } catch (error) {
    console.error('[Auth API] Error handling Google callback:', error);
    return null;
  }
}

/**
 * Check if current page is OAuth callback
 */
export function isOAuthCallback(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('token') || urlParams.has('code') || window.location.pathname === '/auth/callback';
}

/**
 * Update user profile
 */
export async function updateProfile(updates: Partial<Pick<User, 'name' | 'avatar_url'>>): Promise<User | null> {
  try {
    const response = await ApiClient.put<{ message: string; user: User }>(
      '/auth/profile',
      updates,
      true
    );
    return response.user;
  } catch (error) {
    console.error('[Auth API] Error updating profile:', error);
    return null;
  }
}

/**
 * Change password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    await ApiClient.post<{ message: string }>(
      '/auth/change-password',
      { current_password: currentPassword, new_password: newPassword },
      true
    );
    return true;
  } catch (error) {
    console.error('[Auth API] Error changing password:', error);
    return false;
  }
}

/**
 * Logout user
 */
export function logout(): void {
  localStorage.removeItem('auth_token');
  // You could also call a logout endpoint if needed
  window.location.href = '/';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

/**
 * Get auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(): Promise<AuthResponse | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    return null;
  }
  
  // Store token
  localStorage.setItem('auth_token', token);
  
  // Get user details
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  // Clean up URL
  window.history.replaceState(null, '', window.location.pathname);
  
  return {
    user,
    tokens: { accessToken: token }
  };
}
