import { createContext, useContext, useState, useEffect } from "react";
import { User, AuthContextType } from "../types";
import { apiRequest } from "../lib/queryClient";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const storedUser = localStorage.getItem("archivio_user");
    const storedToken = localStorage.getItem("archivio_token");
    
    if (storedUser && storedToken) {
      // Validate token by making a test API call
      fetch("/api/auth/validate", {
        headers: {
          "Authorization": `Bearer ${storedToken}`
        }
      }).then(res => {
        if (res.ok) {
          setUser(JSON.parse(storedUser));
        } else {
          // Token is invalid, clear localStorage
          localStorage.removeItem("archivio_user");
          localStorage.removeItem("archivio_token");
        }
      }).catch(() => {
        // Network error or token invalid, clear localStorage
        localStorage.removeItem("archivio_user");
        localStorage.removeItem("archivio_token");
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      const data = await response.json();
      setUser(data.user);
      localStorage.setItem("archivio_user", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("archivio_token", data.token);
      }
    } catch (error) {
      throw new Error("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      localStorage.removeItem("archivio_user");
      localStorage.removeItem("archivio_token");
    } catch (error) {
      // Handle logout error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
