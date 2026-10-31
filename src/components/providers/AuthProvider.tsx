'use client';

import React, { createContext, useContext } from 'react';
import { SafeUser, IRole } from '@/types';

interface AuthContextType {
  user: SafeUser | null;
  role: IRole | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
});

export function AuthProvider({
  user,
  role,
  children,
}: {
  user: SafeUser | null;
  role: IRole | null;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ user, role: role || user?.role || null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
