import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Sync token with local storage and fetch user profile
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
        const res = await fetch(`${backendUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        
        if (json.success) {
          setUser(json.data);
        } else {
          // Token expired or invalid
          localStorage.removeItem('token');
          setToken('');
          setUser(null);
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (json.success) {
      localStorage.setItem('token', json.data.token);
      setToken(json.data.token);
      setUser({
        ...json.data,
      });
      return { success: true };
    } else {
      return { success: false, message: json.message };
    }
  };

  const register = async (name, email, phone, password, mpin) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    const res = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, phone, password, mpin }),
    });

    const json = await res.json();
    if (json.success) {
      localStorage.setItem('token', json.data.token);
      setToken(json.data.token);
      setUser({
        ...json.data,
      });
      return { success: true };
    } else {
      return { success: false, message: json.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  // Helper for making authorized API requests
  const apiRequest = async (path, options = {}) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${backendUrl}${path}`, {
      ...options,
      headers,
    });

    return await response.json();
  };

  const updateProfile = async (profileData) => {
    const res = await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (res.success) {
      setUser(res.data);
    }
    return res;
  };

  const changePassword = async (oldPassword, newPassword) => {
    return await apiRequest('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  };

  const deleteAccount = async () => {
    const res = await apiRequest('/api/auth/delete-account', {
      method: 'DELETE',
    });
    if (res.success) {
      logout();
    }
    return res;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    apiRequest,
    updateProfile,
    changePassword,
    deleteAccount,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
