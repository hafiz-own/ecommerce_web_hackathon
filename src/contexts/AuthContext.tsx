import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import ApiClient from "@/lib/api/client";

interface AdminUser {
  email: string;
  name: string;
  role: "admin";
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const AUTH_STORAGE_KEY = "trendzone_admin_auth";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const me = await ApiClient.get<{ user: { email: string; name?: string } }>(
          '/auth/me',
          true
        );

        const adminUser: AdminUser = {
          email: me.user.email,
          name: me.user.name || 'Admin',
          role: 'admin',
        };

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ user: adminUser, expiresAt: expiresAt.toISOString() })
        );
        setUser(adminUser);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    };

    restore().finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await ApiClient.post<{ tokens: { accessToken: string } }>(
        '/auth/login',
        { email, password },
        false
      );

      localStorage.setItem('auth_token', response.tokens.accessToken);

      const me = await ApiClient.get<{ user: { email: string; name?: string } }>(
        '/auth/me',
        true
      );

      const adminUser: AdminUser = {
        email: me.user.email,
        name: me.user.name || 'Admin',
        role: 'admin',
      };

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: adminUser, expiresAt: expiresAt.toISOString() })
      );

      setUser(adminUser);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Invalid email or password' };
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
