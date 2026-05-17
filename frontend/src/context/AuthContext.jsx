import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await api.get('/login/status');
        if (response.data?.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        }
      } catch (e) {
        setUser(null);
        setIsAuthenticated(false);
        // We only warn in dev mode to reduce noise for guest users
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await api.post('/login/logout');
    } catch (e) {
      console.error('Logout error completely removing remote cookie', e);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Helper functions for role checking

  const isSuperAdmin = useCallback(() => {
    return user?.role === 'super_admin';
  }, [user]);

  const isSubAdmin = useCallback(() => {
    return user?.role === 'sub_admin';
  }, [user]);

  const isAnyAdmin = useCallback(() => {
    return user?.role === 'super_admin' || user?.role === 'sub_admin';
  }, [user]);

  const getUserDepartment = useCallback(() => {
    return user?.department || null;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      logout,
      loading,
      isSuperAdmin,
      isSubAdmin,
      isAnyAdmin,
      getUserDepartment
    }}>
      {children}
    </AuthContext.Provider>
  );
};
